-- Add gha_cron and vercel_cron to trigger_source_type enum.
-- gha_cron: GitHub Actions cron scheduler (primary scheduler since p0kr).
-- vercel_cron: Vercel Cron (kept for historical row compatibility).
ALTER TYPE public.trigger_source_type ADD VALUE IF NOT EXISTS 'gha_cron';
ALTER TYPE public.trigger_source_type ADD VALUE IF NOT EXISTS 'vercel_cron';
