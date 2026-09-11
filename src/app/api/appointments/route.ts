// src/app/api/appointments/route.ts
// Appointments management: List appointments (role-scoped) and create new appointment.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/auth-server';
import type { AppointmentInsert, AppointmentStatus, AppointmentType } from '@/types';

/**
 * GET /api/appointments
 * List appointments for the authenticated user.
 * - Patients see appointments where they are the patient.
 * - Doctors see appointments where they are the doctor.
 * Query parameters:
 * - status: 'pending' | 'confirmed' | 'completed' | 'cancelled'
 * - date: YYYY-MM-DD
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get('status') as AppointmentStatus | null;
    const dateParam = searchParams.get('date');

    let query = supabase
      .from('appointments')
      .select(`
        id,
        patient_id,
        doctor_id,
        type,
        scheduled_at,
        status,
        symptoms_notes,
        created_at,
        patient:profiles!appointments_patient_id_fkey(id, full_name, phone, role),
        doctor:profiles!appointments_doctor_id_fkey(
          id,
          full_name,
          phone,
          role,
          doctor_profile:doctor_profiles(specialty, hospital, rating)
        )
      `)
      .order('scheduled_at', { ascending: true });

    // Enforce role scoping
    if (auth.role === 'patient') {
      query = query.eq('patient_id', auth.userId);
    } else if (auth.role === 'doctor') {
      query = query.eq('doctor_id', auth.userId);
    }

    if (statusParam) {
      query = query.eq('status', statusParam);
    }

    if (dateParam) {
      const startOfDay = `${dateParam}T00:00:00.000Z`;
      const endOfDay = `${dateParam}T23:59:59.999Z`;
      query = query.gte('scheduled_at', startOfDay).lte('scheduled_at', endOfDay);
    }

    const { data: appointments, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ appointments: appointments || [] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch appointments';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/appointments
 * Create a new appointment booking.
 * Body: {
 *   doctor_id: string;
 *   patient_id?: string; // required if caller is doctor booking for patient
 *   type: 'online' | 'physical';
 *   scheduled_at: string (ISO 8601);
 *   symptoms_notes?: string;
 * }
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const { doctor_id, patient_id, type, scheduled_at, symptoms_notes } = body;

    if (!doctor_id || !scheduled_at || !type) {
      return NextResponse.json(
        { error: 'Missing required fields: doctor_id, scheduled_at, and type are mandatory.' },
        { status: 400 }
      );
    }

    const appointmentType = type as AppointmentType;
    if (appointmentType !== 'online' && appointmentType !== 'physical') {
      return NextResponse.json(
        { error: "Invalid appointment type: must be 'online' or 'physical'." },
        { status: 400 }
      );
    }

    // Determine patient ID based on caller role
    let effectivePatientId = auth.userId;
    if (auth.role === 'doctor') {
      if (!patient_id) {
        return NextResponse.json(
          { error: 'Doctors booking appointments must specify patient_id.' },
          { status: 400 }
        );
      }
      effectivePatientId = patient_id;
    }

    const scheduledDate = new Date(scheduled_at);
    if (isNaN(scheduledDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid scheduled_at format. Please use ISO 8601 timestamp.' },
        { status: 400 }
      );
    }

    if (scheduledDate.getTime() < Date.now() - 1000 * 60 * 5) {
      return NextResponse.json(
        { error: 'Cannot schedule appointment in the past.' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Check doctor exists and is a doctor
    const { data: doctorProfile, error: docError } = await supabase
      .from('profiles')
      .select('id, role, full_name')
      .eq('id', doctor_id)
      .eq('role', 'doctor')
      .single();

    if (docError || !doctorProfile) {
      return NextResponse.json(
        { error: 'Doctor not found or user is not registered as a doctor.' },
        { status: 404 }
      );
    }

    // Check for double booking conflicts at that exact time
    const slotStart = new Date(scheduledDate.getTime() - 1000 * 60 * 20).toISOString();
    const slotEnd = new Date(scheduledDate.getTime() + 1000 * 60 * 20).toISOString();

    const { data: conflicts } = await supabase
      .from('appointments')
      .select('id')
      .eq('doctor_id', doctor_id)
      .neq('status', 'cancelled')
      .gte('scheduled_at', slotStart)
      .lte('scheduled_at', slotEnd);

    if (conflicts && conflicts.length > 0) {
      return NextResponse.json(
        { error: 'Doctor already has an appointment booked around this time slot. Please pick another time.' },
        { status: 409 }
      );
    }

    const appointmentPayload: AppointmentInsert = {
      patient_id: effectivePatientId,
      doctor_id,
      type: appointmentType,
      scheduled_at: scheduledDate.toISOString(),
      status: 'pending',
      symptoms_notes: symptoms_notes || null,
    };

    const { data: newAppointment, error: insertError } = await supabase
      .from('appointments')
      .insert(appointmentPayload)
      .select(`
        *,
        doctor:profiles!appointments_doctor_id_fkey(id, full_name),
        patient:profiles!appointments_patient_id_fkey(id, full_name)
      `)
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json(
      {
        message: 'Appointment successfully scheduled.',
        appointment: newAppointment,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create appointment';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
