// src/app/api/reminders/[id]/route.ts
// Updates a specific reminder (e.g. mark as taken, skipped, or rescheduled).

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/auth-server';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const { id } = await context.params;

  try {
    const supabase = await createClient();

    const { data: reminder, error: fetchError } = await supabase
      .from('reminders')
      .select('id, patient_id, taken')
      .eq('id', id)
      .single();

    if (fetchError || !reminder) {
      return NextResponse.json({ error: 'Reminder not found.' }, { status: 404 });
    }

    if (auth.userId !== reminder.patient_id) {
      return NextResponse.json(
        { error: 'Forbidden: You can only update your own medication reminders.' },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const newTakenState = body.taken !== undefined ? Boolean(body.taken) : true;
    const newStatus = body.status || (newTakenState ? 'taken' : 'scheduled');

    const updatePayload = {
      taken: newTakenState,
      taken_at: newTakenState ? new Date().toISOString() : null,
      status: newStatus,
    };

    const { data: updated, error: updateError } = await supabase
      .from('reminders')
      .update(updatePayload)
      .eq('id', id)
      .select('*')
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      message: newTakenState ? 'Dose confirmed as taken.' : 'Dose reset to scheduled.',
      reminder: updated,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update reminder';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
