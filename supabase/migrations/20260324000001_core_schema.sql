-- Core Database Schema: all tables, enums, views, and RLS policies
-- Immigration tables are APPEND-ONLY and migration-protected.

-- Extensions
create extension if not exists pg_trgm;
create extension if not exists pgcrypto;

-------------------------------------------------------------------
-- ENUMS
-------------------------------------------------------------------

create type public.status_snapshot_type as enum (
  'unemployed', 'employed_postdoc', 'employed_bridge',
  'employed_h1b', 'grace_period', 'CONFLICT'
);

create type public.trigger_source_type as enum (
  'pg_cron', 'manual_backfill', 'keepalive_gha'
);

create type public.cron_status_type as enum (
  'started', 'completed', 'failed'
);

create type public.kanban_status_type as enum (
  'discovered', 'interested', 'tailoring', 'applied',
  'phone_screen', 'interview', 'offer', 'offer_accepted',
  'h1b_filed', 'rejected', 'withdrawn'
);

create type public.visa_path_type as enum (
  'cap_exempt', 'cap_subject', 'opt_compatible', 'canada', 'unknown'
);

create type public.employer_type_type as enum (
  'university', 'nonprofit_research', 'cooperative_institute',
  'government_contractor', 'government_direct', 'private_sector', 'unknown'
);

create type public.cap_exempt_confidence_type as enum (
  'none', 'unverified', 'likely', 'confirmed'
);

create type public.employment_type_type as enum (
  'full_time', 'part_time', 'contract', 'unknown'
);

create type public.source_type_type as enum (
  'industry', 'government', 'academic', 'until_filled'
);

create type public.task_status_type as enum (
  'pending', 'processing', 'completed', 'failed_retry', 'failed_validation'
);

create type public.plan_id_type as enum (
  'plan_a', 'plan_b', 'plan_c', 'plan_d', 'niw'
);

create type public.plan_status_type as enum (
  'not_started', 'active', 'completed', 'cancelled'
);

create type public.initial_days_source_type as enum (
  'dso_confirmed', 'user_reported'
);

create type public.document_status_type as enum (
  'draft', 'pending_review', 'approved', 'exported'
);

create type public.validation_status_type as enum (
  'unvalidated', 'active', 'dead_link', 'timeout', 'closed'
);

create type public.i140_status_type as enum (
  'not_filed', 'filed', 'approved', 'denied'
);

create type public.travel_risk_type as enum (
  'low', 'medium', 'high', 'critical'
);

create type public.rejection_type_type as enum (
  'form_email', 'personalized', 'ghosted'
);

create type public.withdrawal_reason_type as enum (
  'accepted_other', 'not_a_fit', 'immigration', 'timing', 'other'
);

create type public.submission_channel_type as enum (
  'employer_website', 'email', 'referral', 'other'
);

create type public.inbound_email_status_type as enum (
  'unprocessed', 'classified', 'ignored'
);

create type public.deferred_email_status_type as enum (
  'deferred', 'processed'
);

-------------------------------------------------------------------
-- IMMIGRATION TABLES (APPEND-ONLY, NEVER ALTER/DROP COLUMNS)
-------------------------------------------------------------------

create table public.immigration_status (
  user_id uuid primary key references public.users(id) on delete cascade,
  visa_type text,
  opt_expiry date,
  employment_active boolean default false not null,
  employment_active_since timestamptz,
  initial_days_used int not null default 0,
  initial_days_source public.initial_days_source_type,
  calibration_date date,
  -- stem_opt_expired computed at query time: current_date > opt_expiry
  -- Cannot be a STORED generated column because current_date is not immutable
  employment_start_date date,
  employment_end_date date,
  postdoc_end_date date,
  niw_status text,
  niw_priority_date date,
  niw_filing_date date,
  i140_status public.i140_status_type,
  i485_status public.i140_status_type,
  sevis_id_encrypted bytea,
  i140_receipt_number_encrypted bytea,
  grace_period_start_date date,
  visa_stamp_expiry_date date,
  i983_last_updated timestamptz,
  dso_last_report timestamptz,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.immigration_status enable row level security;
create policy "Users can read own immigration status" on public.immigration_status for select using (auth.uid() = user_id);
create policy "Users can insert own immigration status" on public.immigration_status for insert with check (auth.uid() = user_id);
create policy "Users can update own immigration status" on public.immigration_status for update using (auth.uid() = user_id);

create trigger set_immigration_status_updated_at
  before update on public.immigration_status
  for each row execute function public.set_updated_at();

create table public.daily_checkpoint (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  checkpoint_date date not null,
  status_snapshot public.status_snapshot_type not null,
  unemployment_days_used_cumulative int not null,
  trigger_source public.trigger_source_type not null,
  evidence_notes text,
  created_at timestamptz default now() not null,
  unique (user_id, checkpoint_date)
);

create index idx_daily_checkpoint_user_date on public.daily_checkpoint (user_id, checkpoint_date);

alter table public.daily_checkpoint enable row level security;
create policy "Users can read own checkpoints" on public.daily_checkpoint for select using (auth.uid() = user_id);
create policy "Users can insert own checkpoints" on public.daily_checkpoint for insert with check (auth.uid() = user_id);

create table public.cron_execution_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  execution_date date not null,
  status public.cron_status_type not null,
  started_at timestamptz,
  completed_at timestamptz,
  error_message text,
  unemployment_days_used_before int,
  unemployment_days_used_after int,
  employment_active_at_check boolean,
  trigger_source public.trigger_source_type not null,
  unique (user_id, execution_date)
);

