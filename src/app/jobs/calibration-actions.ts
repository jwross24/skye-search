'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/db/supabase-server'
import { getCalibrationWeekStart } from '@/lib/calibration-week'
import { getPrimaryReason } from '@/lib/urgency-reason'
import { computeUrgencyScore, jobToInput } from '@/lib/urgency-scoring'
import type { UserState, VisaPath, EmployerType, CapExemptConfidence, EmploymentType } from '@/lib/urgency-scoring'
import type { CalibrationPick, CalibrationTag } from '@/lib/calibration-types'

// ─── Get top-5 uncalibrated picks for this week ──────────────────────────────

export async function getCalibrationPicks(): Promise<{ picks: CalibrationPick[]; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { picks: [], error: 'Not authenticated' }

  const weekStart = getCalibrationWeekStart(new Date())
  const weekStartIso = weekStart.toISOString().split('T')[0]
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const today = new Date().toISOString().split('T')[0]

  // 1. Jobs scored in the last 7 days (over-fetch so we can exclude calibrated ones).
  // Use select('*') to avoid Supabase TypeScript GenericStringError from multi-column
  // string selects. Filter to only scored jobs (urgency_score > -2 excludes nulls).
  const { data: jobsRaw, error: jobsErr } = await supabase
    .from('jobs')
    .select('*')
    .eq('user_id', user.id)
    .gt('urgency_score', -2)
    .gte('created_at', sevenDaysAgo)
    .order('urgency_score', { ascending: false })
    .limit(25)

  const jobs = jobsRaw as Array<{
    id: string
    title: string | null
    company: string | null
    urgency_score: number | null
    match_score: number | null
    location: string | null
    url: string | null
    visa_path: string | null
    cap_exempt_confidence: string | null
    employment_type: string | null
    source_type: string | null
    employer_type: string | null
    application_deadline: string | null
    requires_security_clearance: boolean | null
    requires_citizenship: boolean | null
    h1b_sponsor_count: number | null
    application_complexity: string | null
    indexed_date: string | null
  }> | null

  if (jobsErr) return { picks: [], error: jobsErr.message }

  // 2. Jobs already calibrated this week
  const { data: calibrated } = await supabase
    .from('calibration_log')
    .select('job_id')
    .eq('user_id', user.id)
    .eq('calibration_week', weekStartIso)

  const calibratedIds = new Set((calibrated ?? []).map((r) => r.job_id))

  // 3. Fetch user state for primary reason computation
  const [immResult, clockResult] = await Promise.all([
    supabase.from('immigration_status').select('*').eq('user_id', user.id).single(),
    supabase.from('immigration_clock').select('days_remaining').eq('user_id', user.id).maybeSingle(),
  ])

  const immRow = immResult.data
  const daysRemaining = clockResult.data?.days_remaining
    ?? (immRow ? 150 - (immRow.initial_days_used ?? 0) : 150)

  const inGracePeriod = !!(
    immRow?.opt_expiry && today > immRow.opt_expiry && !immRow.employment_active
  )

  const userState: UserState = immRow
    ? {
        days_remaining: daysRemaining,
        is_employed: immRow.employment_active,
        offer_accepted_not_started: false,
        employment_end_date: immRow.postdoc_end_date ?? null,
        in_grace_period: inGracePeriod,
        today,
      }
    : {
        days_remaining: 150,
        is_employed: false,
        offer_accepted_not_started: false,
        employment_end_date: null,
        in_grace_period: false,
        today,
      }

  // 4. Build picks (exclude already-calibrated, take top 5)
  const picks: CalibrationPick[] = (jobs ?? [])
    .filter((j) => !calibratedIds.has(j.id))
    .slice(0, 5)
    .map((j) => {
      // Recompute to get modifiers → primary_reason
      const jobInput = jobToInput(
        {
          visa_path: (j.visa_path ?? 'unknown') as VisaPath,
          employer_type: (j.employer_type ?? 'unknown') as EmployerType,
          cap_exempt_confidence: (j.cap_exempt_confidence ?? 'none') as CapExemptConfidence,
          employment_type: (j.employment_type ?? 'unknown') as EmploymentType,
          source_type: j.source_type as import('@/types/job-source').SourceType | null,
          location: j.location ?? null,
          h1b_sponsor_count: j.h1b_sponsor_count ?? null,
          application_deadline: j.application_deadline ?? null,
          application_complexity: j.application_complexity ?? null,
          indexed_date: j.indexed_date ?? null,
          requires_citizenship: j.requires_citizenship ?? false,
          requires_security_clearance: j.requires_security_clearance ?? false,
        },
        today,
      )

      const result = computeUrgencyScore(jobInput, userState)
      const primary_reason = getPrimaryReason(result.modifiers)

      return {
        id: j.id,
        title: j.title ?? '',
        company: j.company ?? '',
        urgency_score: j.urgency_score as number,
        match_score: j.match_score ?? null,
        location: j.location ?? null,
        url: j.url ?? null,
        primary_reason,
        visa_path: j.visa_path ?? null,
        cap_exempt_confidence: j.cap_exempt_confidence ?? null,
      }
    })

  return { picks }
}

