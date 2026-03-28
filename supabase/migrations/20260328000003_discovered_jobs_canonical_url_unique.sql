-- Add unique constraint on canonical_url for upsert dedup in Exa pipeline.
-- Prevents duplicate jobs when the same URL is discovered across multiple search queries.

create unique index if not exists idx_discovered_jobs_canonical_url
  on public.discovered_jobs (canonical_url);
