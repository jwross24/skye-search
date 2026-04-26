-- skye-search-llrb: add fetch_description task pipeline tracking columns.
--
-- Adds tracking columns for the fetch_description task pipeline.
-- description_fetched_at is set on EVERY fetch attempt (success or fail) so
-- the score cron and the fetch-description cron can both filter on it
-- without re-attempting forever.
-- description_fetch_attempts caps retries at 3 (matches JOB_MAX_RETRIES in
-- ai-scoring.ts).
ALTER TABLE discovered_jobs
  ADD COLUMN description_fetched_at TIMESTAMPTZ NULL,
  ADD COLUMN description_fetch_attempts INTEGER NOT NULL DEFAULT 0;

-- Backfill: rows that already have a raw_description came from an adapter
-- (Exa, USAJobs, AJO RSS, jobsgcca) that fetched it inline. Mark them as
-- "description fetched" using created_at so the score cron's new
-- description_fetched_at IS NOT NULL filter doesn't accidentally exclude
-- previously-imported rows. Without this, the next score cron run would
-- skip every existing row with a description.
UPDATE discovered_jobs
   SET description_fetched_at = created_at
 WHERE raw_description IS NOT NULL
   AND description_fetched_at IS NULL;

-- Trigger: any future INSERT/UPDATE that sets raw_description without also
-- setting description_fetched_at gets the timestamp auto-stamped. This keeps
-- the existing adapters (exa-search, usajobs-search, ajo-rss, jobsgcca) and
-- their inline-fetched descriptions visible to the score cron without
-- requiring every adapter to be modified. The fetch-description handler
-- always sets description_fetched_at explicitly, so the trigger no-ops there.
CREATE OR REPLACE FUNCTION discovered_jobs_stamp_description_fetched()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.raw_description IS NOT NULL AND NEW.description_fetched_at IS NULL THEN
    NEW.description_fetched_at := COALESCE(NEW.created_at, now());
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_discovered_jobs_stamp_description_fetched
  ON discovered_jobs;
CREATE TRIGGER trg_discovered_jobs_stamp_description_fetched
  BEFORE INSERT OR UPDATE OF raw_description ON discovered_jobs
  FOR EACH ROW
  EXECUTE FUNCTION discovered_jobs_stamp_description_fetched();

-- Partial index for the fetch-description cron's selection query
-- (raw_description IS NULL AND description_fetch_attempts < 3).
CREATE INDEX IF NOT EXISTS idx_discovered_jobs_pending_fetch
  ON discovered_jobs (user_id, description_fetch_attempts)
  WHERE raw_description IS NULL AND description_fetch_attempts < 3;
