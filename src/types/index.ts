// types/index.ts
// TypeScript interfaces matching supabase/migrations/001_init.sql & 002_vector_and_improvements.sql

// ─────────────────────────────────────────────────────────────
// Enums
// ─────────────────────────────────────────────────────────────

export type UserRole = 'patient' | 'doctor';
export type AppointmentType = 'online' | 'physical';
export type AppointmentStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';
export type PrescriptionStatus = 'pending' | 'approved' | 'dispensed' | 'cancelled';
export type ReminderStatus = 'scheduled' | 'taken' | 'missed' | 'skipped';

// ─────────────────────────────────────────────────────────────
// JSONB sub-types
// ─────────────────────────────────────────────────────────────

export type AvailabilitySlot = {
  day: string;    // e.g. "Monday"
  start: string;  // e.g. "09:00"
  end: string;    // e.g. "17:00"
}

export type Medicine = {
  name: string;
  dosage: string;        // e.g. "500mg"
  frequency: string;     // e.g. "twice daily", "once daily", "every 8 hours"
  duration_days: number;
  instructions?: string; // e.g. "take with food"
}

export type AiMedicineRecommendation = {
  name: string;
  dosage: string;
  frequency: string;
  duration_days: number;
  purpose: string;
  instructions?: string;
}

export type AiSuggestion = {
  suggested_medicines?: AiMedicineRecommendation[];
  precautions?: string[];
  contraindications?: string[];
  lifestyle_advice?: string[];
  confidence?: number;
  notes?: string;
  requires_immediate_er?: boolean;
  differential_diagnoses?: string[];
  rag_sources?: string[];
  [key: string]: unknown; // flexible payload
}

// ─────────────────────────────────────────────────────────────
// Table: profiles
// ─────────────────────────────────────────────────────────────

export type Profile = {
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

export type DoctorProfile = {
  profile_id: string;
  specialty: string;
  hospital: string | null;
  latitude: number | null;
  longitude: number | null;
  availability_slots: AvailabilitySlot[];
  rating: number; // 0–5
}

export type DoctorProfileInsert = {
  profile_id: string;
  specialty: string;
  hospital?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  availability_slots?: AvailabilitySlot[];
  rating?: number;
};
export type DoctorProfileUpdate = Partial<Omit<DoctorProfile, 'profile_id'>>;

// ─────────────────────────────────────────────────────────────
// Table: patient_profiles
// ─────────────────────────────────────────────────────────────

export type PatientProfile = {
  profile_id: string;
  date_of_birth: string | null; // ISO 8601 date
  blood_group: string | null;
  allergies: string[];
  conditions: string[];
}

export type PatientProfileInsert = {
  profile_id: string;
  date_of_birth?: string | null;
  blood_group?: string | null;
  allergies?: string[];
  conditions?: string[];
};
export type PatientProfileUpdate = Partial<Omit<PatientProfile, 'profile_id'>>;

// ─────────────────────────────────────────────────────────────
// Table: appointments
// ─────────────────────────────────────────────────────────────

export type Appointment = {
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

export type MedicalReport = {
  id: string;
  patient_id: string;
  file_url: string;
  title: string | null;
  report_type: string;
  ocr_text: string | null;
  ai_summary: string | null;
  embedding?: number[] | null;
  created_at: string;
}

export type MedicalReportInsert = {
  id?: string;
  patient_id: string;
  file_url: string;
  title?: string | null;
  report_type?: string;
  ocr_text?: string | null;
  ai_summary?: string | null;
  embedding?: number[] | null;
};
export type MedicalReportUpdate = Partial<
  Pick<MedicalReport, 'title' | 'report_type' | 'ocr_text' | 'ai_summary' | 'embedding'>
>;

// ─────────────────────────────────────────────────────────────
// Table: medical_knowledge (RAG)
// ─────────────────────────────────────────────────────────────

export type MedicalKnowledge = {
  id: string;
  title: string;
  category: string;
  content: string;
  tags: string[];
  embedding: number[] | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export type MedicalKnowledgeInsert = Omit<MedicalKnowledge, 'id' | 'created_at'>;
export type MedicalKnowledgeUpdate = Partial<Omit<MedicalKnowledge, 'id' | 'created_at'>>;

// ─────────────────────────────────────────────────────────────
// Table: prescriptions
// ─────────────────────────────────────────────────────────────

export type Prescription = {
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

export type Reminder = {
  id: string;
  prescription_id: string;
  patient_id: string;
  medicine_name: string | null;
  dosage: string | null;
  dose_time: string;       // ISO 8601
  taken: boolean;
  taken_at: string | null; // ISO 8601
  status: ReminderStatus;
}

export type ReminderInsert = Omit<Reminder, 'id' | 'taken' | 'taken_at' | 'status'> & {
  taken?: boolean;
  taken_at?: string | null;
  status?: ReminderStatus;
};
export type ReminderUpdate = Partial<Pick<Reminder, 'taken' | 'taken_at' | 'status'>>;

// ─────────────────────────────────────────────────────────────
// Joined / View Types
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
// Supabase Database Type Map
// ─────────────────────────────────────────────────────────────

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: ProfileInsert;
        Update: ProfileUpdate;
        Relationships: [];
      };
      doctor_profiles: {
        Row: DoctorProfile;
        Insert: DoctorProfileInsert;
        Update: DoctorProfileUpdate;
        Relationships: [];
      };
      patient_profiles: {
        Row: PatientProfile;
        Insert: PatientProfileInsert;
        Update: PatientProfileUpdate;
        Relationships: [];
      };
      appointments: {
        Row: Appointment;
        Insert: AppointmentInsert;
        Update: AppointmentUpdate;
        Relationships: [];
      };
      medical_reports: {
        Row: MedicalReport;
        Insert: MedicalReportInsert;
        Update: MedicalReportUpdate;
        Relationships: [];
      };
      medical_knowledge: {
        Row: MedicalKnowledge;
        Insert: MedicalKnowledgeInsert;
        Update: MedicalKnowledgeUpdate;
        Relationships: [];
      };
      prescriptions: {
        Row: Prescription;
        Insert: PrescriptionInsert;
        Update: PrescriptionUpdate;
        Relationships: [];
      };
      reminders: {
        Row: Reminder;
        Insert: ReminderInsert;
        Update: ReminderUpdate;
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      match_medical_knowledge: {
        Args: {
          query_embedding: number[];
          match_threshold?: number;
          match_count?: number;
          filter_category?: string;
        };
        Returns: {
          id: string;
          title: string;
          category: string;
          content: string;
          tags: string[];
          similarity: number;
          metadata: Record<string, unknown>;
        }[];
      };
      match_patient_reports: {
        Args: {
          p_patient_id: string;
          query_embedding: number[];
          match_threshold?: number;
          match_count?: number;
        };
        Returns: {
          id: string;
          patient_id: string;
          title: string;
          report_type: string;
          ai_summary: string;
          ocr_text: string;
          file_url: string;
          similarity: number;
          created_at: string;
        }[];
      };
    };
    Enums: {
      user_role: UserRole;
      appointment_type: AppointmentType;
      appointment_status: AppointmentStatus;
      prescription_status: PrescriptionStatus;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
