-- Weekly urgency calibration log (bead skye-search-7go).
-- Each row = one user feedback event on one job during one calibration week.
-- Used to track feedback for re-scoring logic and to prevent duplicate
-- calibrations of the same job in the same week.

CREATE TABLE IF NOT EXISTS public.calibration_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  feedback_type text NOT NULL CHECK (feedback_type IN ('confirmed', 'too_high')),
  tag text CHECK (tag IN ('wrong_visa', 'stale', 'wrong_field', 'other')),
  calibration_week date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_calibration_log_user_week
  ON public.calibration_log (user_id, calibration_week);

CREATE INDEX IF NOT EXISTS idx_calibration_log_user_job_week
  ON public.calibration_log (user_id, job_id, calibration_week);

ALTER TABLE public.calibration_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own calibration log"
  ON public.calibration_log FOR ALL USING (auth.uid() = user_id);
