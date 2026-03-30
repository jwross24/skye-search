-- Add raw_description to jobs table.
-- When jobs are promoted from discovered_jobs (via the scoring pipeline),
-- the raw description should be carried over so the cover letter handler
-- can use it for context. Seed jobs will have NULL here.

ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS raw_description text;

COMMENT ON COLUMN public.jobs.raw_description IS 'Full job description text, carried over from discovered_jobs during scoring. NULL for seed/manual jobs.';
