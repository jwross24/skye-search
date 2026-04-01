import { redirect } from 'next/navigation'
import { DailyBatch } from '@/components/jobs/daily-batch'
import { BreakCard } from '@/components/jobs/break-card'
import { JobsHeader } from '@/components/jobs/jobs-header'
import { createClient } from '@/db/supabase-server'
import type { UserState } from '@/lib/urgency-scoring'
import type { Job } from '@/types/job'

export default async function JobsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return redirect('/login')

  const today = new Date().toISOString().split('T')[0]

  // ─── Parallel queries ────────────────────────────────────────────────

  const [jobsResult, votesResult, appsResult, immResult, clockResult, pendingOfferResult, userResult] = await Promise.all([
    supabase.from('jobs').select('*').eq('user_id', user.id),
    supabase.from('votes').select('job_id').eq('user_id', user.id),
    supabase.from('applications').select('job_id').eq('user_id', user.id),
    supabase
      .from('immigration_status')
      .select('*')
      .eq('user_id', user.id)
      .single(),
    // Accurate days_remaining from checkpoint data (returns null during postdoc)
    supabase
      .from('immigration_clock')
      .select('days_remaining')
      .eq('user_id', user.id)
      .maybeSingle(),
    // Check for accepted offers that haven't started (start_date in future)
    supabase
      .from('applications')
      .select('start_date')
      .eq('user_id', user.id)
      .eq('kanban_status', 'offer_accepted')
      .not('start_date', 'is', null)
      .gt('start_date', today)
      .limit(1)
      .maybeSingle(),
    supabase
      .from('users')
      .select('break_mode_until')
      .eq('id', user.id)
      .single(),
  ])

  // ─── Filter out already-voted / already-applied jobs ─────────────────

  const votedJobIds = new Set<string>([
    ...(votesResult.data ?? []).map((v) => v.job_id),
    ...(appsResult.data ?? [])
      .map((a) => a.job_id)
      .filter((id): id is string => id !== null),
  ])

  // ─── Map DB rows → Job type ──────────────────────────────────────────

  const jobs: Job[] = (jobsResult.data ?? [])
    .filter((row) => !votedJobIds.has(row.id))
    .filter((row) => {
      // Exclude expired deadlines (except until_filled)
      if (row.application_deadline && row.source_type !== 'until_filled') {
        return row.application_deadline >= today
      }
      return true
    })
    .map((row) => ({
      id: row.id,
      title: row.title ?? '',
      company: row.company ?? '',
      company_domain: row.company_domain,
      location: row.location ?? '',
      url: row.url,
      visa_path: (row.visa_path ?? 'unknown') as Job['visa_path'],
      employer_type: (row.employer_type ?? 'unknown') as Job['employer_type'],
      cap_exempt_confidence: (row.cap_exempt_confidence ?? 'none') as Job['cap_exempt_confidence'],
      employment_type: (row.employment_type ?? 'unknown') as Job['employment_type'],
      source_type: row.source_type as Job['source_type'],
      application_deadline: row.application_deadline,
      deadline_source: row.deadline_source,
      application_complexity: row.application_complexity,
      h1b_sponsor_count: row.h1b_sponsor_count,
      salary: row.salary,
      remote_status: row.remote_status,
      skills_required: row.skills_required ?? [],
      why_fits: row.why_fits ?? '',
      indexed_date: row.indexed_date,
      requires_citizenship: row.requires_citizenship ?? false,
      requires_security_clearance: row.requires_security_clearance ?? false,
    }))

  // ─── Compute user state from immigration_status + checkpoint data ────

  const immRow = immResult.data

  // Use checkpoint-tracked days if available (immigration_clock view),
  // fall back to calibration baseline during postdoc (view returns null)
  const daysRemaining = clockResult.data?.days_remaining
    ?? (immRow ? 150 - (immRow.initial_days_used ?? 0) : 150)

  // Grace period: OPT expired AND not employed (no bridge job, no postdoc)
  const inGracePeriod = !!(
    immRow?.opt_expiry
    && today > immRow.opt_expiry
    && !immRow.employment_active
  )

  // Accepted offer with future start date (halves bridge job urgency)
  const offerAcceptedNotStarted = !!pendingOfferResult.data

  const userState: UserState = immRow
    ? {
        days_remaining: daysRemaining,
        is_employed: immRow.employment_active,
        offer_accepted_not_started: offerAcceptedNotStarted,
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

  // ─── Break mode check ─────────────────────────────────────────────────
  const breakModeUntil = userResult.data?.break_mode_until as string | null
  const isOnBreak = breakModeUntil && new Date(breakModeUntil) > new Date()

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
      <JobsHeader />

      {isOnBreak ? (
        <BreakCard breakModeUntil={breakModeUntil} />
      ) : (
        <DailyBatch jobs={jobs} userState={userState} />
      )}
    </div>
  )
}
