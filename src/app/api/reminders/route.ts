// src/app/api/reminders/route.ts
// Patient medication reminders: List pending, upcoming, and daily scheduled doses.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/auth-server';

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');
    const statusParam = searchParams.get('status'); // 'scheduled', 'taken', 'all'

    let query = supabase
      .from('reminders')
      .select(`
        id,
        prescription_id,
        patient_id,
        medicine_name,
        dosage,
        dose_time,
        taken,
        taken_at,
        status,
        prescription:prescriptions(
          id,
          doctor:profiles!prescriptions_doctor_id_fkey(full_name)
        )
      `)
      .order('dose_time', { ascending: true });

    // Patients see their own reminders; Doctors can view a patient's reminders if queried
    if (auth.role === 'patient') {
      query = query.eq('patient_id', auth.userId);
    } else if (auth.role === 'doctor') {
      const patientId = searchParams.get('patient_id');
      if (patientId) {
        query = query.eq('patient_id', patientId);
      } else {
        return NextResponse.json(
          { error: 'Doctors must specify patient_id to view reminders.' },
          { status: 400 }
        );
      }
    }

    if (statusParam && statusParam !== 'all') {
      if (statusParam === 'taken') {
        query = query.eq('taken', true);
      } else if (statusParam === 'scheduled') {
        query = query.eq('taken', false);
      }
    }

    if (dateParam) {
      const start = `${dateParam}T00:00:00.000Z`;
      const end = `${dateParam}T23:59:59.999Z`;
      query = query.gte('dose_time', start).lte('dose_time', end);
    }

    const { data: reminders, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ reminders: reminders || [] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to retrieve reminders';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
