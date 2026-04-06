-- Link Validation Cron (bead 464)
-- Add tracking columns for link validation lifecycle

-- last_validated_at: tracks when each discovered job was last validated
ALTER TABLE public.discovered_jobs
  ADD COLUMN IF NOT EXISTS last_validated_at timestamptz;

-- content_hash: SHA-256 of first 500 chars of fetched page text content, for change detection
ALTER TABLE public.discovered_jobs
  ADD COLUMN IF NOT EXISTS content_hash text;

-- Index for cron query: find stale/unvalidated jobs efficiently
CREATE INDEX IF NOT EXISTS idx_discovered_jobs_validation
  ON public.discovered_jobs (validation_status, last_validated_at);
