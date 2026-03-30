-- Fix: partial unique index on discovered_job_id prevented ON CONFLICT upserts.
-- The Supabase JS client's .upsert({ onConflict: 'discovered_job_id' }) generates
-- ON CONFLICT (discovered_job_id) which doesn't match a partial index (WHERE ... IS NOT NULL).
-- Making it unconditional allows the scoring pipeline to upsert correctly.

DROP INDEX IF EXISTS idx_jobs_discovered_job_id;
CREATE UNIQUE INDEX idx_jobs_discovered_job_id ON jobs (discovered_job_id);
