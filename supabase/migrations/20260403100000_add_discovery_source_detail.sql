-- Add discovery_source_detail to discovered_jobs for per-query eval traceability.
-- Bead: skye-search-rdvf
-- Stores the specific query string or seed URL that produced each result.

ALTER TABLE public.discovered_jobs
  ADD COLUMN IF NOT EXISTS discovery_source_detail text;