alter table public.cron_execution_log enable row level security;
create policy "Users can read own cron logs" on public.cron_execution_log for select using (auth.uid() = user_id);
create policy "Users can insert own cron logs" on public.cron_execution_log for insert with check (auth.uid() = user_id);

create table public.checkpoint_corrections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  checkpoint_date date not null,
  original_status text not null,
  corrected_status text not null,
  trigger_source text not null,
  created_at timestamptz default now() not null
);

alter table public.checkpoint_corrections enable row level security;
create policy "Users can read own corrections" on public.checkpoint_corrections for select using (auth.uid() = user_id);
create policy "Users can insert own corrections" on public.checkpoint_corrections for insert with check (auth.uid() = user_id);

-- ImmigrationLedger: materialized view grouping consecutive same-status days
create materialized view public.immigration_ledger as
  with numbered as (
    select
      id, user_id, checkpoint_date, status_snapshot,
      checkpoint_date - (row_number() over (
        partition by user_id, status_snapshot order by checkpoint_date
      ))::int as grp
    from public.daily_checkpoint
  )
  select
    gen_random_uuid() as id,
    user_id,
    status_snapshot as status_type,
    min(checkpoint_date) as start_date,
    max(checkpoint_date) as end_date,
    null::text as employer_name,
    null::text as evidence_notes,
    false as dso_confirmed
  from numbered
  group by user_id, status_snapshot, grp
  order by min(checkpoint_date);

create unique index idx_immigration_ledger_id on public.immigration_ledger (id);

-- immigration_clock view: conservative counting
create view public.immigration_clock as
  with expected as (
    select
      is2.user_id,
      generate_series(
        is2.postdoc_end_date + 1,
        (now() at time zone 'America/New_York')::date,
        '1 day'
      )::date as d
    from public.immigration_status is2
    where is2.postdoc_end_date is not null
  ),
  joined as (
    select
      e.user_id, e.d,
      dc.status_snapshot,
      case
        when dc.status_snapshot is null then 'gap'
        when dc.status_snapshot = 'unemployed' then 'unemployed'
        when dc.status_snapshot in ('employed_postdoc', 'employed_bridge', 'employed_h1b') then 'employed'
        when dc.status_snapshot = 'grace_period' then 'grace_period'
        else 'unemployed'
      end as effective_status
    from expected e
    left join public.daily_checkpoint dc
      on dc.user_id = e.user_id and dc.checkpoint_date = e.d
  )
  select
    j.user_id,
    (select initial_days_used from public.immigration_status is3 where is3.user_id = j.user_id)
      + count(*) filter (where effective_status in ('unemployed', 'gap')) as days_used_conservative,
    count(*) filter (where effective_status = 'unemployed') as days_used_confirmed,
    count(*) filter (where effective_status = 'gap') as gap_days,
    150 - (select initial_days_used from public.immigration_status is3 where is3.user_id = j.user_id)
      - count(*) filter (where effective_status in ('unemployed', 'gap')) as days_remaining
  from joined j
  group by j.user_id;

-------------------------------------------------------------------
-- JOB TABLES
-------------------------------------------------------------------

create table public.discovered_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  source text,
  url text,
  title text,
  company text,
  raw_description text,
  canonical_url text,
  normalized_company text,
  indexed_date timestamptz default now(),
  source_type public.source_type_type,
  scored boolean default false,
  validation_status public.validation_status_type default 'unvalidated',
  structured_deadline date,
  structured_salary text,
  structured_location text,
  created_at timestamptz default now() not null
);

alter table public.discovered_jobs enable row level security;
create policy "Users can manage own discovered jobs" on public.discovered_jobs for all using (auth.uid() = user_id);

