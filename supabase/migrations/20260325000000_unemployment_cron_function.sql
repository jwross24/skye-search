-- fn_daily_unemployment_checkpoint: Core plpgsql function for daily unemployment clock.
-- Called by pg_cron at 05:15 UTC daily. Also callable via RPC for manual/testing triggers.
-- SECURITY DEFINER: bypasses RLS since cron has no auth context.

CREATE OR REPLACE FUNCTION public.fn_daily_unemployment_checkpoint(
  p_user_id uuid DEFAULT NULL,
  p_target_date date DEFAULT NULL,
  p_trigger_source public.trigger_source_type DEFAULT 'pg_cron'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_target_date date;
  v_imm record;
  v_prev_checkpoint record;
  v_employment_active boolean;
  v_prev_status public.status_snapshot_type;
  v_new_status public.status_snapshot_type;
  v_cumulative int;
  v_days_before int;
  v_log_id uuid;
  v_gap_dates date[];
  v_offer record;
  v_attempted_status public.status_snapshot_type;
  v_results jsonb := '[]'::jsonb;
  v_user_result jsonb;
BEGIN
  -- Default target_date: "yesterday" in Eastern Time, safe across DST
  v_target_date := COALESCE(
    p_target_date,
    ((NOW() - INTERVAL '2 hours') AT TIME ZONE 'America/New_York')::DATE
  );

  -- Process each user (or single user if p_user_id specified)
  FOR v_imm IN
    SELECT *
    FROM immigration_status
    WHERE (p_user_id IS NULL OR user_id = p_user_id)
  LOOP
    v_user_result := NULL;

    -- Step 0: Idempotency guard
    INSERT INTO daily_checkpoint (user_id, checkpoint_date, status_snapshot,
      unemployment_days_used_cumulative, trigger_source, evidence_notes)
    VALUES (v_imm.user_id, v_target_date, 'unemployed', 0, p_trigger_source, 'placeholder')
    ON CONFLICT (user_id, checkpoint_date) DO NOTHING;

    -- If no row inserted, this date was already processed
    IF NOT FOUND THEN
      v_results := v_results || jsonb_build_object(
        'user_id', v_imm.user_id,
        'target_date', v_target_date,
        'action', 'skip_idempotent',
        'message', 'Checkpoint already exists for this date'
      );
      CONTINUE;
    END IF;

    -- Start cron execution log
    INSERT INTO cron_execution_log (user_id, execution_date, status, started_at, trigger_source)
    VALUES (v_imm.user_id, v_target_date, 'started', NOW(), p_trigger_source)
    ON CONFLICT (user_id, execution_date) DO UPDATE SET
      status = 'started', started_at = NOW(), trigger_source = p_trigger_source
    RETURNING id INTO v_log_id;

    BEGIN  -- inner exception block

      -- Step 1: Gap detection — check for missed days since postdoc end
      IF v_imm.postdoc_end_date IS NOT NULL AND v_target_date > v_imm.postdoc_end_date THEN
        SELECT ARRAY_AGG(d::date ORDER BY d) INTO v_gap_dates
        FROM generate_series(
          GREATEST(v_imm.postdoc_end_date + 1, v_imm.calibration_date + 1),
          v_target_date - 1,
          '1 day'::interval
        ) AS d
        WHERE NOT EXISTS (
          SELECT 1 FROM daily_checkpoint dc
          WHERE dc.user_id = v_imm.user_id AND dc.checkpoint_date = d::date
        );

        IF v_gap_dates IS NOT NULL AND array_length(v_gap_dates, 1) > 0 THEN
          -- Log gap alert but do NOT retroactively insert checkpoints
          INSERT INTO cron_execution_log (user_id, execution_date, status, started_at,
            completed_at, error_message, trigger_source)
          VALUES (v_imm.user_id, v_target_date, 'completed', NOW(), NOW(),
            'GAP_ALERT: missed dates: ' || v_gap_dates::text, p_trigger_source)
          ON CONFLICT (user_id, execution_date) DO UPDATE SET
            error_message = COALESCE(cron_execution_log.error_message, '') ||
              ' GAP_ALERT: missed dates: ' || v_gap_dates::text;
        END IF;
      END IF;

      -- Step 2: Get previous checkpoint status
      SELECT status_snapshot INTO v_prev_status
      FROM daily_checkpoint
      WHERE user_id = v_imm.user_id
        AND checkpoint_date < v_target_date
      ORDER BY checkpoint_date DESC
      LIMIT 1;

      -- If no previous checkpoint and target_date > postdoc_end_date, previous is employed_postdoc
      IF v_prev_status IS NULL THEN
        IF v_imm.postdoc_end_date IS NOT NULL AND v_target_date > v_imm.postdoc_end_date THEN
          v_prev_status := 'employed_postdoc';
        ELSIF v_imm.postdoc_end_date IS NOT NULL AND v_target_date <= v_imm.postdoc_end_date THEN
          v_prev_status := 'employed_postdoc';
        ELSE
          v_prev_status := 'unemployed';
        END IF;
      END IF;

      -- Step 2a: Check employment status
      -- (a) Kanban: offer_accepted at qualifying employer with start_date <= target_date
      SELECT a.*, j.employer_type, j.visa_path INTO v_offer
      FROM applications a
      JOIN jobs j ON j.id = a.job_id
      WHERE a.user_id = v_imm.user_id
        AND a.kanban_status = 'offer_accepted'
        AND a.start_date IS NOT NULL
        AND a.start_date <= v_target_date
      ORDER BY a.start_date DESC
      LIMIT 1;

      -- (b) Manual employment toggle
      v_employment_active := v_imm.employment_active;

      -- Step 3: Resolve status_snapshot via state machine
      IF v_imm.postdoc_end_date IS NOT NULL AND v_target_date <= v_imm.postdoc_end_date THEN
        -- Still in postdoc period
        v_new_status := 'employed_postdoc';
      ELSIF v_offer IS NOT NULL THEN
        -- Has an accepted offer at qualifying employer that has started
        IF v_offer.visa_path = 'cap_exempt' OR v_offer.employer_type IN ('university', 'nonprofit_research', 'cooperative_institute', 'government_contractor') THEN
          v_new_status := 'employed_h1b';
        ELSE
          v_new_status := 'employed_bridge';
        END IF;
      ELSIF v_employment_active THEN
        -- Manual employment toggle ON
        v_new_status := 'employed_bridge';
      ELSIF v_imm.opt_expiry IS NOT NULL AND v_target_date > v_imm.opt_expiry THEN
        -- STEM OPT expired
        v_new_status := 'grace_period';
      ELSE
        -- Not employed, not expired
        v_new_status := 'unemployed';
      END IF;

      -- Step 3a: Validate state machine transition (reject illegal ones)
      v_attempted_status := v_new_status;
      IF v_prev_status IS NOT NULL AND v_new_status != v_prev_status THEN
        -- Check illegal transitions
        IF (v_prev_status = 'grace_period' AND v_new_status = 'employed_bridge') OR
           (v_new_status = 'employed_postdoc' AND v_prev_status != 'employed_postdoc') OR
           (v_prev_status = 'employed_h1b' AND v_new_status = 'employed_bridge') THEN
          -- ILLEGAL transition — log CONFLICT with original attempted status
          v_new_status := 'CONFLICT';

          UPDATE cron_execution_log
          SET error_message = COALESCE(error_message, '') ||
            ' INTEGRITY_ALERT: illegal transition ' || v_prev_status || ' -> ' || v_attempted_status
          WHERE id = v_log_id;
        END IF;
      END IF;

      -- Step 4: Calculate cumulative unemployment days
      v_days_before := v_imm.initial_days_used + COALESCE(
        (SELECT COUNT(*)::int FROM daily_checkpoint
         WHERE user_id = v_imm.user_id
           AND status_snapshot = 'unemployed'
           AND checkpoint_date < v_target_date),
        0
      );

      -- Only increment if status is unemployed AND cumulative < 150
      IF v_new_status = 'unemployed' AND v_days_before < 150 THEN
        v_cumulative := v_days_before + 1;
      ELSE
        v_cumulative := v_days_before;
      END IF;

      -- Update the placeholder checkpoint with real values
      UPDATE daily_checkpoint
      SET status_snapshot = v_new_status,
          unemployment_days_used_cumulative = v_cumulative,
          evidence_notes = CASE
            WHEN v_offer IS NOT NULL THEN 'offer_accepted: ' || COALESCE(v_offer.job_id::text, 'unknown')
            WHEN v_employment_active THEN 'manual_toggle'
            WHEN v_new_status = 'employed_postdoc' THEN 'postdoc_active'
            WHEN v_new_status = 'grace_period' THEN 'opt_expired'
            WHEN v_new_status = 'CONFLICT' THEN 'illegal_transition: ' || v_prev_status || ' -> ' || v_attempted_status
            ELSE NULL
          END
      WHERE user_id = v_imm.user_id AND checkpoint_date = v_target_date;

      -- Step 6: CRITICAL alert at exactly 150
      IF v_cumulative >= 150 AND v_days_before < 150 THEN
        -- Record the CRITICAL alert in cron log
        UPDATE cron_execution_log
        SET error_message = COALESCE(error_message, '') ||
          ' CRITICAL: unemployment days reached 150'
        WHERE id = v_log_id;
      END IF;

      -- Step 7: Update cron execution log with completed status
      UPDATE cron_execution_log
      SET status = 'completed',
          completed_at = NOW(),
          unemployment_days_used_before = v_days_before,
          unemployment_days_used_after = v_cumulative,
          employment_active_at_check = v_employment_active
      WHERE id = v_log_id;

      v_user_result := jsonb_build_object(
        'user_id', v_imm.user_id,
        'target_date', v_target_date,
        'action', 'checkpoint_created',
        'status_snapshot', v_new_status,
        'cumulative', v_cumulative,
        'days_before', v_days_before,
        'employment_active', v_employment_active,
        'gap_dates', COALESCE(to_jsonb(v_gap_dates), '[]'::jsonb)
      );

    EXCEPTION WHEN OTHERS THEN
      -- Log failure
      UPDATE cron_execution_log
      SET status = 'failed',
          completed_at = NOW(),
          error_message = SQLERRM
      WHERE id = v_log_id;

      v_user_result := jsonb_build_object(
        'user_id', v_imm.user_id,
        'target_date', v_target_date,
        'action', 'error',
        'error', SQLERRM
      );
    END;

    v_results := v_results || COALESCE(v_user_result, '{}'::jsonb);
  END LOOP;

  -- Step 5: Refresh materialized view once after all users processed
  IF jsonb_array_length(v_results) > 0 THEN
    REFRESH MATERIALIZED VIEW CONCURRENTLY immigration_ledger;
  END IF;

  RETURN v_results;
END;
$$;

-- Grant execute to service_role (for RPC calls from Next.js)
GRANT EXECUTE ON FUNCTION public.fn_daily_unemployment_checkpoint(uuid, date, public.trigger_source_type) TO service_role;

-- pg_cron schedule (requires pg_cron extension enabled in Supabase Dashboard)
-- Run this manually in Supabase SQL Editor after enabling pg_cron:
--
-- SELECT cron.schedule(
--   'daily-unemployment-checkpoint',
--   '15 5 * * *',  -- 05:15 UTC daily
--   $$SELECT public.fn_daily_unemployment_checkpoint()$$
-- );
