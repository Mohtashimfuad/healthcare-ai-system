// src/app/api/prescriptions/[id]/reminders/route.ts
// Generates or regenerates medication dosage reminders for a prescription.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/auth-server';
import { generateRemindersForPrescription } from '@/lib/reminders';
import type { Medicine } from '@/types';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const { id } = await context.params;

  try {
    const supabase = await createClient();

    const { data: prescription, error: fetchError } = await supabase
      .from('prescriptions')
      .select('id, patient_id, doctor_id, medicines, doctor_approved')
      .eq('id', id)
      .single();

    if (fetchError || !prescription) {
      return NextResponse.json({ error: 'Prescription not found.' }, { status: 404 });
    }

    // Role check: Only the patient receiving it or the prescribing doctor can trigger reminders
    if (auth.userId !== prescription.patient_id && auth.userId !== prescription.doctor_id) {
      return NextResponse.json(
        { error: 'Forbidden: You do not have permission for this prescription.' },
        { status: 403 }
      );
    }

    const medicines = (prescription.medicines || []) as Medicine[];
    if (medicines.length === 0) {
      return NextResponse.json(
        { error: 'Prescription contains no medicines to schedule reminders for.' },
        { status: 400 }
      );
    }

    const result = await generateRemindersForPrescription(
      prescription.id,
      prescription.patient_id,
      medicines
    );

    return NextResponse.json({
      message: `Successfully scheduled ${result.count} dosage reminders.`,
      count: result.count,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to generate reminders';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
