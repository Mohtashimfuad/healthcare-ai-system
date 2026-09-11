// src/app/api/reports/route.ts
// Medical Reports: List reports and upload/index new patient laboratory & diagnostic reports.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAuth, isDoctorTreatingPatient } from '@/lib/auth-server';
import { summarizeMedicalReportWithGroq } from '@/lib/ai/groq';
import { generateEmbedding } from '@/lib/ai/embeddings';
import type { MedicalReportInsert } from '@/types';

/**
 * GET /api/reports
 * List medical reports for the current patient, or for a patient being treated by the calling doctor.
 * Query parameter:
 * - patient_id (required if doctor is querying a patient)
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const patientIdParam = searchParams.get('patient_id');

    let targetPatientId = auth.userId;

    if (auth.role === 'doctor') {
      if (!patientIdParam) {
        return NextResponse.json(
          { error: 'Doctors must specify a patient_id query parameter.' },
          { status: 400 }
        );
      }

      // Verify doctor has treating relationship with patient
      const isAllowed = await isDoctorTreatingPatient(auth.userId, patientIdParam);
      if (!isAllowed) {
        return NextResponse.json(
          { error: 'Forbidden: You are not an authorized treating doctor for this patient.' },
          { status: 403 }
        );
      }
      targetPatientId = patientIdParam;
    }

    const { data: reports, error } = await supabase
      .from('medical_reports')
      .select('id, patient_id, file_url, title, report_type, ai_summary, ocr_text, created_at')
      .eq('patient_id', targetPatientId)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ reports: reports || [] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch medical reports';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/reports
 * Upload/index a medical report.
 * Body: {
 *   file_url: string;
 *   patient_id?: string; // required if doctor uploads for patient
 *   title?: string;
 *   report_type?: string; // 'lab_test', 'radiology', 'prescription', 'discharge_summary', 'general'
 *   ocr_text?: string;
 *   auto_summarize?: boolean;
 * }
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const {
      file_url,
      patient_id,
      title,
      report_type = 'general',
      ocr_text,
      auto_summarize = true,
    } = body;

    if (!file_url) {
      return NextResponse.json({ error: 'file_url is required.' }, { status: 400 });
    }

    let targetPatientId = auth.userId;
    if (auth.role === 'doctor') {
      if (!patient_id) {
        return NextResponse.json(
          { error: 'Doctor uploading report must specify patient_id.' },
          { status: 400 }
        );
      }
      targetPatientId = patient_id;
    }

    const supabase = await createClient();

    // Fetch patient allergies to pass to Groq analysis
    const { data: patientData } = await supabase
      .from('patient_profiles')
      .select('allergies')
      .eq('profile_id', targetPatientId)
      .maybeSingle();

    const allergies = patientData?.allergies || [];

    let aiSummaryText: string | null = null;
    let reportEmbedding: number[] | null = null;

    // Run Groq AI summary & vector embedding if OCR text is provided
    if (ocr_text && auto_summarize) {
      try {
        const groqResult = await summarizeMedicalReportWithGroq(ocr_text, allergies);
        aiSummaryText = groqResult.summary;

        if (groqResult.abnormalFlags && groqResult.abnormalFlags.length > 0) {
          aiSummaryText += `\nAbnormal Findings: ${groqResult.abnormalFlags.join('; ')}`;
        }

        // Generate vector embedding for semantic RAG search
        const textForEmbedding = `${title || 'Medical Report'}: ${ocr_text} Summary: ${aiSummaryText}`;
        reportEmbedding = await generateEmbedding(textForEmbedding);
      } catch (aiErr) {
        console.warn('AI summarization / embedding generation warning:', aiErr);
      }
    }

    const insertPayload: MedicalReportInsert = {
      patient_id: targetPatientId,
      file_url,
      title: title || 'Diagnostic Report',
      report_type,
      ocr_text: ocr_text || null,
      ai_summary: aiSummaryText,
      embedding: reportEmbedding,
    };

    const { data: newReport, error: insertError } = await supabase
      .from('medical_reports')
      .insert(insertPayload)
      .select('id, patient_id, file_url, title, report_type, ai_summary, ocr_text, created_at')
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json(
      {
        message: 'Medical report successfully recorded and indexed.',
        report: newReport,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to process report';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
