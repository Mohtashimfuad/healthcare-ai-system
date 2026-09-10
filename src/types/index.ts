// types/index.ts
// TypeScript interfaces matching supabase/migrations/001_init.sql

// ─────────────────────────────────────────────────────────────
// Enums
// ─────────────────────────────────────────────────────────────

export type UserRole = 'patient' | 'doctor';
export type AppointmentType = 'online' | 'physical';
export type AppointmentStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';
export type PrescriptionStatus = 'pending' | 'approved' | 'dispensed' | 'cancelled';

// ─────────────────────────────────────────────────────────────
// JSONB sub-types
// ─────────────────────────────────────────────────────────────

export interface AvailabilitySlot {
  day: string;    // e.g. "Monday"
  start: string;  // e.g. "09:00"
  end: string;    // e.g. "17:00"
}

export interface Medicine {
  name: string;
  dosage: string;        // e.g. "500mg"
  frequency: string;     // e.g. "twice daily"
  duration_days: number;
}

export interface AiSuggestion {
  suggested_medicines?: Medicine[];
  notes?: string;
  confidence?: number;
  [key: string]: unknown; // flexible payload
}

// ─────────────────────────────────────────────────────────────
// Table: profiles
// ─────────────────────────────────────────────────────────────

export interface Profile {
  id: string;         // uuid – matches auth.users.id
  role: UserRole;
  full_name: string;
  phone: string | null;
  created_at: string; // ISO 8601
}

export type ProfileInsert = Omit<Profile, 'created_at'>;
export type ProfileUpdate = Partial<Omit<Profile, 'id' | 'created_at'>>;

// ─────────────────────────────────────────────────────────────
// Table: doctor_profiles
// ─────────────────────────────────────────────────────────────

export interface DoctorProfile {
  profile_id: string;
  specialty: string;
  hospital: string | null;
  latitude: number | null;
  longitude: number | null;
  availability_slots: AvailabilitySlot[];
  rating: number; // 0–5
}

export type DoctorProfileInsert = Omit<DoctorProfile, 'rating'> & { rating?: number };
export type DoctorProfileUpdate = Partial<Omit<DoctorProfile, 'profile_id'>>;

// ─────────────────────────────────────────────────────────────
// Table: patient_profiles
// ─────────────────────────────────────────────────────────────

export interface PatientProfile {
  profile_id: string;
  date_of_birth: string | null; // ISO 8601 date
  blood_group: string | null;
  allergies: string[];
  conditions: string[];
}

export type PatientProfileInsert = PatientProfile;
export type PatientProfileUpdate = Partial<Omit<PatientProfile, 'profile_id'>>;

// ─────────────────────────────────────────────────────────────
// Table: appointments
// ─────────────────────────────────────────────────────────────

export interface Appointment {
  id: string;
  patient_id: string;
  doctor_id: string;
  type: AppointmentType;
  scheduled_at: string;  // ISO 8601
  status: AppointmentStatus;
  symptoms_notes: string | null;
  created_at: string;
}

export type AppointmentInsert = Omit<Appointment, 'id' | 'created_at' | 'status'> & {
  status?: AppointmentStatus;
};
export type AppointmentUpdate = Partial<
  Pick<Appointment, 'status' | 'symptoms_notes' | 'scheduled_at' | 'type'>
>;

// ─────────────────────────────────────────────────────────────
// Table: medical_reports
// ─────────────────────────────────────────────────────────────

export interface MedicalReport {
  id: string;
  patient_id: string;
  file_url: string;
  ocr_text: string | null;
  ai_summary: string | null;
  created_at: string;
}

export type MedicalReportInsert = Omit<MedicalReport, 'id' | 'created_at'>;
export type MedicalReportUpdate = Partial<Pick<MedicalReport, 'ocr_text' | 'ai_summary'>>;

// ─────────────────────────────────────────────────────────────
// Table: prescriptions
// ─────────────────────────────────────────────────────────────

export interface Prescription {
  id: string;
  appointment_id: string | null;
  doctor_id: string;
  patient_id: string;
  medicines: Medicine[];
  ai_suggestion: AiSuggestion | null;
  doctor_approved: boolean;
  status: PrescriptionStatus;
  created_at: string;
}

export type PrescriptionInsert = Omit<
  Prescription,
  'id' | 'created_at' | 'doctor_approved' | 'status'
> & {
  doctor_approved?: boolean;
  status?: PrescriptionStatus;
};
export type PrescriptionUpdate = Partial<
  Pick<Prescription, 'medicines' | 'ai_suggestion' | 'doctor_approved' | 'status'>
>;

// ─────────────────────────────────────────────────────────────
// Table: reminders
// ─────────────────────────────────────────────────────────────

export interface Reminder {
  id: string;
  prescription_id: string;
  patient_id: string;
  dose_time: string;       // ISO 8601
  taken: boolean;
  taken_at: string | null; // ISO 8601
}

export type ReminderInsert = Omit<Reminder, 'id' | 'taken' | 'taken_at'> & {
  taken?: boolean;
  taken_at?: string | null;
};
export type ReminderUpdate = Partial<Pick<Reminder, 'taken' | 'taken_at'>>;

// ─────────────────────────────────────────────────────────────
// Joined / view types (useful for UI queries)
// ─────────────────────────────────────────────────────────────

export interface DoctorWithProfile extends DoctorProfile {
  profile: Profile;
}

export interface PatientWithProfile extends PatientProfile {
  profile: Profile;
}

export interface AppointmentWithProfiles extends Appointment {
  patient: Profile;
  doctor: Profile & { doctor_profile: DoctorProfile };
}

export interface PrescriptionWithDetails extends Prescription {
  appointment: Appointment | null;
  doctor: Profile;
  reminders: Reminder[];
}

// ─────────────────────────────────────────────────────────────
// Supabase Database type map — use as: createClient<Database>()
// ─────────────────────────────────────────────────────────────

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: ProfileInsert;
        Update: ProfileUpdate;
      };
      doctor_profiles: {
        Row: DoctorProfile;
        Insert: DoctorProfileInsert;
        Update: DoctorProfileUpdate;
      };
      patient_profiles: {
        Row: PatientProfile;
        Insert: PatientProfileInsert;
        Update: PatientProfileUpdate;
      };
      appointments: {
        Row: Appointment;
        Insert: AppointmentInsert;
        Update: AppointmentUpdate;
      };
      medical_reports: {
        Row: MedicalReport;
        Insert: MedicalReportInsert;
        Update: MedicalReportUpdate;
      };
      prescriptions: {
        Row: Prescription;
        Insert: PrescriptionInsert;
        Update: PrescriptionUpdate;
      };
      reminders: {
        Row: Reminder;
        Insert: ReminderInsert;
        Update: ReminderUpdate;
      };
    };
    Enums: {
      user_role: UserRole;
      appointment_type: AppointmentType;
      appointment_status: AppointmentStatus;
      prescription_status: PrescriptionStatus;
    };
  };
}