// ─── Log "Right call" feedback ────────────────────────────────────────────────

export async function logCalibrationConfirmed(
  jobId: string,
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const weekStart = getCalibrationWeekStart(new Date())
  const weekStartIso = weekStart.toISOString().split('T')[0]

  const { error } = await supabase.from('calibration_log').insert({
    user_id: user.id,
    job_id: jobId,
    feedback_type: 'confirmed',
    calibration_week: weekStartIso,
  })

  if (error) return { success: false, error: error.message }

  revalidatePath('/jobs')
  return { success: true }
}

// ─── Log "Not quite" feedback + optional confidence downgrade ────────────────

export async function logCalibrationTooHigh(
  jobId: string,
  tag: CalibrationTag,
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const weekStart = getCalibrationWeekStart(new Date())
  const weekStartIso = weekStart.toISOString().split('T')[0]

  // 1. Insert calibration log row
  const { error: logErr } = await supabase.from('calibration_log').insert({
    user_id: user.id,
    job_id: jobId,
    feedback_type: 'too_high',
    tag,
    calibration_week: weekStartIso,
  })

  if (logErr) return { success: false, error: logErr.message }

  // 2. If wrong_visa: downgrade cap_exempt_employers confidence by one step
  if (tag === 'wrong_visa') {
    // Look up the job to get company name
    const { data: job } = await supabase
      .from('jobs')
      .select('company, cap_exempt_confidence')
      .eq('id', jobId)
      .eq('user_id', user.id)
      .single()

    if (job?.company && job.cap_exempt_confidence) {
      const confidence = job.cap_exempt_confidence as string
      // Downgrade: confirmed → likely → unverified → none (floor at none)
      const downgradeMap: Record<string, string> = {
        confirmed: 'likely',
        likely: 'unverified',
        unverified: 'none',
        none: 'none',
      }
      const newConfidence = downgradeMap[confidence]

      if (newConfidence && newConfidence !== confidence) {
        // Find employer in cap_exempt_employers by name (case-insensitive, DB-side).
        // Use ilike instead of fetching the full table (~600 rows) and filtering in JS.
        // Alias matching still requires client-side filtering — only fetch candidate rows first.
        const { data: employers } = await supabase
          .from('cap_exempt_employers')
          .select('id, employer_name, aliases, confidence_level')
          .ilike('employer_name', job.company)
          .limit(1)

        // If ilike found a match, use it. Otherwise fall through (no match, no update).
        const match = employers?.[0] ?? null

        if (match && match.id) {
          await supabase
            .from('cap_exempt_employers')
            .update({ confidence_level: newConfidence })
            .eq('id', match.id)
        }
      }
    }
  }

  // 3. 'stale' tag: log only. HEAD freshness re-check is a follow-up bead.

  revalidatePath('/jobs')
  return { success: true }
}
