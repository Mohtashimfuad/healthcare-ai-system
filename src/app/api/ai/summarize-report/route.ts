// src/app/api/ai/summarize-report/route.ts
// AI Report Summarizer: Extracts key biomarkers and clinical summaries from laboratory text.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/auth-server';
import { summarizeMedicalReportWithGroq } from '@/lib/ai/groq';
import { generateEmbedding } from '@/lib/ai/embeddings';

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const { ocr_text, report_id, patient_id } = body;

    if (!ocr_text || typeof ocr_text !== 'string') {
      return NextResponse.json(
        { error: 'ocr_text is required and must be a string.' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Fetch patient allergies if known
    let allergies: string[] = [];
    const targetPatientId = patient_id || auth.userId;

    const { data: patientProfile } = await supabase
      .from('patient_profiles')
      .select('allergies')
      .eq('profile_id', targetPatientId)
      .maybeSingle();

    if (patientProfile?.allergies) {
      allergies = patientProfile.allergies;
    }

    const aiResult = await summarizeMedicalReportWithGroq(ocr_text, allergies);

    // If report_id was provided, update the report record with the generated summary and embedding
    if (report_id) {
      const summaryText = `${aiResult.summary}\nFlags: ${aiResult.abnormalFlags.join(', ')}`;
      const embedding = await generateEmbedding(`${ocr_text} ${summaryText}`);

      await supabase
        .from('medical_reports')
        .update({
          ai_summary: summaryText,
          embedding,
        })
        .eq('id', report_id);
    }

    return NextResponse.json({
      success: true,
      summary: aiResult.summary,
      abnormal_flags: aiResult.abnormalFlags,
      biomarkers: aiResult.keyBiomarkers,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to summarize report';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
