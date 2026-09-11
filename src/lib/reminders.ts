// src/lib/reminders.ts
// Automated scheduling, tracking, and notification dispatcher for patient medication reminders.

import { createAdminClient } from '@/lib/supabase/admin';
import type { Medicine, ReminderInsert } from '@/types';

export interface DoseTimeSlot {
  hour: number;
  minute: number;
}

/**
 * Parses medical frequency phrases into standardized daily hour/minute slots.
 */
export function parseDosingSchedule(frequency: string): DoseTimeSlot[] {
  const f = frequency.toLowerCase();

  if (f.includes('four times') || f.includes('4 times') || f.includes('qid') || f.includes('every 6 hours')) {
    return [
      { hour: 8, minute: 0 },
      { hour: 12, minute: 0 },
      { hour: 16, minute: 0 },
      { hour: 20, minute: 0 },
    ];
  }

  if (f.includes('three times') || f.includes('3 times') || f.includes('tid') || f.includes('every 8 hours')) {
    return [
      { hour: 8, minute: 0 },
      { hour: 14, minute: 0 },
      { hour: 20, minute: 0 },
    ];
  }

  if (f.includes('twice') || f.includes('2 times') || f.includes('bid') || f.includes('every 12 hours')) {
    return [
      { hour: 9, minute: 0 },
      { hour: 21, minute: 0 },
    ];
  }

  if (f.includes('bedtime') || f.includes('night') || f.includes('hs')) {
    return [{ hour: 22, minute: 0 }];
  }

  // Default: Once daily in the morning
  return [{ hour: 9, minute: 0 }];
}

/**
 * Automatically creates time-stamped reminders for all medicines in a prescription.
 */
export async function generateRemindersForPrescription(
  prescriptionId: string,
  patientId: string,
  medicines: Medicine[],
  startDate: Date = new Date()
): Promise<{ count: number; reminders: ReminderInsert[] }> {
  const remindersToInsert: ReminderInsert[] = [];

  for (const med of medicines) {
    const slots = parseDosingSchedule(med.frequency);
    const duration = Math.min(Math.max(med.duration_days || 5, 1), 60); // Clamp 1 to 60 days

    for (let day = 0; day < duration; day++) {
      for (const slot of slots) {
        const doseDate = new Date(startDate);
        doseDate.setDate(doseDate.getDate() + day);
        doseDate.setHours(slot.hour, slot.minute, 0, 0);

        // Do not schedule doses in the past for today
        if (doseDate.getTime() < Date.now() - 1000 * 60 * 30) {
          continue;
        }

        remindersToInsert.push({
          prescription_id: prescriptionId,
          patient_id: patientId,
          medicine_name: med.name,
          dosage: med.dosage,
          dose_time: doseDate.toISOString(),
          status: 'scheduled',
        });
      }
    }
  }

  if (remindersToInsert.length === 0) {
    return { count: 0, reminders: [] };
  }

  // Insert into database using admin client to ensure all records write cleanly
  const supabase = createAdminClient();
  const { error } = await supabase.from('reminders').insert(remindersToInsert);

  if (error) {
    console.error('Error generating reminders:', error);
    throw new Error(`Failed to save reminders: ${error.message}`);
  }

  return {
    count: remindersToInsert.length,
    reminders: remindersToInsert,
  };
}

/**
 * Checks for medication doses due right now (e.g. for background cron / notification dispatcher).
 */
export async function checkDueReminders(windowMinutes = 15): Promise<{
  dueCount: number;
  notifications: Array<{
    reminderId: string;
    patientId: string;
    patientName?: string;
    patientPhone?: string | null;
    medicineName: string;
    dosage: string;
    doseTime: string;
    message: string;
  }>;
}> {
  const supabase = createAdminClient();
  const now = new Date();
  const windowStart = new Date(now.getTime() - 1000 * 60 * 15).toISOString(); // 15 mins ago
  const windowEnd = new Date(now.getTime() + 1000 * 60 * windowMinutes).toISOString(); // upcoming

  // Query pending scheduled reminders within the window
  const { data: dueReminders, error } = await supabase
    .from('reminders')
    .select('id, patient_id, medicine_name, dosage, dose_time, status')
    .eq('taken', false)
    .gte('dose_time', windowStart)
    .lte('dose_time', windowEnd)
    .order('dose_time', { ascending: true });

  if (error || !dueReminders) {
    return { dueCount: 0, notifications: [] };
  }

  // Fetch patient profile details for phone / notification formatting
  const patientIds = Array.from(new Set(dueReminders.map((r) => r.patient_id)));
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, phone')
    .in('id', patientIds);

  const profileMap = new Map((profiles || []).map((p) => [p.id, p]));

  const notifications = dueReminders.map((r) => {
    const profile = profileMap.get(r.patient_id);
    const med = r.medicine_name || 'Scheduled medication';
    const dose = r.dosage ? ` (${r.dosage})` : '';
    const formattedTime = new Date(r.dose_time).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

    return {
      reminderId: r.id,
      patientId: r.patient_id,
      patientName: profile?.full_name,
      patientPhone: profile?.phone,
      medicineName: med,
      dosage: r.dosage || '',
      doseTime: r.dose_time,
      message: `HealthAI Reminder: Hello ${profile?.full_name || 'there'}, it is time for your ${formattedTime} dose of ${med}${dose}. Please mark as taken in your portal.`,
    };
  });

  return {
    dueCount: notifications.length,
    notifications,
  };
}
