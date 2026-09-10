-- ============================================================
-- 001_init.sql  –  Healthcare AI Platform
-- Run this in Supabase SQL Editor (or apply via: supabase db push)
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- EXTENSIONS
-- ─────────────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ─────────────────────────────────────────────────────────────
-- CUSTOM TYPES (enums)
-- ─────────────────────────────────────────────────────────────
do $$ begin
  create type user_role as enum ('patient', 'doctor');
exception when duplicate_object then null; end $$;

do $$ begin
  create type appointment_type as enum ('online', 'physical');
exception when duplicate_object then null; end $$;

do $$ begin
  create type appointment_status as enum ('pending', 'confirmed', 'completed', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type prescription_status as enum ('pending', 'approved', 'dispensed', 'cancelled');
exception when duplicate_object then null; end $$;

-- ─────────────────────────────────────────────────────────────
-- TABLE: profiles
-- ─────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  role        user_role   not null,
  full_name   text        not null,
  phone       text,
  created_at  timestamptz not null default now()
);

comment on table public.profiles is
  'One row per auth user – base identity for both patients and doctors.';

-- ─────────────────────────────────────────────────────────────
-- TABLE: doctor_profiles
-- ─────────────────────────────────────────────────────────────
create table if not exists public.doctor_profiles (
  profile_id          uuid             primary key
                        references public.profiles (id) on delete cascade,
  specialty           text             not null,
  hospital            text,
  latitude            double precision,
  longitude           double precision,
  availability_slots  jsonb            not null default '[]'::jsonb,
  rating              float            not null default 0,
  constraint rating_range check (rating >= 0 and rating <= 5)
);

comment on column public.doctor_profiles.availability_slots is
  'Array of {day, start, end} objects e.g. [{"day":"Monday","start":"09:00","end":"17:00"}]';

-- ─────────────────────────────────────────────────────────────
-- TABLE: patient_profiles
-- ─────────────────────────────────────────────────────────────
create table if not exists public.patient_profiles (
  profile_id    uuid    primary key
                  references public.profiles (id) on delete cascade,
  date_of_birth date,
  blood_group   text,
  allergies     text[]  not null default '{}',
  conditions    text[]  not null default '{}'
);

-- ─────────────────────────────────────────────────────────────
-- TABLE: appointments
-- ─────────────────────────────────────────────────────────────
create table if not exists public.appointments (
  id              uuid               primary key default uuid_generate_v4(),
  patient_id      uuid               not null references public.profiles (id) on delete cascade,
  doctor_id       uuid               not null references public.profiles (id) on delete cascade,
  type            appointment_type   not null,
  scheduled_at    timestamptz        not null,
  status          appointment_status not null default 'pending',
  symptoms_notes  text,
  created_at      timestamptz        not null default now()
);

create index if not exists appointments_patient_id_idx   on public.appointments (patient_id);
create index if not exists appointments_doctor_id_idx    on public.appointments (doctor_id);
create index if not exists appointments_scheduled_at_idx on public.appointments (scheduled_at);

-- ─────────────────────────────────────────────────────────────
-- TABLE: medical_reports
-- ─────────────────────────────────────────────────────────────
create table if not exists public.medical_reports (
  id          uuid        primary key default uuid_generate_v4(),
  patient_id  uuid        not null references public.profiles (id) on delete cascade,
  file_url    text        not null,
  ocr_text    text,
  ai_summary  text,
  created_at  timestamptz not null default now()
);

create index if not exists medical_reports_patient_id_idx on public.medical_reports (patient_id);

-- ─────────────────────────────────────────────────────────────
-- TABLE: prescriptions
-- ─────────────────────────────────────────────────────────────
create table if not exists public.prescriptions (
  id               uuid                primary key default uuid_generate_v4(),
  appointment_id   uuid                references public.appointments (id) on delete set null,
  doctor_id        uuid                not null references public.profiles (id) on delete cascade,
  patient_id       uuid                not null references public.profiles (id) on delete cascade,
  medicines        jsonb               not null default '[]'::jsonb,
  ai_suggestion    jsonb               default '{}'::jsonb,
  doctor_approved  boolean             not null default false,
  status           prescription_status not null default 'pending',
  created_at       timestamptz         not null default now()
);

comment on column public.prescriptions.medicines is
  'Array of {name, dosage, frequency, duration_days} objects.';
comment on column public.prescriptions.ai_suggestion is
  'Flexible AI-generated suggestion payload.';

create index if not exists prescriptions_patient_id_idx on public.prescriptions (patient_id);
create index if not exists prescriptions_doctor_id_idx  on public.prescriptions (doctor_id);

-- ─────────────────────────────────────────────────────────────
-- TABLE: reminders
-- ─────────────────────────────────────────────────────────────
create table if not exists public.reminders (
  id               uuid        primary key default uuid_generate_v4(),
  prescription_id  uuid        not null references public.prescriptions (id) on delete cascade,
  patient_id       uuid        not null references public.profiles (id)       on delete cascade,
  dose_time        timestamptz not null,
  taken            boolean     not null default false,
  taken_at         timestamptz
);

