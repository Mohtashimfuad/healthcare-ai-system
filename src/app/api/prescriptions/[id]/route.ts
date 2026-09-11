// src/app/api/prescriptions/[id]/route.ts
// Single prescription management: View details and approve/update prescription.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/auth-server';
import { generateRemindersForPrescription } from '@/lib/reminders';
import type { Medicine, PrescriptionStatus, PrescriptionUpdate } from '@/types';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/prescriptions/[id]
 * Fetch prescription detail, medicines, AI suggestions, and generated reminders.
 */
export async function GET(request: NextRequest, context: RouteContext) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const { id } = await context.params;

  try {
    const supabase = await createClient();

    const { data: prescription, error } = await supabase
      .from('prescriptions')
      .select(`
        *,
        doctor:profiles!prescriptions_doctor_id_fkey(
          id,
          full_name,
          phone,
          doctor_profile:doctor_profiles(specialty, hospital)
        ),
        patient:profiles!prescriptions_patient_id_fkey(
          id,
          full_name,
          phone,
          patient_profile:patient_profiles(date_of_birth, blood_group, allergies, conditions)
        ),
        appointment:appointments(
          id,
          type,
          scheduled_at,
          status,
          symptoms_notes
        ),
        reminders(
          id,
          medicine_name,
          dosage,
          dose_time,
          taken,
          taken_at,
          status
        )
      `)
      .eq('id', id)
      .single();

    if (error || !prescription) {
      return NextResponse.json({ error: 'Prescription not found.' }, { status: 404 });
    }

    // Role check: Patient or Doctor in this prescription
    if (auth.userId !== prescription.patient_id && auth.userId !== prescription.doctor_id) {
      return NextResponse.json(
        { error: 'Forbidden: You do not have access to this prescription.' },
        { status: 403 }
      );
    }

    return NextResponse.json({ prescription });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to retrieve prescription';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * PATCH /api/prescriptions/[id]
 * Doctor approves, edits medicines, or changes status.
 * Body: {
 *   medicines?: Medicine[];
 *   doctor_approved?: boolean;
 *   status?: PrescriptionStatus;
 *   generate_reminders?: boolean;
 * }
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const { id } = await context.params;

  try {
    const supabase = await createClient();

    const { data: existing, error: fetchError } = await supabase
      .from('prescriptions')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Prescription not found.' }, { status: 404 });
    }

    // Only the prescribing doctor can update or approve a prescription
    if (auth.userId !== existing.doctor_id && auth.role !== 'doctor') {
      return NextResponse.json(
        { error: 'Forbidden: Only the attending doctor can approve or modify prescriptions.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const updateData: PrescriptionUpdate = {};

    if (body.medicines) {
      if (!Array.isArray(body.medicines) || body.medicines.length === 0) {
        return NextResponse.json({ error: 'Invalid medicines format.' }, { status: 400 });
      }
      updateData.medicines = body.medicines;
    }

    let newlyApproved = false;
    if (body.doctor_approved !== undefined) {
      const approved = Boolean(body.doctor_approved);
      updateData.doctor_approved = approved;
      if (approved && !existing.doctor_approved) {
        newlyApproved = true;
        updateData.status = 'approved';
      }
    }

    if (body.status) {
      updateData.status = body.status as PrescriptionStatus;
    }

    if (body.ai_suggestion) {
      updateData.ai_suggestion = body.ai_suggestion;
    }

    const { data: updated, error: updateError } = await supabase
      .from('prescriptions')
      .update(updateData)
      .eq('id', id)
      .select('*')
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Auto-schedule reminders if prescription was just approved
    let remindersCreated = 0;
    if (newlyApproved && (body.generate_reminders !== false)) {
      try {
        const medsToUse = (updateData.medicines || existing.medicines) as Medicine[];
        const reminderResult = await generateRemindersForPrescription(
          id,
          existing.patient_id,
          medsToUse
        );
        remindersCreated = reminderResult.count;
      } catch (remErr) {
        console.warn('Could not auto-generate reminders on approval:', remErr);
      }
    }

    return NextResponse.json({
      message: 'Prescription updated successfully.',
      prescription: updated,
      reminders_scheduled: remindersCreated,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update prescription';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
