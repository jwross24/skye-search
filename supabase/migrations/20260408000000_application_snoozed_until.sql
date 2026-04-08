-- Stalled Application Nudges (bead ul3)
-- snoozed_until: hides nudge for N days after user snoozes
ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS snoozed_until date;

-- Add 'ghosted' to withdrawal_reason_type for auto-archive
ALTER TYPE public.withdrawal_reason_type ADD VALUE IF NOT EXISTS 'ghosted';
