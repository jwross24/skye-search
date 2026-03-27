import { createClient } from '@supabase/supabase-js'
import { sendEmail } from './resend'
import { UnemploymentDigest } from './email-templates/templates/unemployment-digest'
import { DeadlineAlert } from './email-templates/templates/deadline-alert'
import { CronFailureAlert } from './email-templates/templates/cron-failure'

// ─── Types ──────────────────────────────────────────────────────────────────

export type AlertType = 'unemployment_digest' | 'deadline_72h' | 'cron_failure'

export interface AlertResult {
  userId: string
  alertType: AlertType
  sent: boolean
  reason?: string
  messageId?: string
}

interface DeadlineJob {
  title: string
  company: string
  visaPath: string
  location?: string
  url?: string
  daysLeft: number
  deadline: string
}

// ─── Break Mode ─────────────────────────────────────────────────────────────

/**
 * Check if an alert should be suppressed by break mode.
 * Critical alerts bypass break mode:
 *   - unemployment_digest when <15 days remaining
 *   - deadline_72h (always bypasses)
 *   - cron_failure (always bypasses — developer alert)
 */
export function shouldSuppressForBreakMode(
  breakModeUntil: string | null,
  alertType: AlertType,
  daysRemaining?: number,
): boolean {
  if (!breakModeUntil) return false

  const now = new Date()
  const breakEnd = new Date(breakModeUntil)
  if (now >= breakEnd) return false // Break mode expired

  // Critical alerts bypass break mode
  if (alertType === 'cron_failure') return false
  if (alertType === 'deadline_72h') return false
  if (alertType === 'unemployment_digest' && daysRemaining !== undefined && daysRemaining <= 15) {
    return false
  }

  return true // Non-critical alert during break mode → suppress
}

// ─── Supabase Client ────────────────────────────────────────────────────────

function createAlertClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
  )
}

// ─── Alert Checks ───────────────────────────────────────────────────────────

/**
 * Check all alert conditions for a user and send appropriate emails.
 * Returns array of alert results (sent or suppressed).
 */
export async function checkAndSendAlerts(
  userId: string,
  userEmail: string,
  today: string,
): Promise<AlertResult[]> {
  const supabase = createAlertClient()
  const results: AlertResult[] = []

  // ─── Get user's break mode status ──────────────────────────────────────
  const { data: userRow } = await supabase
    .from('users')
    .select('break_mode_until')
    .eq('id', userId)
    .single()

  const breakModeUntil = userRow?.break_mode_until ?? null

  // ─── Check 1: Unemployment digest (<30 days remaining, weekly) ─────────
  const unemploymentResult = await checkUnemploymentDigest(
    supabase, userId, userEmail, today, breakModeUntil,
  )
  if (unemploymentResult) results.push(unemploymentResult)

  // ─── Check 2: Deadline alerts (72 hours — always bypass break mode) ────
  const deadlineResult = await checkDeadlineAlerts(
    supabase, userId, userEmail, today,
  )
  if (deadlineResult) results.push(deadlineResult)

  // ─── Check 3: Cron failure (developer alert — always bypass break mode)
  const cronResult = await checkCronFailure(
    supabase, userId, today,
  )
  if (cronResult) results.push(cronResult)

  return results
}

async function checkUnemploymentDigest(
  supabase: ReturnType<typeof createAlertClient>,
  userId: string,
  userEmail: string,
  today: string,
  breakModeUntil: string | null,
): Promise<AlertResult | null> {
  // Get immigration status
  const { data: immRow } = await supabase
    .from('immigration_status')
    .select('initial_days_used')
    .eq('user_id', userId)
    .single()

  if (!immRow) return null

  // Count unemployment days from checkpoints
  const { count: unemployedCount } = await supabase
    .from('daily_checkpoint')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status_snapshot', 'unemployed')

  const totalUsed = immRow.initial_days_used + (unemployedCount ?? 0)
  const daysRemaining = 150 - totalUsed

  // Only alert when <30 days remaining
  if (daysRemaining >= 30) return null

  // Break mode check
  if (shouldSuppressForBreakMode(breakModeUntil, 'unemployment_digest', daysRemaining)) {
    return { userId, alertType: 'unemployment_digest', sent: false, reason: 'break_mode' }
  }

  // Get this week's stats (last 7 days)
  const weekAgo = new Date(today)
  weekAgo.setDate(weekAgo.getDate() - 7)
  const weekAgoStr = weekAgo.toISOString().split('T')[0]

  const { data: weekCheckpoints } = await supabase
    .from('daily_checkpoint')
    .select('status_snapshot')
    .eq('user_id', userId)
    .gte('checkpoint_date', weekAgoStr)
    .lte('checkpoint_date', today)

  const daysUsedThisWeek = (weekCheckpoints ?? []).filter(
    (c) => c.status_snapshot === 'unemployed',
  ).length
  const employedDaysThisWeek = (weekCheckpoints ?? []).filter(
    (c) => c.status_snapshot !== 'unemployed' && c.status_snapshot !== 'CONFLICT',
  ).length

  // Count gap days this week (days with no checkpoint)
  const checkpointDays = (weekCheckpoints ?? []).length
  const expectedDays = 7
  const gapDays = Math.max(0, expectedDays - checkpointDays)

  const idempotencyKey = `unemployment-digest/${userId}/${today}`

  try {
    const { id } = await sendEmail({
      to: userEmail,
      subject: `${daysRemaining} unemployment days remaining`,
      react: UnemploymentDigest({
        daysRemaining,
        totalDays: 150,
        daysUsedThisWeek,
        employedDaysThisWeek,
        gapDays,
      }),
      idempotencyKey,
    })

    return { userId, alertType: 'unemployment_digest', sent: true, messageId: id }
  } catch (err) {
    return {
      userId,
      alertType: 'unemployment_digest',
      sent: false,
      reason: err instanceof Error ? err.message : String(err),
    }
  }
}

