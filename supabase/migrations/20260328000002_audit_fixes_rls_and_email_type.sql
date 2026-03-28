-- Audit fix #8: Add missing UPDATE/DELETE RLS policies for daily_checkpoint and cron_execution_log.
-- Currently SELECT + INSERT only. Cron uses service_role (bypasses RLS), but user-facing
-- correction code would silently fail without these policies.

create policy "Users can update own checkpoints"
  on public.daily_checkpoint for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own checkpoints"
  on public.daily_checkpoint for delete
  using (auth.uid() = user_id);

create policy "Users can update own cron logs"
  on public.cron_execution_log for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own cron logs"
  on public.cron_execution_log for delete
  using (auth.uid() = user_id);

-- Audit fix #9: Add classification_type column to raw_inbound_email.
-- The classifyEmail action accepts job_alert vs application_update but collapses both
-- to 'classified' status. This column preserves the specific type for Phase 1b routing.

create type public.email_classification_type as enum (
  'job_alert', 'application_update'
);

alter table public.raw_inbound_email
  add column classification_type public.email_classification_type;

comment on column public.raw_inbound_email.classification_type is
  'Specific classification type. NULL for unprocessed/ignored emails.';
