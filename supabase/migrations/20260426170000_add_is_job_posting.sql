-- Adds is_job_posting boolean to discovered_jobs.
-- NULL for rows scored before this column existed (signal: unknown).
-- Going forward: TRUE if Claude classified as a real job posting,
-- FALSE for career pages / articles / expired listings / landing pages.
-- Used by /api/admin/pipeline-eval to compute Validity Rate vs Relevance Rate.
ALTER TABLE discovered_jobs ADD COLUMN is_job_posting BOOLEAN;

-- Partial index for the validity-rate query (scored AND not null).
-- discovered_jobs gets ~50-200 rows/day; this stays small.
CREATE INDEX IF NOT EXISTS idx_discovered_jobs_validity
  ON discovered_jobs (user_id, scored, is_job_posting)
  WHERE scored = true AND is_job_posting IS NOT NULL;
