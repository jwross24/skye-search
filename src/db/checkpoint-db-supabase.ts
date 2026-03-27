import { createClient } from '@supabase/supabase-js'
import type {
  CheckpointDb,
  ImmigrationStatusRow,
  CheckpointRow,
  ActiveOffer,
  CronLogRow,
} from './unemployment-cron'

/**
 * Create a Supabase client with service_role key for cron operations.
 * Uses @supabase/supabase-js directly (no cookies/SSR needed).
 */
function createCronClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
  )
}

/**
 * Supabase-backed implementation of CheckpointDb.
 * Uses service_role key to bypass RLS — intended for cron/admin operations only.
 */
export function createCheckpointDbSupabase(): CheckpointDb {
  const supabase = createCronClient()

  return {
    async getImmigrationStatus(userId: string): Promise<ImmigrationStatusRow | null> {
      const { data, error } = await supabase
        .from('immigration_status')
        .select('user_id, employment_active, employment_active_since, initial_days_used, postdoc_end_date, opt_expiry, calibration_date')
        .eq('user_id', userId)
        .single()

      if (error || !data) return null

      return {
        user_id: data.user_id,
        employment_active: data.employment_active,
        employment_active_since: data.employment_active_since,
        initial_days_used: data.initial_days_used,
        postdoc_end_date: data.postdoc_end_date,
        opt_expiry: data.opt_expiry,
        calibration_date: data.calibration_date,
      }
    },

    async getAllUserIds(): Promise<string[]> {
      const { data, error } = await supabase
        .from('immigration_status')
        .select('user_id')

      if (error || !data) return []
      return data.map((row) => row.user_id)
    },

    async checkpointExists(userId: string, date: string): Promise<boolean> {
      const { count, error } = await supabase
        .from('daily_checkpoint')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('checkpoint_date', date)

      if (error) return false
      return (count ?? 0) > 0
    },

    async getLastCheckpoint(userId: string, beforeDate: string): Promise<CheckpointRow | null> {
      const { data, error } = await supabase
        .from('daily_checkpoint')
        .select('id, user_id, checkpoint_date, status_snapshot, unemployment_days_used_cumulative, trigger_source, evidence_notes')
        .eq('user_id', userId)
        .lt('checkpoint_date', beforeDate)
        .order('checkpoint_date', { ascending: false })
        .limit(1)
        .single()

      if (error || !data) return null

      return {
        id: data.id,
        user_id: data.user_id,
        checkpoint_date: data.checkpoint_date,
        status_snapshot: data.status_snapshot as CheckpointRow['status_snapshot'],
        unemployment_days_used_cumulative: data.unemployment_days_used_cumulative,
        trigger_source: data.trigger_source as CheckpointRow['trigger_source'],
        evidence_notes: data.evidence_notes,
      }
    },

    async countUnemployedCheckpoints(userId: string, beforeDate: string): Promise<number> {
      const { count, error } = await supabase
        .from('daily_checkpoint')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status_snapshot', 'unemployed')
        .lt('checkpoint_date', beforeDate)

      if (error) return 0
      return count ?? 0
    },

    async getExistingCheckpointDates(
      userId: string,
      afterDate: string,
      beforeDate: string,
    ): Promise<Set<string>> {
      const { data, error } = await supabase
        .from('daily_checkpoint')
        .select('checkpoint_date')
        .eq('user_id', userId)
        .gt('checkpoint_date', afterDate)
        .lt('checkpoint_date', beforeDate)

      if (error || !data) return new Set()
      return new Set(data.map((row) => row.checkpoint_date))
    },

    async getActiveOffer(userId: string, asOfDate: string): Promise<ActiveOffer | null> {
      // Find applications with kanban_status='offer_accepted' that have started
      // and have a linked job with employer info
      const { data, error } = await supabase
        .from('applications')
        .select('job_id, start_date, jobs(employer_type, visa_path)')
        .eq('user_id', userId)
        .eq('kanban_status', 'offer_accepted')
        .not('job_id', 'is', null)
        .not('start_date', 'is', null)
        .lte('start_date', asOfDate)
        .limit(1)
        .single()

      if (error || !data || !data.job_id || !data.start_date) return null

      // Supabase returns joined data as an object (single) or array
      const job = Array.isArray(data.jobs) ? data.jobs[0] : data.jobs
      if (!job) return null

      return {
        job_id: data.job_id,
        employer_type: job.employer_type ?? 'unknown',
        visa_path: job.visa_path ?? 'unknown',
        start_date: data.start_date,
      }
    },

    async insertCheckpoint(row: Omit<CheckpointRow, 'id'>): Promise<void> {
      const { error } = await supabase.from('daily_checkpoint').insert({
        user_id: row.user_id,
        checkpoint_date: row.checkpoint_date,
        status_snapshot: row.status_snapshot,
        unemployment_days_used_cumulative: row.unemployment_days_used_cumulative,
        trigger_source: row.trigger_source,
        evidence_notes: row.evidence_notes,
      })

      if (error) throw new Error(`insertCheckpoint failed: ${error.message}`)
    },

    async insertCronLog(row: Omit<CronLogRow, 'id'>): Promise<string> {
      const { data, error } = await supabase
        .from('cron_execution_log')
        .insert({
          user_id: row.user_id,
          execution_date: row.execution_date,
          status: row.status,
          started_at: row.started_at,
          completed_at: row.completed_at,
          error_message: row.error_message,
          unemployment_days_used_before: row.unemployment_days_used_before,
          unemployment_days_used_after: row.unemployment_days_used_after,
          employment_active_at_check: row.employment_active_at_check,
          trigger_source: row.trigger_source,
        })
        .select('id')
        .single()

      if (error || !data) throw new Error(`insertCronLog failed: ${error?.message}`)
      return data.id
    },

    async updateCronLog(id: string, updates: Partial<CronLogRow>): Promise<void> {
      const { error } = await supabase
        .from('cron_execution_log')
        .update(updates)
        .eq('id', id)

      if (error) throw new Error(`updateCronLog failed: ${error.message}`)
    },

    async refreshLedger(): Promise<void> {
      const { error } = await supabase.rpc('refresh_immigration_ledger')
      // Silently ignore if the RPC doesn't exist (local dev may not have it)
      if (error && !error.message.includes('does not exist') && !error.message.includes('Could not find the function')) {
        throw new Error(`refreshLedger failed: ${error.message}`)
      }
    },
  }
}
