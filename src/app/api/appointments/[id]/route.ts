// src/app/api/appointments/[id]/route.ts
// Single appointment management: View, update status, and cancel.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/auth-server';
import type { AppointmentStatus, AppointmentType, AppointmentUpdate } from '@/types';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/appointments/[id]
 * Fetch appointment detail. Only accessible by the patient or doctor in this appointment.
 */
export async function GET(request: NextRequest, context: RouteContext) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const { id } = await context.params;

  try {
    const supabase = await createClient();

    const { data: appointment, error } = await supabase
      .from('appointments')
      .select(`
        *,
        patient:profiles!appointments_patient_id_fkey(
          id,
          full_name,
          phone,
          patient_profile:patient_profiles(date_of_birth, blood_group, allergies, conditions)
        ),
        doctor:profiles!appointments_doctor_id_fkey(
          id,
          full_name,
          phone,
          doctor_profile:doctor_profiles(specialty, hospital, rating)
        ),
        prescriptions(
          id,
          medicines,
          doctor_approved,
          status,
          created_at
        )
      `)
      .eq('id', id)
      .single();

    if (error || !appointment) {
      return NextResponse.json({ error: 'Appointment not found.' }, { status: 404 });
    }

    // Security check: Must be participant
    if (auth.userId !== appointment.patient_id && auth.userId !== appointment.doctor_id) {
      return NextResponse.json(
        { error: 'Forbidden: You are not a participant in this appointment.' },
        { status: 403 }
      );
    }

    return NextResponse.json({ appointment });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to retrieve appointment';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * PATCH /api/appointments/[id]
 * Update status or details.
 * Body: {
 *   status?: 'pending' | 'confirmed' | 'completed' | 'cancelled';
 *   scheduled_at?: string;
 *   symptoms_notes?: string;
 *   type?: 'online' | 'physical';
 * }
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const { id } = await context.params;

  try {
    const supabase = await createClient();

    // Fetch existing appointment to verify ownership
    const { data: existing, error: fetchError } = await supabase
      .from('appointments')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Appointment not found.' }, { status: 404 });
    }

    const isPatient = auth.userId === existing.patient_id;
    const isDoctor = auth.userId === existing.doctor_id;

    if (!isPatient && !isDoctor) {
      return NextResponse.json(
        { error: 'Forbidden: You do not have permission to modify this appointment.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const updateData: AppointmentUpdate = {};

    // Status permission rules
    if (body.status) {
      const newStatus = body.status as AppointmentStatus;

      if (newStatus === 'confirmed' || newStatus === 'completed') {
        if (!isDoctor) {
          return NextResponse.json(
            { error: `Forbidden: Only the attending doctor can mark an appointment as '${newStatus}'.` },
            { status: 403 }
          );
        }
      }

      // Both doctor and patient can cancel
      if (['pending', 'confirmed', 'completed', 'cancelled'].includes(newStatus)) {
        updateData.status = newStatus;
      } else {
        return NextResponse.json({ error: 'Invalid appointment status.' }, { status: 400 });
      }
    }

    if (body.scheduled_at) {
      const parsedDate = new Date(body.scheduled_at);
      if (isNaN(parsedDate.getTime())) {
        return NextResponse.json({ error: 'Invalid scheduled_at date.' }, { status: 400 });
      }
      updateData.scheduled_at = parsedDate.toISOString();
    }

    if (body.type) {
      if (body.type === 'online' || body.type === 'physical') {
        updateData.type = body.type as AppointmentType;
      }
    }

    if (body.symptoms_notes !== undefined) {
      updateData.symptoms_notes = body.symptoms_notes;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid update fields provided.' }, { status: 400 });
    }

    const { data: updated, error: updateError } = await supabase
      .from('appointments')
      .update(updateData)
      .eq('id', id)
      .select('*')
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Appointment successfully updated.',
      appointment: updated,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update appointment';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * DELETE /api/appointments/[id]
 * Cancels the appointment.
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const { id } = await context.params;

  try {
    const supabase = await createClient();

    const { data: existing, error: fetchError } = await supabase
      .from('appointments')
      .select('id, patient_id, doctor_id, status')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Appointment not found.' }, { status: 404 });
    }

    if (auth.userId !== existing.patient_id && auth.userId !== existing.doctor_id) {
      return NextResponse.json(
        { error: 'Forbidden: You cannot cancel this appointment.' },
        { status: 403 }
      );
    }

    const { data: cancelled, error: cancelError } = await supabase
      .from('appointments')
      .update({ status: 'cancelled' })
      .eq('id', id)
      .select('*')
      .single();

    if (cancelError) {
      return NextResponse.json({ error: cancelError.message }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Appointment cancelled successfully.',
      appointment: cancelled,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to cancel appointment';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
