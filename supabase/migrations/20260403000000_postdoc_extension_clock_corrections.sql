-- PostDoc Extension: Update immigration_clock view to respect checkpoint_corrections
-- Bead: skye-search-ax3
--
-- When a postdoc is extended, previously-logged unemployed days are corrected
-- via INSERT into checkpoint_corrections (append-only — original checkpoints untouched).
-- This view now LEFT JOINs against corrections and uses corrected_status when present.

CREATE OR REPLACE VIEW public.immigration_clock AS
  WITH expected AS (
    SELECT
      is2.user_id,
      generate_series(
        is2.postdoc_end_date + 1,
        (now() AT TIME ZONE 'America/New_York')::date,
        '1 day'
      )::date AS d
    FROM public.immigration_status is2
    WHERE is2.postdoc_end_date IS NOT NULL
  ),
  joined AS (
    SELECT
      e.user_id, e.d,
      CASE
        WHEN dc.status_snapshot IS NULL AND cc.corrected_status IS NULL THEN 'gap'
        WHEN COALESCE(cc.corrected_status, dc.status_snapshot::text) = 'unemployed' THEN 'unemployed'
        WHEN COALESCE(cc.corrected_status, dc.status_snapshot::text) IN ('employed_postdoc', 'employed_bridge', 'employed_h1b') THEN 'employed'
        WHEN COALESCE(cc.corrected_status, dc.status_snapshot::text) = 'grace_period' THEN 'grace_period'
        ELSE 'unemployed'
      END AS effective_status
    FROM expected e
    LEFT JOIN public.daily_checkpoint dc
      ON dc.user_id = e.user_id AND dc.checkpoint_date = e.d
    LEFT JOIN LATERAL (
      SELECT cc2.corrected_status
      FROM public.checkpoint_corrections cc2
      WHERE cc2.user_id = e.user_id AND cc2.checkpoint_date = e.d
      ORDER BY cc2.created_at DESC
      LIMIT 1
    ) cc ON true
  )
  SELECT
    j.user_id,
    (SELECT initial_days_used FROM public.immigration_status is3 WHERE is3.user_id = j.user_id)
      + count(*) FILTER (WHERE effective_status IN ('unemployed', 'gap')) AS days_used_conservative,
    count(*) FILTER (WHERE effective_status = 'unemployed') AS days_used_confirmed,
    count(*) FILTER (WHERE effective_status = 'gap') AS gap_days,
    150 - (SELECT initial_days_used FROM public.immigration_status is3 WHERE is3.user_id = j.user_id)
      - count(*) FILTER (WHERE effective_status IN ('unemployed', 'gap')) AS days_remaining
  FROM joined j
  GROUP BY j.user_id;
