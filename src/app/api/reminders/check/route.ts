// src/app/api/reminders/check/route.ts
// Background notification dispatcher: Checks for medication reminders due within the current window.

import { NextRequest, NextResponse } from 'next/server';
import { checkDueReminders } from '@/lib/reminders';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const windowMinutes = Number(searchParams.get('window')) || 15;

    const result = await checkDueReminders(windowMinutes);

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      due_count: result.dueCount,
      notifications: result.notifications,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error checking due reminders';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
