// src/app/api/doctors/availability/route.ts
// Doctor availability management and slot schedule generation.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAuth, requireRole } from '@/lib/auth-server';
import type { AvailabilitySlot } from '@/types';

const DAYS_OF_WEEK = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

/**
 * Generates an array of HH:MM time slots in 30-minute intervals between start and end.
 */
function generateTimeSlots(start: string, end: string): string[] {
  const slots: string[] = [];
  const [startHour, startMinute] = start.split(':').map(Number);
  const [endHour, endMinute] = end.split(':').map(Number);

  let currentTotalMinutes = startHour * 60 + startMinute;
  const endTotalMinutes = endHour * 60 + endMinute;

  while (currentTotalMinutes + 30 <= endTotalMinutes) {
    const h = Math.floor(currentTotalMinutes / 60);
    const m = currentTotalMinutes % 60;
    const formatted = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    slots.push(formatted);
    currentTotalMinutes += 30; // 30-minute appointment slots
  }

  return slots;
}

/**
 * GET /api/doctors/availability
 * Query availability slots for a doctor.
 * Query parameters:
 * - doctor_id (required if patient is booking; optional if doctor queries their own)
 * - date (optional, YYYY-MM-DD; if provided, checks booked slots and returns available times)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const doctorIdParam = searchParams.get('doctor_id');
    const dateParam = searchParams.get('date');

    let doctorId = doctorIdParam;

    if (!doctorId) {
      // If not specified, check if logged in as a doctor
      const auth = await requireAuth();
      if (!(auth instanceof NextResponse) && auth.role === 'doctor') {
        doctorId = auth.userId;
      } else {
        return NextResponse.json(
          { error: 'doctor_id query parameter is required.' },
          { status: 400 }
        );
      }
    }

    const { data: doctor, error } = await supabase
      .from('doctor_profiles')
      .select(`
        profile_id,
        specialty,
        hospital,
        rating,
        availability_slots,
        profile:profiles(full_name)
      `)
      .eq('profile_id', doctorId)
      .single();

    if (error || !doctor) {
      return NextResponse.json({ error: 'Doctor profile not found.' }, { status: 404 });
    }

    const weeklySlots = (doctor.availability_slots || []) as AvailabilitySlot[];

    // If date is not provided, return the general weekly schedule
    if (!dateParam) {
      return NextResponse.json({
        doctor_id: doctorId,
        specialty: doctor.specialty,
        hospital: doctor.hospital,
        availability_slots: weeklySlots,
      });
    }

    // Date-specific slot calculation
    const parsedDate = new Date(`${dateParam}T00:00:00Z`);
    if (isNaN(parsedDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format. Please use YYYY-MM-DD.' },
        { status: 400 }
      );
    }

    const dayName = DAYS_OF_WEEK[parsedDate.getUTCDay()];
    const matchingDaySlots = weeklySlots.filter(
      (s) => s.day.toLowerCase() === dayName.toLowerCase()
    );

    // Generate potential 30-min time slots for this day
    const allGeneratedTimes: string[] = [];
    for (const schedule of matchingDaySlots) {
      allGeneratedTimes.push(...generateTimeSlots(schedule.start, schedule.end));
    }

    // Query booked appointments for this doctor on that date
    const startOfDay = `${dateParam}T00:00:00.000Z`;
    const endOfDay = `${dateParam}T23:59:59.999Z`;

    const { data: bookedAppointments } = await supabase
      .from('appointments')
      .select('scheduled_at, status')
      .eq('doctor_id', doctorId)
      .neq('status', 'cancelled')
      .gte('scheduled_at', startOfDay)
      .lte('scheduled_at', endOfDay);

    const bookedTimeStrings = new Set<string>();
    (bookedAppointments || []).forEach((apt) => {
      const aptDate = new Date(apt.scheduled_at);
      const h = String(aptDate.getUTCHours()).padStart(2, '0');
      const m = String(aptDate.getUTCMinutes()).padStart(2, '0');
      bookedTimeStrings.add(`${h}:${m}`);
    });

    // Mark slot availability
    const slotsStatus = allGeneratedTimes.map((timeStr) => {
      const isBooked = bookedTimeStrings.has(timeStr);
      return {
        time: timeStr,
        scheduled_at: `${dateParam}T${timeStr}:00.000Z`,
        available: !isBooked,
      };
    });

    return NextResponse.json({
      doctor_id: doctorId,
      doctor_name: (doctor.profile as { full_name?: string } | null)?.full_name || 'Doctor',
      date: dateParam,
      day: dayName,
      available_slots: slotsStatus.filter((s) => s.available),
      all_slots: slotsStatus,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to query doctor availability';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * PUT /api/doctors/availability
 * Doctor updates their weekly availability slots.
 * Body: {
 *   availability_slots: [
 *     { day: 'Monday', start: '09:00', end: '17:00' },
 *     { day: 'Wednesday', start: '10:00', end: '16:00' }
 *   ]
 * }
 */
export async function PUT(request: NextRequest) {
  const auth = await requireRole('doctor');
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await request.json();
    const { availability_slots } = body;

    if (!Array.isArray(availability_slots)) {
      return NextResponse.json(
        { error: 'availability_slots must be an array of slot objects.' },
        { status: 400 }
      );
    }

    // Validate slots format
    for (const slot of availability_slots as AvailabilitySlot[]) {
      if (!slot.day || !slot.start || !slot.end) {
        return NextResponse.json(
          { error: 'Each slot must contain day, start (HH:MM), and end (HH:MM).' },
          { status: 400 }
        );
      }
    }

    const supabase = await createClient();

    const { data: updated, error } = await supabase
      .from('doctor_profiles')
      .update({ availability_slots })
      .eq('profile_id', auth.userId)
      .select('profile_id, availability_slots')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Doctor availability schedule updated successfully.',
      availability_slots: updated.availability_slots,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update availability';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
