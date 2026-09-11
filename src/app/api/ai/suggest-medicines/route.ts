// src/app/api/ai/suggest-medicines/route.ts
// AI Medicine Suggestion System using Groq LLM and Vector RAG clinical context.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/auth-server';
import { generateMedicineSuggestion } from '@/lib/ai/groq';
import { buildClinicalRagContext } from '@/lib/ai/rag';
import type { PrescriptionInsert } from '@/types';

/**
 * POST /api/ai/suggest-medicines
 * Body: {
 *   symptoms: string;
 *   patient_id?: string; // defaults to caller if patient
 *   appointment_id?: string;
 *   save_draft?: boolean; // if true, creates pending prescription draft
 *   doctor_id?: string;   // required if save_draft = true
 * }
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const { symptoms, patient_id, appointment_id, save_draft, doctor_id } = body;

    if (!symptoms || typeof symptoms !== 'string' || symptoms.trim().length === 0) {
      return NextResponse.json(
        { error: 'symptoms is required and must be a descriptive string.' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Determine target patient
    let targetPatientId = auth.userId;
    if (auth.role === 'doctor') {
      if (patient_id) {
        targetPatientId = patient_id;
      }
    } else if (patient_id && patient_id !== auth.userId) {
      return NextResponse.json(
        { error: 'Forbidden: Patients can only request suggestions for their own profile.' },
        { status: 403 }
      );
    }

    // 1. Fetch Patient Clinical Profile (Allergies, Chronic Conditions, Age, Blood Group)
    const { data: patientProfile } = await supabase
      .from('patient_profiles')
      .select('date_of_birth, blood_group, allergies, conditions')
      .eq('profile_id', targetPatientId)
      .maybeSingle();

    const { data: userProfile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', targetPatientId)
      .maybeSingle();

    let calculatedAge: number | undefined;
    if (patientProfile?.date_of_birth) {
      const birthYear = new Date(patientProfile.date_of_birth).getFullYear();
      calculatedAge = new Date().getFullYear() - birthYear;
    }

    // 2. Perform Vector RAG retrieval (Clinical guidelines + previous lab reports)
    const ragData = await buildClinicalRagContext(symptoms, targetPatientId);

    // 3. Call Groq AI with clinical context and strict allergy checks
    const aiSuggestion = await generateMedicineSuggestion({
      symptoms,
      patient: {
        fullName: userProfile?.full_name,
        age: calculatedAge,
        bloodGroup: patientProfile?.blood_group,
        allergies: patientProfile?.allergies || [],
        conditions: patientProfile?.conditions || [],
      },
      ragGuidelines: ragData.guidelines,
      pastReportSummaries: ragData.pastReports,
    });

    // Attach RAG evidence sources to suggestion payload
    aiSuggestion.rag_sources = ragData.sources;

    let draftPrescription = null;

    // 4. Optionally save as an unapproved prescription draft for physician review
    if (save_draft && doctor_id) {
      const medicines = (aiSuggestion.suggested_medicines || []).map((med) => ({
        name: med.name,
        dosage: med.dosage,
        frequency: med.frequency,
        duration_days: med.duration_days,
        instructions: med.instructions || med.purpose,
      }));

      const draftPayload: PrescriptionInsert = {
        doctor_id,
        patient_id: targetPatientId,
        appointment_id: appointment_id || null,
        medicines,
        ai_suggestion: aiSuggestion,
        doctor_approved: false,
        status: 'pending',
      };

      const { data: createdDraft } = await supabase
        .from('prescriptions')
        .insert(draftPayload)
        .select('*')
        .single();

      draftPrescription = createdDraft;
    }

    return NextResponse.json({
      success: true,
      suggestion: aiSuggestion,
      rag_evidence_count: ragData.sources.length,
      draft_prescription: draftPrescription,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to generate medicine suggestion';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
