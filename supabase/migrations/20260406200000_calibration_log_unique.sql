-- Prevent duplicate calibration feedback for the same job in the same week (bead wzcv)
-- Double-click or concurrent request could inflate calibration data.
ALTER TABLE public.calibration_log
  ADD CONSTRAINT calibration_log_user_job_week_unique
  UNIQUE (user_id, job_id, calibration_week);
