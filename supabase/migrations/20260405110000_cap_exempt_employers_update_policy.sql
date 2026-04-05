-- Allow authenticated users to update cap_exempt_employers confidence.
-- This is a shared reference table (not user-scoped). The calibration
-- feedback loop (bead skye-search-7go) downgrades confidence_level when
-- Skye tags a job as wrong_visa. Without this policy, the UPDATE is
-- silently blocked by RLS and the downgrade never persists.

CREATE POLICY "Authenticated users can update cap exempt employers"
  ON public.cap_exempt_employers
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);
