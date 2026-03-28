-- Budget guard infrastructure: spend views + default caps.
-- Used by checkBudget() to enforce daily/weekly API spend limits.

-- Daily spend aggregation (ET timezone for consistent day boundaries)
create or replace view public.daily_spend as
  select
    user_id,
    (created_at at time zone 'America/New_York')::date as spend_date,
    sum(estimated_cost_cents) as total_cents,
    count(*) as api_call_count
  from public.api_usage_log
  group by user_id, (created_at at time zone 'America/New_York')::date;

-- Weekly spend aggregation (rolling 7 days, ET-anchored boundaries)
create or replace view public.weekly_spend as
  select
    user_id,
    sum(estimated_cost_cents) as total_cents,
    count(*) as api_call_count
  from public.api_usage_log
  where created_at >= (((now() at time zone 'America/New_York')::date - interval '6 days')
                       at time zone 'America/New_York')
  group by user_id;

-- Seed default budget caps for existing users (idempotent via jsonb_set)
update public.users
set user_preferences = jsonb_set(
  coalesce(user_preferences, '{}'::jsonb),
  '{budget}',
  '{"daily_cap_cents": 300, "weekly_soft_cap_cents": 1200, "weekly_alert_threshold_cents": 800, "pause_buffer_cents": 50}'::jsonb
)
where user_preferences is null
   or user_preferences->'budget' is null;