create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  source text,
  url text,
  title text,
  company text,
  company_domain text,
  company_logo text,
  salary text,
  location text,
  remote_status text,
  visa_path public.visa_path_type default 'unknown',
  employer_type public.employer_type_type default 'unknown',
  cap_exempt_confidence public.cap_exempt_confidence_type default 'none',
  employment_type public.employment_type_type default 'unknown',
  source_type public.source_type_type,
  h1b_sponsor_count int,
  skills_required text[] default '{}',
  skills_academic_equiv text[] default '{}',
  match_score float,
  urgency_score float,
  why_fits text,
  application_complexity text,
  indexed_date timestamptz default now(),
  application_deadline date,
  deadline_source text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.jobs enable row level security;
create policy "Users can manage own jobs" on public.jobs for all using (auth.uid() = user_id);

create trigger set_jobs_updated_at
  before update on public.jobs
  for each row execute function public.set_updated_at();

-------------------------------------------------------------------
-- APPLICATION TRACKING
-------------------------------------------------------------------

create table public.applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  job_id uuid references public.jobs(id) on delete set null,
  kanban_status public.kanban_status_type default 'interested',
  contacts jsonb default '[]'::jsonb,
  notes text,
  documents_used uuid[] default '{}',
  tailored_resume_url text,
  tailored_cover_letter_url text,
  applied_date date,
  phone_screen_date date,
  interview_date date,
  offer_date date,
  offer_accepted_date date,
  start_date date,
  rejected_date date,
  withdrawn_date date,
  rejection_type public.rejection_type_type,
  withdrawal_reason public.withdrawal_reason_type,
  submission_channel public.submission_channel_type,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.applications enable row level security;
create policy "Users can manage own applications" on public.applications for all using (auth.uid() = user_id);

create trigger set_applications_updated_at
  before update on public.applications
  for each row execute function public.set_updated_at();

create table public.votes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  job_id uuid not null references public.jobs(id) on delete cascade,
  decision text not null,
  tags text[] default '{}',
  created_at timestamptz default now() not null
);

alter table public.votes enable row level security;
create policy "Users can manage own votes" on public.votes for all using (auth.uid() = user_id);

-------------------------------------------------------------------
-- PROFILE & SKILLS
-------------------------------------------------------------------

create table public.skills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  category text,
  proficiency text,
  learning_status text,
  resources text[] default '{}',
  industry_equivalent text,
  created_at timestamptz default now() not null
);

alter table public.skills enable row level security;
create policy "Users can manage own skills" on public.skills for all using (auth.uid() = user_id);

create table public.milestones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  type text not null,
  earned_date date not null,
  description text,
  created_at timestamptz default now() not null
);

alter table public.milestones enable row level security;
create policy "Users can manage own milestones" on public.milestones for all using (auth.uid() = user_id);

-------------------------------------------------------------------
-- IMMIGRATION STRATEGY
-------------------------------------------------------------------

create table public.plans (
  id public.plan_id_type not null,
  user_id uuid not null references public.users(id) on delete cascade,
  status public.plan_status_type default 'not_started',
  progress float default 0.0,
  next_action text,
  decision_deadline date,
  notes text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  primary key (id, user_id)
);

alter table public.plans enable row level security;
create policy "Users can manage own plans" on public.plans for all using (auth.uid() = user_id);

create table public.o1a_criteria (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  criterion_name text not null,
  status text default 'not_started',
  evidence jsonb default '[]'::jsonb,
  next_action text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.o1a_criteria enable row level security;
create policy "Users can manage own O-1A criteria" on public.o1a_criteria for all using (auth.uid() = user_id);

-------------------------------------------------------------------
-- NETWORK / CONTACTS
-------------------------------------------------------------------

create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  affiliation text,
  relationship_type text,
  email text,
  phone text,
  canonical_name text,
  last_contacted timestamptz,
  notes text,
  linked_job_ids uuid[] default '{}',
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.contacts enable row level security;
create policy "Users can manage own contacts" on public.contacts for all using (auth.uid() = user_id);

create table public.outreach_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  contact_id uuid not null references public.contacts(id) on delete cascade,
  type text not null,
  event_date timestamptz default now(),
  content_summary text,
  action_items jsonb default '[]'::jsonb,
  created_at timestamptz default now() not null
);

alter table public.outreach_events enable row level security;
create policy "Users can manage own outreach events" on public.outreach_events for all using (auth.uid() = user_id);

-------------------------------------------------------------------
-- DOCUMENTS
-------------------------------------------------------------------

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  type text,
  file_path text,
  parent_job_id uuid references public.jobs(id) on delete set null,
  version int default 1,
  version_tag text,
  is_master boolean default false,
  status public.document_status_type default 'draft',
  structured_data_json jsonb,
  content_md text,
  template_tags_json jsonb,
  master_document_id uuid references public.documents(id) on delete set null,
  previous_version_id uuid references public.documents(id) on delete set null,
  generation_source text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.documents enable row level security;
