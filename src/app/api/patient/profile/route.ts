// src/app/api/patient/profile/route.ts
// Manage patient clinical profile (allergies, chronic conditions, blood group, date of birth).

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/auth-server';
import type { PatientProfileUpdate } from '@/types';

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const targetPatientId = auth.role === 'doctor' && searchParams.get('patient_id')
      ? searchParams.get('patient_id')!
      : auth.userId;

    const { data: profile, error } = await supabase
      .from('patient_profiles')
      .select(`
        profile_id,
        date_of_birth,
        blood_group,
        allergies,
        conditions,
        profile:profiles(full_name, phone)
      `)
      .eq('profile_id', targetPatientId)
      .single();

    if (error || !profile) {
      return NextResponse.json({ error: 'Patient clinical profile not found.' }, { status: 404 });
    }

    return NextResponse.json({ profile });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to retrieve profile';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const { date_of_birth, blood_group, allergies, conditions } = body;

    const supabase = await createClient();
    const updateData: PatientProfileUpdate = {};

    if (date_of_birth !== undefined) updateData.date_of_birth = date_of_birth;
    if (blood_group !== undefined) updateData.blood_group = blood_group;
    if (Array.isArray(allergies)) updateData.allergies = allergies;
    if (Array.isArray(conditions)) updateData.conditions = conditions;

    const { data: updated, error } = await supabase
      .from('patient_profiles')
      .update(updateData)
      .eq('profile_id', auth.userId)
      .select('*')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Clinical profile updated successfully.',
      profile: updated,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update profile';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