create index if not exists reminders_patient_id_idx      on public.reminders (patient_id);
create index if not exists reminders_dose_time_idx       on public.reminders (dose_time);
create index if not exists reminders_prescription_id_idx on public.reminders (prescription_id);

-- ─────────────────────────────────────────────────────────────
-- HELPER: is the calling user a doctor who has this patient?
-- ─────────────────────────────────────────────────────────────
create or replace function public.is_my_patient(p_patient_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1
    from   public.appointments
    where  doctor_id  = auth.uid()
      and  patient_id = p_patient_id
  );
$$;

-- ─────────────────────────────────────────────────────────────
-- TRIGGER: auto-create profile row when a new user signs up
-- ─────────────────────────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role user_role;
begin
  -- Read role from metadata passed at sign-up:
  -- supabase.auth.signUp({ options: { data: { role: 'doctor' | 'patient' } } })
  begin
    v_role := (new.raw_user_meta_data ->> 'role')::user_role;
  exception when invalid_text_representation then
    v_role := 'patient';
  end;

  if v_role is null then
    v_role := 'patient';
  end if;

  insert into public.profiles (id, role, full_name, phone)
  values (
    new.id,
    v_role,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.raw_user_meta_data ->> 'phone'
  );

  -- Seed the role-specific sub-profile so a row always exists
  if v_role = 'doctor' then
    insert into public.doctor_profiles (profile_id, specialty)
    values (
      new.id,
      coalesce(new.raw_user_meta_data ->> 'specialty', 'General')
    );
  else
    insert into public.patient_profiles (profile_id)
    values (new.id);
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────────────────────────

-- ── profiles ──────────────────────────────────────────────────
alter table public.profiles enable row level security;

-- All authenticated users can read any profile (needed for doctor listing)
create policy "profiles: authenticated read"
  on public.profiles for select to authenticated
  using (true);

create policy "profiles: own insert"
  on public.profiles for insert to authenticated
  with check (auth.uid() = id);

create policy "profiles: own update"
  on public.profiles for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ── doctor_profiles ───────────────────────────────────────────
alter table public.doctor_profiles enable row level security;

-- Any authenticated user can read doctor_profiles (for booking)
create policy "doctor_profiles: authenticated read"
  on public.doctor_profiles for select to authenticated
  using (true);

create policy "doctor_profiles: own write"
  on public.doctor_profiles for all to authenticated
  using   (auth.uid() = profile_id)
  with check (auth.uid() = profile_id);

-- ── patient_profiles ──────────────────────────────────────────
alter table public.patient_profiles enable row level security;

-- Patient sees own row; doctors see rows of their patients
create policy "patient_profiles: read"
  on public.patient_profiles for select to authenticated
  using (
    auth.uid() = profile_id
    or public.is_my_patient(profile_id)
  );

create policy "patient_profiles: own write"
  on public.patient_profiles for all to authenticated
  using   (auth.uid() = profile_id)
  with check (auth.uid() = profile_id);

-- ── appointments ──────────────────────────────────────────────
alter table public.appointments enable row level security;

create policy "appointments: participant read"
  on public.appointments for select to authenticated
  using (auth.uid() = patient_id or auth.uid() = doctor_id);

create policy "appointments: patient insert"
  on public.appointments for insert to authenticated
  with check (auth.uid() = patient_id);

create policy "appointments: participant update"
  on public.appointments for update to authenticated
  using (auth.uid() = patient_id or auth.uid() = doctor_id);

-- ── medical_reports ───────────────────────────────────────────
alter table public.medical_reports enable row level security;

create policy "medical_reports: read"
  on public.medical_reports for select to authenticated
  using (
    auth.uid() = patient_id
    or public.is_my_patient(patient_id)
  );

create policy "medical_reports: patient insert"
  on public.medical_reports for insert to authenticated
  with check (auth.uid() = patient_id);

-- ── prescriptions ─────────────────────────────────────────────
alter table public.prescriptions enable row level security;

create policy "prescriptions: participant read"
  on public.prescriptions for select to authenticated
  using (auth.uid() = patient_id or auth.uid() = doctor_id);

create policy "prescriptions: doctor insert"
  on public.prescriptions for insert to authenticated
  with check (auth.uid() = doctor_id);

create policy "prescriptions: doctor update"
  on public.prescriptions for update to authenticated
  using (auth.uid() = doctor_id);

-- ── reminders ─────────────────────────────────────────────────
alter table public.reminders enable row level security;

create policy "reminders: own read"
  on public.reminders for select to authenticated
  using (auth.uid() = patient_id);

create policy "reminders: own write"
  on public.reminders for all to authenticated
  using   (auth.uid() = patient_id)
  with check (auth.uid() = patient_id);

-- ─────────────────────────────────────────────────────────────
-- GRANTS
-- ─────────────────────────────────────────────────────────────
grant usage on schema public to authenticated, anon;

grant select, insert, update         on public.profiles         to authenticated;
grant select, insert, update         on public.doctor_profiles  to authenticated;
grant select, insert, update         on public.patient_profiles to authenticated;
grant select, insert, update, delete on public.appointments     to authenticated;
grant select, insert                 on public.medical_reports  to authenticated;
grant select, insert, update         on public.prescriptions    to authenticated;
grant select, insert, update, delete on public.reminders        to authenticated;
