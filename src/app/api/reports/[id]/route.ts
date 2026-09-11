// src/app/api/reports/[id]/route.ts
// Single medical report management: Retrieve report and delete report.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAuth, isDoctorTreatingPatient } from '@/lib/auth-server';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const { id } = await context.params;

  try {
    const supabase = await createClient();

    const { data: report, error } = await supabase
      .from('medical_reports')
      .select(`
        id,
        patient_id,
        file_url,
        title,
        report_type,
        ai_summary,
        ocr_text,
        created_at,
        patient:profiles!medical_reports_patient_id_fkey(id, full_name, phone)
      `)
      .eq('id', id)
      .single();

    if (error || !report) {
      return NextResponse.json({ error: 'Report not found.' }, { status: 404 });
    }

    // Role security check
    const isOwner = auth.userId === report.patient_id;
    let isDoctorAllowed = false;
    if (auth.role === 'doctor') {
      isDoctorAllowed = await isDoctorTreatingPatient(auth.userId, report.patient_id);
    }

    if (!isOwner && !isDoctorAllowed) {
      return NextResponse.json(
        { error: 'Forbidden: You do not have access to this medical record.' },
        { status: 403 }
      );
    }

    return NextResponse.json({ report });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to retrieve report';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const { id } = await context.params;

  try {
    const supabase = await createClient();

    const { data: report, error: fetchError } = await supabase
      .from('medical_reports')
      .select('id, patient_id')
      .eq('id', id)
      .single();

    if (fetchError || !report) {
      return NextResponse.json({ error: 'Report not found.' }, { status: 404 });
    }

    if (auth.userId !== report.patient_id) {
      return NextResponse.json(
        { error: 'Forbidden: Only the patient who owns the report can delete it.' },
        { status: 403 }
      );
    }

    const { error: deleteError } = await supabase
      .from('medical_reports')
      .delete()
      .eq('id', id);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Report deleted successfully.' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to delete report';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
