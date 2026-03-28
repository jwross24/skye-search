-- AI Scoring Pipeline: add columns for Claude scoring output + discovered_jobs index
--
-- New columns on jobs:
--   requires_security_clearance, requires_citizenship — ineligibility flags
--   discovered_job_id — FK provenance link to source discovered_job
--   hiring_timeline_estimate — time-to-offer heuristic from Claude
--
-- Index on discovered_jobs for efficient unscored batch queries.

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS requires_security_clearance boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS requires_citizenship boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS discovered_job_id uuid REFERENCES public.discovered_jobs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS hiring_timeline_estimate text;

CREATE INDEX IF NOT EXISTS idx_discovered_jobs_unscored
  ON public.discovered_jobs(scored, created_at)
  WHERE scored = false;

-- Prevent duplicate jobs from retry: one jobs row per discovered_job
CREATE UNIQUE INDEX IF NOT EXISTS idx_jobs_discovered_job_id
  ON public.jobs(discovered_job_id)
  WHERE discovered_job_id IS NOT NULL;
