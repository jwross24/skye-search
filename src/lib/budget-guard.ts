/**
 * Budget guard — check and enforce API spend limits.
 * Queries daily_spend / weekly_spend views, compares to per-user caps.
 *
 * Multi-user ready: all queries filter by userId.
 */

import { createClient } from '@supabase/supabase-js'

// ─── Types ───────────────────────────────────────────────────────────────────

export type BudgetAction = 'allow' | 'reduce_batch' | 'pause'

export type BudgetVerdict =
  | { action: 'allow' }
  | { action: 'reduce_batch'; maxBatchSize: number; reason: string }
  | { action: 'pause'; reason: string }

export type TaskCriticality = 'critical' | 'normal'

export interface BudgetCaps {
  daily_cap_cents: number
  weekly_soft_cap_cents: number
  weekly_alert_threshold_cents: number
  pause_buffer_cents: number
}

export interface SpendSummary {
  dailyCents: number
  weeklyCents: number
  dailyCapCents: number
  weeklyCapCents: number
  weeklyAlertCents: number
  dailyRemaining: number
  weeklyRemaining: number
}

// ─── Defaults ────────────────────────────────────────────────────────────────

export const DEFAULT_CAPS: BudgetCaps = {
  daily_cap_cents: 300,           // $3.00
  weekly_soft_cap_cents: 1200,    // $12.00
  weekly_alert_threshold_cents: 800, // $8.00
  pause_buffer_cents: 50,         // $0.50
}

// Critical task types that are NEVER paused (immigration safety)
const CRITICAL_TASK_TYPES = new Set([
  'unemployment_cron',
  'deadline_72h',
  'cron_failure',
])

// ─── Client ──────────────────────────────────────────────────────────────────

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
  )
}

// ─── Core functions ──────────────────────────────────────────────────────────

export async function getUserBudgetCaps(userId: string): Promise<BudgetCaps> {
  const supabase = getServiceClient()
  const { data } = await supabase
    .from('users')
    .select('user_preferences')
    .eq('id', userId)
    .single()

  const budget = (data?.user_preferences as Record<string, unknown> | null)?.budget as BudgetCaps | undefined
  return budget ?? DEFAULT_CAPS
}

export async function getSpendSummary(userId: string): Promise<SpendSummary> {
  const supabase = getServiceClient()
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' })

  const [dailyResult, weeklyResult, caps] = await Promise.all([
    supabase
      .from('daily_spend')
      .select('total_cents')
      .eq('user_id', userId)
      .eq('spend_date', today)
      .maybeSingle(),
    supabase
      .from('weekly_spend')
      .select('total_cents')
      .eq('user_id', userId)
      .maybeSingle(),
    getUserBudgetCaps(userId),
  ])

  const dailyCents = dailyResult.data?.total_cents ?? 0
  const weeklyCents = weeklyResult.data?.total_cents ?? 0

  return {
    dailyCents,
    weeklyCents,
    dailyCapCents: caps.daily_cap_cents,
    weeklyCapCents: caps.weekly_soft_cap_cents,
    weeklyAlertCents: caps.weekly_alert_threshold_cents,
    dailyRemaining: Math.max(0, caps.daily_cap_cents - dailyCents),
    weeklyRemaining: Math.max(0, caps.weekly_soft_cap_cents - weeklyCents),
  }
}

export async function checkBudget(params: {
  userId: string
  taskType: string
  criticality?: TaskCriticality
}): Promise<BudgetVerdict> {
  // Critical tasks are never paused
  if (params.criticality === 'critical' || CRITICAL_TASK_TYPES.has(params.taskType)) {
    return { action: 'allow' }
  }

  const summary = await getSpendSummary(params.userId)

  // Hard cap: daily spend exceeded
  if (summary.dailyCents >= summary.dailyCapCents) {
    return {
      action: 'pause',
      reason: `Daily spend cap reached ($${(summary.dailyCents / 100).toFixed(2)} / $${(summary.dailyCapCents / 100).toFixed(2)})`,
    }
  }

  // Approaching cap: within pause_buffer
  const caps = await getUserBudgetCaps(params.userId)
  if (summary.dailyCents >= summary.dailyCapCents - caps.pause_buffer_cents) {
    return {
      action: 'reduce_batch',
      maxBatchSize: 3,
      reason: `Approaching daily cap ($${(summary.dailyCents / 100).toFixed(2)} / $${(summary.dailyCapCents / 100).toFixed(2)})`,
    }
  }

  return { action: 'allow' }
}
