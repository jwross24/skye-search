-- Monthly Employment Confirmation (bead 9wr)
-- Track when user last confirmed their bridge employment is still active.
-- Clock NEVER auto-resumes — over-counting unemployment is legally dangerous.

ALTER TABLE public.immigration_status
  ADD COLUMN IF NOT EXISTS last_employment_confirmed_at timestamptz;

-- Add 'retroactive_end_date' to trigger_source enum for backfill checkpoints
ALTER TYPE public.trigger_source_type ADD VALUE IF NOT EXISTS 'retroactive_end_date';

-- Add 'employment_confirmation' to alert type tracking
-- (using task_queue.task_type text field, no enum change needed)
