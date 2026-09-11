// src/app/api/prescriptions/route.ts
// Prescriptions management: List prescriptions and create new prescriptions.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/auth-server';
import { generateRemindersForPrescription } from '@/lib/reminders';
import type { Medicine, PrescriptionInsert, PrescriptionStatus } from '@/types';

/**
 * GET /api/prescriptions
 * List prescriptions based on role:
 * - Patients see their own prescriptions.
 * - Doctors see prescriptions they created or for a specific patient.
 * Query parameters:
 * - patient_id (for doctors querying a patient)
 * - status: 'pending' | 'approved' | 'dispensed' | 'cancelled'
 * - appointment_id
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const patientIdParam = searchParams.get('patient_id');
    const statusParam = searchParams.get('status') as PrescriptionStatus | null;
    const appointmentIdParam = searchParams.get('appointment_id');

    let query = supabase
      .from('prescriptions')
      .select(`
        id,
        appointment_id,
        doctor_id,
        patient_id,
        medicines,
        ai_suggestion,
        doctor_approved,
        status,
        created_at,
        doctor:profiles!prescriptions_doctor_id_fkey(
          id,
          full_name,
          phone,
          doctor_profile:doctor_profiles(specialty, hospital)
        ),
        patient:profiles!prescriptions_patient_id_fkey(
          id,
          full_name,
          phone
        )
      `)
      .order('created_at', { ascending: false });

    if (auth.role === 'patient') {
      // Patient strictly sees their own prescriptions
      query = query.eq('patient_id', auth.userId);
    } else if (auth.role === 'doctor') {
      if (patientIdParam) {
        query = query.eq('patient_id', patientIdParam);
      } else {
        query = query.eq('doctor_id', auth.userId);
      }
    }

    if (statusParam) {
      query = query.eq('status', statusParam);
    }

    if (appointmentIdParam) {
      query = query.eq('appointment_id', appointmentIdParam);
    }

    const { data: prescriptions, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ prescriptions: prescriptions || [] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch prescriptions';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/prescriptions
 * Create a new prescription.
 * Typically called by a Doctor.
 * Body: {
 *   patient_id: string;
 *   appointment_id?: string;
 *   medicines: Medicine[];
 *   ai_suggestion?: Record<string, unknown>;
 *   doctor_approved?: boolean;
 *   status?: PrescriptionStatus;
 *   auto_generate_reminders?: boolean;
 * }
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const {
      patient_id,
      appointment_id,
      medicines,
      ai_suggestion,
      doctor_approved,
      status,
      auto_generate_reminders = true,
    } = body;

    if (!patient_id) {
      return NextResponse.json(
        { error: 'patient_id is required to create a prescription.' },
        { status: 400 }
      );
    }

    if (!Array.isArray(medicines) || medicines.length === 0) {
      return NextResponse.json(
        { error: 'medicines must be a non-empty array of medication items.' },
        { status: 400 }
      );
    }

    // Validate medicine format
    for (const med of medicines as Medicine[]) {
      if (!med.name || !med.dosage || !med.frequency) {
        return NextResponse.json(
          { error: 'Each medicine item must contain name, dosage, and frequency.' },
          { status: 400 }
        );
      }
    }

    const supabase = await createClient();

    // Verify patient exists
    const { data: patientProfile, error: patientError } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('id', patient_id)
      .eq('role', 'patient')
      .single();

    if (patientError || !patientProfile) {
      return NextResponse.json({ error: 'Patient not found.' }, { status: 404 });
    }

    // If caller is doctor, they are the prescribing doctor
    let doctorId = auth.userId;
    let isApproved = Boolean(doctor_approved);

    if (auth.role === 'patient') {
      // Patients cannot self-approve prescriptions; AI draft will have doctor_approved = false
      isApproved = false;
      if (body.doctor_id) {
        doctorId = body.doctor_id;
      } else {
        return NextResponse.json(
          { error: 'Prescriptions require a designated doctor_id.' },
          { status: 400 }
        );
      }
    }

    const prescriptionPayload: PrescriptionInsert = {
      doctor_id: doctorId,
      patient_id,
      appointment_id: appointment_id || null,
      medicines,
      ai_suggestion: ai_suggestion || null,
      doctor_approved: isApproved,
      status: (status as PrescriptionStatus) || (isApproved ? 'approved' : 'pending'),
    };

    const { data: newPrescription, error: insertError } = await supabase
      .from('prescriptions')
      .insert(prescriptionPayload)
      .select('*')
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // If doctor created and approved, automatically schedule the medication reminders
    let remindersCreated = 0;
    if (isApproved && auto_generate_reminders) {
      try {
        const reminderResult = await generateRemindersForPrescription(
          newPrescription.id,
          patient_id,
          medicines
        );
        remindersCreated = reminderResult.count;
      } catch (reminderErr) {
        console.warn('Reminder generation notice:', reminderErr);
      }
    }

    return NextResponse.json(
      {
        message: 'Prescription created successfully.',
        prescription: newPrescription,
        reminders_scheduled: remindersCreated,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create prescription';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
