-- ============================================================
-- 002_vector_and_improvements.sql – Vector RAG & Healthcare Backend Enhancements
-- Run this in Supabase SQL Editor (or apply via: supabase db push)
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. PGVECTOR EXTENSION
-- ─────────────────────────────────────────────────────────────
create extension if not exists "vector";

-- ─────────────────────────────────────────────────────────────
-- 2. SCHEMA ENHANCEMENTS FOR REMINDERS & REPORTS
-- ─────────────────────────────────────────────────────────────

-- Enhance reminders with medicine details for quick push/SMS notifications
alter table public.reminders
  add column if not exists medicine_name text,
  add column if not exists dosage text,
  add column if not exists status text not null default 'scheduled';

-- Enhance medical_reports with title, report type, and vector embedding for RAG
alter table public.medical_reports
  add column if not exists title text,
  add column if not exists report_type text not null default 'general',
  add column if not exists embedding vector(1536);

-- ─────────────────────────────────────────────────────────────
-- 3. MEDICAL KNOWLEDGE BASE FOR VECTOR / RAG
-- ─────────────────────────────────────────────────────────────
create table if not exists public.medical_knowledge (
  id          uuid primary key default uuid_generate_v4(),
  title       text not null,
  category    text not null, -- 'pharmacology', 'cardiology', 'endocrinology', 'general_practice', 'allergies', etc.
  content     text not null,
  tags        text[] not null default '{}'::text[],
  embedding   vector(1536),
  metadata    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

comment on table public.medical_knowledge is
  'Clinical reference guidelines, drug interactions, contraindications, and treatment protocols for AI RAG.';

create index if not exists medical_knowledge_category_idx on public.medical_knowledge (category);

-- HNSW Vector Indexes for high-speed similarity search
do $$ begin
  create index medical_knowledge_embedding_idx
    on public.medical_knowledge
    using hnsw (embedding vector_cosine_ops);
exception when others then
  -- In case extension vector is not enabled yet or insufficient memory
  raise notice 'Could not create HNSW index on medical_knowledge (may need pgvector enabled in Supabase)';
end $$;

do $$ begin
  create index medical_reports_embedding_idx
    on public.medical_reports
    using hnsw (embedding vector_cosine_ops);
exception when others then
  raise notice 'Could not create HNSW index on medical_reports';
end $$;

-- ─────────────────────────────────────────────────────────────
-- 4. VECTOR SIMILARITY SEARCH FUNCTIONS (RPC)
-- ─────────────────────────────────────────────────────────────

-- Semantic search over clinical knowledge base
create or replace function public.match_medical_knowledge (
  query_embedding vector(1536),
  match_threshold float default 0.5,
  match_count int default 5,
  filter_category text default null
)
returns table (
  id uuid,
  title text,
  category text,
  content text,
  tags text[],
  similarity float,
  metadata jsonb
)
language plpgsql
stable
as $$
begin
  return query
  select
    mk.id,
    mk.title,
    mk.category,
    mk.content,
    mk.tags,
    1 - (mk.embedding <=> query_embedding) as similarity,
    mk.metadata
  from public.medical_knowledge mk
  where
    mk.embedding is not null
    and (filter_category is null or mk.category = filter_category)
    and 1 - (mk.embedding <=> query_embedding) > match_threshold
  order by mk.embedding <=> query_embedding
  limit match_count;
end;
$$;

-- Semantic search over a patient's historical reports and lab summaries
create or replace function public.match_patient_reports (
  p_patient_id uuid,
  query_embedding vector(1536),
  match_threshold float default 0.4,
  match_count int default 4
)
returns table (
  id uuid,
  patient_id uuid,
  title text,
  report_type text,
  ai_summary text,
  ocr_text text,
  file_url text,
  similarity float,
  created_at timestamptz
)
language plpgsql
stable
security definer
as $$
begin
  -- Caller must be the patient themselves OR a treating doctor
  if auth.uid() <> p_patient_id and not public.is_my_patient(p_patient_id) then
    raise exception 'Unauthorized access to patient medical records.';
  end if;

  return query
  select
    mr.id,
    mr.patient_id,
    mr.title,
    mr.report_type,
    mr.ai_summary,
    mr.ocr_text,
    mr.file_url,
    1 - (mr.embedding <=> query_embedding) as similarity,
    mr.created_at
  from public.medical_reports mr
  where
    mr.patient_id = p_patient_id
    and mr.embedding is not null
    and 1 - (mr.embedding <=> query_embedding) > match_threshold
  order by mr.embedding <=> query_embedding
  limit match_count;
end;
$$;

-- ─────────────────────────────────────────────────────────────
-- 5. RLS IMPROVEMENTS & SECURITY POLICIES
-- ─────────────────────────────────────────────────────────────

-- Medical knowledge is readable by all authenticated users
alter table public.medical_knowledge enable row level security;

create policy "medical_knowledge: authenticated read"
  on public.medical_knowledge for select
  to authenticated
  using (true);

create policy "medical_knowledge: service write"
  on public.medical_knowledge for all
  to authenticated
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

-- Allow doctors to also schedule follow-up appointments for their patients
drop policy if exists "appointments: patient insert" on public.appointments;
create policy "appointments: participant insert"
  on public.appointments for insert
  to authenticated
  with check (auth.uid() = patient_id or auth.uid() = doctor_id);

-- Allow doctors to delete/cancel appointments
grant delete on public.appointments to authenticated;

-- Allow deleting medical reports by owner
create policy "medical_reports: patient delete"
  on public.medical_reports for delete
  to authenticated
  using (auth.uid() = patient_id);

-- Allow doctor to upload medical report for patient during consultation
create policy "medical_reports: doctor insert"
  on public.medical_reports for insert
  to authenticated
  with check (public.is_my_patient(patient_id));

-- Allow updating reminders (e.g. status='taken' or status='missed')
create policy "reminders: patient update"
  on public.reminders for update
  to authenticated
  using (auth.uid() = patient_id)
  with check (auth.uid() = patient_id);

-- ─────────────────────────────────────────────────────────────
-- 6. GRANTS
-- ─────────────────────────────────────────────────────────────
grant select on public.medical_knowledge to authenticated, anon;
grant insert, update, delete on public.medical_knowledge to authenticated;
grant execute on function public.match_medical_knowledge to authenticated, anon;
grant execute on function public.match_patient_reports to authenticated;

-- ─────────────────────────────────────────────────────────────
-- 7. SEED INITIAL CLINICAL KNOWLEDGE CHUNKS
-- ─────────────────────────────────────────────────────────────
insert into public.medical_knowledge (title, category, content, tags)
values
(
  'First-Line Hypertension Pharmacotherapy Guidelines',
  'cardiology',
  'First-line pharmacological agents for essential hypertension include ACE inhibitors (e.g., Lisinopril 10-40mg daily), ARBs (e.g., Losartan 50-100mg daily), Thiazide diuretics (e.g., Hydrochlorothiazide 12.5-25mg daily), and Dihydropyridine Calcium Channel Blockers (e.g., Amlodipine 5-10mg daily). Avoid combining ACE inhibitors and ARBs concurrently due to hyperkalemia and acute renal impairment risk.',
  array['hypertension', 'blood_pressure', 'ace_inhibitors', 'cardiology']
),
(
  'Type 2 Diabetes Mellitus Glycemic Management',
  'endocrinology',
  'Metformin is the first-line medication for type 2 diabetes in the absence of severe renal impairment (eGFR < 30 mL/min). Standard titration starts at 500mg daily with meals, increasing to 1000mg twice daily. For patients with established atherosclerotic cardiovascular disease or chronic kidney disease, prioritize SGLT2 inhibitors (e.g., Empagliflozin) or GLP-1 receptor agonists.',
  array['diabetes', 'metformin', 'endocrinology', 'glycemic_control']
),
(
  'Common Antibiotic Selection & Beta-Lactam Allergy Protocols',
  'pharmacology',
  'For uncomplicated bacterial respiratory infections, Amoxicillin or Amoxicillin-Clavulanate is preferred. In verified IgE-mediated penicillin/beta-lactam allergy, avoid penicillins, cephalosporins, and carbapenems; consider Azithromycin, Doxycycline, or Levofloxacin depending on pathogen sensitivity and local resistance.',
  array['antibiotics', 'penicillin_allergy', 'amoxicillin', 'infections']
),
(
  'Acute Bronchial Asthma Exacerbation Management',
  'pulmonology',
  'First-line emergency relief consists of inhaled short-acting beta-2 agonists (SABA: Albuterol/Salbutamol 2.5mg nebulized or 4-8 puffs via MDI with spacer) combined with Ipratropium bromide. Initiate systemic oral corticosteroids (Prednisolone 40-50mg daily for 5 days) early in moderate-to-severe episodes.',
  array['asthma', 'albuterol', 'corticosteroids', 'pulmonology']
),
(
  'Non-Steroidal Anti-Inflammatory Drugs (NSAIDs) Contraindications',
  'pharmacology',
  'NSAIDs (Ibuprofen, Naproxen, Ketorolac, Celecoxib) are contraindicated in patients with active peptic ulcer disease, severe heart failure, chronic kidney disease (stage 4-5), and third-trimester pregnancy. Caution in asthmatic patients due to risk of aspirin-exacerbated respiratory disease (AERD). Acetaminophen/Paracetamol is preferred for mild-to-moderate analgesia in renal/GI compromised patients.',
  array['nsaids', 'ibuprofen', 'contraindications', 'peptic_ulcer', 'analgesia']
)
on conflict do nothing;