async function checkDeadlineAlerts(
  supabase: ReturnType<typeof createAlertClient>,
  userId: string,
  userEmail: string,
  today: string,
): Promise<AlertResult | null> {
  // Find jobs with deadlines within 72 hours that haven't been voted on
  const threeDaysOut = new Date(today)
  threeDaysOut.setDate(threeDaysOut.getDate() + 3)
  const threeDaysStr = threeDaysOut.toISOString().split('T')[0]

  const { data: jobRows } = await supabase
    .from('jobs')
    .select('id, title, company, visa_path, location, url, application_deadline')
    .eq('user_id', userId)
    .gte('application_deadline', today)
    .lte('application_deadline', threeDaysStr)

  if (!jobRows || jobRows.length === 0) return null

  // Filter out jobs already voted on or applied to
  const { data: votedRows } = await supabase
    .from('votes')
    .select('job_id')
    .eq('user_id', userId)

  const { data: appRows } = await supabase
    .from('applications')
    .select('job_id')
    .eq('user_id', userId)

  const excludedIds = new Set([
    ...(votedRows ?? []).map((v) => v.job_id),
    ...(appRows ?? []).map((a) => a.job_id).filter(Boolean),
  ])

  const urgentJobs: DeadlineJob[] = jobRows
    .filter((j) => !excludedIds.has(j.id))
    .map((j) => {
      const deadlineDate = new Date(j.application_deadline + 'T00:00:00Z')
      const todayDate = new Date(today + 'T00:00:00Z')
      const daysLeft = Math.ceil(
        (deadlineDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24),
      )
      return {
        title: j.title ?? '',
        company: j.company ?? '',
        visaPath: j.visa_path ?? 'unknown',
        location: j.location ?? undefined,
        url: j.url ?? undefined,
        daysLeft,
        deadline: deadlineDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      }
    })

  if (urgentJobs.length === 0) return null

  const idempotencyKey = `deadline-72h/${userId}/${today}`

  try {
    const { id } = await sendEmail({
      to: userEmail,
      subject: `${urgentJobs.length} application ${urgentJobs.length === 1 ? 'deadline closes' : 'deadlines close'} soon`,
      react: DeadlineAlert({ jobs: urgentJobs }),
      idempotencyKey,
    })

    return { userId, alertType: 'deadline_72h', sent: true, messageId: id }
  } catch (err) {
    return {
      userId,
      alertType: 'deadline_72h',
      sent: false,
      reason: err instanceof Error ? err.message : String(err),
    }
  }
}

async function checkCronFailure(
  supabase: ReturnType<typeof createAlertClient>,
  userId: string,
  today: string,
): Promise<AlertResult | null> {
  // Check if yesterday's cron run failed or is missing
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toISOString().split('T')[0]

  const { data: logRow } = await supabase
    .from('cron_execution_log')
    .select('status, error_message, trigger_source')
    .eq('user_id', userId)
    .eq('execution_date', yesterdayStr)
    .single()

  // No log entry = cron didn't run at all
  if (!logRow) return null
  // Completed without critical alert = all good
  if (logRow.status === 'completed' && !logRow.error_message?.includes('CRITICAL')) return null

  // Alert on: failed, stale "started" (never completed), or CRITICAL in completed
  const isFailure = logRow.status === 'failed'
  const isStale = logRow.status === 'started' // started but never completed = stuck
  const isCritical = logRow.error_message?.includes('CRITICAL')
  if (!isFailure && !isStale && !isCritical) return null

  // Send to developer email (not user email)
  const developerEmail = process.env.DEVELOPER_ALERT_EMAIL ?? process.env.RESEND_FROM_EMAIL
  if (!developerEmail) {
    return { userId, alertType: 'cron_failure', sent: false, reason: 'no_developer_email' }
  }

  const idempotencyKey = `cron-failure/${userId}/${yesterdayStr}`

  try {
    const { id } = await sendEmail({
      to: developerEmail,
      subject: `CRON FAILURE — unemployment checkpoint missed for ${yesterdayStr}`,
      react: CronFailureAlert({
        executionDate: yesterdayStr,
        errorMessage: logRow.error_message ?? 'Unknown error',
        triggerSource: logRow.trigger_source ?? 'unknown',
        userId,
      }),
      idempotencyKey,
    })

    return { userId, alertType: 'cron_failure', sent: true, messageId: id }
  } catch (err) {
    return {
      userId,
      alertType: 'cron_failure',
      sent: false,
      reason: err instanceof Error ? err.message : String(err),
    }
  }
}