create policy "Users can manage own documents" on public.documents for all using (auth.uid() = user_id);

-------------------------------------------------------------------
-- TASK QUEUE & MONITORING
-------------------------------------------------------------------

create table public.task_queue (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  task_type text not null,
  status public.task_status_type default 'pending',
  payload_json jsonb,
  error_log text,
  retry_count int default 0,
  max_retries int default 3,
  next_retry_at timestamptz,
  dead_lettered_at timestamptz,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.task_queue enable row level security;
create policy "Users can manage own tasks" on public.task_queue for all using (auth.uid() = user_id);

create table public.api_usage_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  model text not null,
  input_tokens int not null,
  output_tokens int not null,
  estimated_cost_cents int not null,
  task_type text,
  created_at timestamptz default now() not null
);

alter table public.api_usage_log enable row level security;
create policy "Users can read own API usage" on public.api_usage_log for select using (auth.uid() = user_id);
create policy "Users can insert own API usage" on public.api_usage_log for insert with check (auth.uid() = user_id);

create table public.weekly_activity_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  week_start date not null,
  week_end date not null,
  jobs_reviewed_count int default 0,
  applications_submitted_count int default 0,
  networking_outreach_count int default 0,
  skills_activity boolean default false,
  interview_prep_count int default 0,
  tailoring_sessions_count int default 0,
  notable_event_types text[],
  summary_text text,
  created_at timestamptz default now() not null
);

alter table public.weekly_activity_log enable row level security;
create policy "Users can manage own activity logs" on public.weekly_activity_log for all using (auth.uid() = user_id);

-------------------------------------------------------------------
-- TRAVEL & CPT
-------------------------------------------------------------------

create table public.travel_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  departure_date date not null,
  return_date date,
  was_employed boolean,
  risk_level public.travel_risk_type,
  notes text,
  created_at timestamptz default now() not null
);

alter table public.travel_log enable row level security;
create policy "Users can manage own travel log" on public.travel_log for all using (auth.uid() = user_id);

create table public.canada_crs (
  user_id uuid primary key references public.users(id) on delete cascade,
  estimated_score int,
  draw_history jsonb default '[]'::jsonb,
  eligible_streams text[] default '{}',
  updated_at timestamptz default now() not null
);

alter table public.canada_crs enable row level security;
create policy "Users can manage own CRS data" on public.canada_crs for all using (auth.uid() = user_id);

-------------------------------------------------------------------
-- GLOBAL TABLES (different RLS)
-------------------------------------------------------------------

create table public.cap_exempt_employers (
  id uuid primary key default gen_random_uuid(),
  employer_name text not null,
  employer_domain text,
  aliases text[] default '{}',
  parent_org text,
  cap_exempt_basis text,
  confidence_level public.cap_exempt_confidence_type default 'unverified',
  verification_date date,
  source_url text,
  created_at timestamptz default now() not null
);

alter table public.cap_exempt_employers enable row level security;
create policy "Authenticated users can read cap exempt employers" on public.cap_exempt_employers for select to authenticated using (true);

create table public.cap_exempt_overrides (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  employer_name text not null,
  user_classification text,
  override_reason text,
  created_at timestamptz default now() not null
);

alter table public.cap_exempt_overrides enable row level security;
create policy "Users can manage own overrides" on public.cap_exempt_overrides for all using (auth.uid() = user_id);

create table public.e_verify_employers (
  employer_name text not null,
  ein text,
  enrollment_date date,
  ingested_at timestamptz default now() not null
);

alter table public.e_verify_employers enable row level security;
create policy "Authenticated users can read e-verify data" on public.e_verify_employers for select to authenticated using (true);

create table public.visa_bulletin (
  id uuid primary key default gen_random_uuid(),
  bulletin_month date not null,
  eb2_china_final_action date,
  eb2_row_final_action date,
  fetched_at timestamptz default now() not null
);

alter table public.visa_bulletin enable row level security;
create policy "Authenticated users can read visa bulletin" on public.visa_bulletin for select to authenticated using (true);

-------------------------------------------------------------------
-- EMAIL
-------------------------------------------------------------------

create table public.raw_inbound_email (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  sender text,
  subject text,
  body_text text,
  attachments_json jsonb,
  status public.inbound_email_status_type default 'unprocessed',
  created_at timestamptz default now() not null
);

alter table public.raw_inbound_email enable row level security;
create policy "Users can manage own emails" on public.raw_inbound_email for all using (auth.uid() = user_id);

create table public.deferred_email (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  raw_email_json jsonb,
  process_after timestamptz,
  status public.deferred_email_status_type default 'deferred',
  created_at timestamptz default now() not null
);

alter table public.deferred_email enable row level security;
create policy "Users can manage own deferred emails" on public.deferred_email for all using (auth.uid() = user_id);
