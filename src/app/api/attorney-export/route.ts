import { NextResponse } from 'next/server'
import { createClient } from '@/db/supabase-server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/attorney-export
 *
 * Generates structured JSON for immigration attorney review.
 * Sections: unemployment log, immigration dates, employment periods,
 * application history, weekly activity summary, checkpoint corrections.
 *
 * Every date includes a source label for epistemic clarity.
 */
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const userId = user.id

  // ─── Parallel queries ──────────────────────────────────────────────────

  const [
    immResult,
    checkpointsResult,
    correctionsResult,
    ledgerResult,
    clockResult,
    applicationsResult,
    votesResult,
    outreachResult,
  ] = await Promise.all([
    supabase.from('immigration_status').select('*').eq('user_id', userId).single(),
    supabase.from('daily_checkpoint').select('*').eq('user_id', userId).order('checkpoint_date', { ascending: true }),
    supabase.from('checkpoint_corrections').select('*').eq('user_id', userId).order('checkpoint_date', { ascending: true }),
    supabase.from('immigration_ledger').select('*').eq('user_id', userId).order('start_date', { ascending: true }),
    supabase.from('immigration_clock').select('*').eq('user_id', userId).maybeSingle(),
    supabase.from('applications').select('*, jobs(title, company, employer_type, visa_path)').eq('user_id', userId).order('created_at', { ascending: true }),
    supabase.from('votes').select('id, job_id, decision, created_at').eq('user_id', userId),
    supabase.from('outreach_events').select('id, type, event_date').eq('user_id', userId),
  ])

  const imm = immResult.data
  const checkpoints = checkpointsResult.data ?? []
  const corrections = correctionsResult.data ?? []
  const ledger = ledgerResult.data ?? []
  const clock = clockResult.data
  const applications = applicationsResult.data ?? []
  const votes = votesResult.data ?? []
  const outreach = outreachResult.data ?? []

  // ─── Build correction lookup (date → correction) ───────────────────────

  const correctionsByDate = new Map<string, typeof corrections[0]>()
  for (const c of corrections) {
    correctionsByDate.set(c.checkpoint_date, c)
  }

  // ─── 1. Unemployment Log ──────────────────────────────────────────────

  const unemploymentLog = checkpoints.map((cp) => {
    const correction = correctionsByDate.get(cp.checkpoint_date)
    return {
      date: cp.checkpoint_date,
      status: cp.status_snapshot,
      corrected_status: correction?.corrected_status ?? null,
      effective_status: correction?.corrected_status ?? cp.status_snapshot,
      cumulative_unemployment_days: cp.unemployment_days_used_cumulative,
      trigger_source: cp.trigger_source,
      evidence_notes: cp.evidence_notes,
      correction_reason: correction?.trigger_source ?? null,
    }
  })

  // ─── 2. Immigration Dates ─────────────────────────────────────────────

  const immigrationDates = imm ? {
    visa_type: imm.visa_type,
    opt_expiry: labelDate(imm.opt_expiry, 'system-calculated'),
    postdoc_end_date: labelDate(imm.postdoc_end_date, 'user-reported'),
    employment_active: imm.employment_active,
    employment_start_date: labelDate(imm.employment_start_date, 'user-reported'),
    employment_end_date: labelDate(imm.employment_end_date, 'user-reported'),
    initial_days_used: {
      value: imm.initial_days_used,
      source: imm.initial_days_source === 'dso_confirmed' ? 'DSO-confirmed' : 'user-reported',
    },
    calibration_date: labelDate(imm.calibration_date, imm.initial_days_source === 'dso_confirmed' ? 'DSO-confirmed' : 'user-reported'),
    niw_status: imm.niw_status,
    niw_filing_date: labelDate(imm.niw_filing_date, 'user-reported'),
    niw_priority_date: labelDate(imm.niw_priority_date, 'user-reported'),
    i140_status: imm.i140_status,
    i485_status: imm.i485_status,
    grace_period_start_date: labelDate(imm.grace_period_start_date, 'system-calculated'),
    visa_stamp_expiry_date: labelDate(imm.visa_stamp_expiry_date, 'user-reported'),
    clock_summary: clock ? {
      days_used_conservative: clock.days_used_conservative,
      days_used_confirmed: clock.days_used_confirmed,
      gap_days: clock.gap_days,
      days_remaining: clock.days_remaining,
      source: 'system-calculated (immigration_clock view)',
    } : null,
  } : null

  // ─── 3. Employment Periods (from ledger) ──────────────────────────────

  const employmentPeriods = ledger.map((entry) => ({
    status: entry.status_type,
    start_date: entry.start_date,
    end_date: entry.end_date,
    employer_name: entry.employer_name,
    dso_confirmed: entry.dso_confirmed,
    source: entry.dso_confirmed ? 'DSO-confirmed' : 'system-calculated',
  }))

  // ─── 4. Application History ───────────────────────────────────────────

  const applicationHistory = applications.map((app) => {
    const job = Array.isArray(app.jobs) ? app.jobs[0] : app.jobs
    return {
      id: app.id,
      job_title: job?.title ?? null,
      company: job?.company ?? null,
      employer_type: job?.employer_type ?? null,
      visa_path: job?.visa_path ?? null,
      kanban_status: app.kanban_status,
      applied_date: labelDate(app.applied_date, 'user-reported'),
      phone_screen_date: labelDate(app.phone_screen_date, 'user-reported'),
      interview_date: labelDate(app.interview_date, 'user-reported'),
      offer_date: labelDate(app.offer_date, 'user-reported'),
      offer_accepted_date: labelDate(app.offer_accepted_date, 'user-reported'),
      start_date: labelDate(app.start_date, 'user-reported'),
      rejected_date: labelDate(app.rejected_date, 'user-reported'),
      withdrawn_date: labelDate(app.withdrawn_date, 'user-reported'),
      notes: app.notes,
    }
  })

  // ─── 5. Weekly Activity Summary (USCIS compliance evidence) ───────────
  // Auto-generated from existing data — no user input required.

  const weeklyActivity = generateWeeklyActivity(
    votes,
    applications,
    outreach,
    imm?.postdoc_end_date ?? null,
  )

  // ─── 6. Checkpoint Corrections (audit trail) ─────────────────────────

  const correctionLog = corrections.map((c) => ({
    date: c.checkpoint_date,
    original_status: c.original_status,
    corrected_status: c.corrected_status,
    trigger_source: c.trigger_source,
    created_at: c.created_at,
  }))

  // ─── Build response ──────────────────────────────────────────────────

  const exportData = {
    export_metadata: {
      generated_at: new Date().toISOString(),
      format_version: '1.0',
      user_id: userId,
      disclaimer: 'This is not immigration legal advice. Dates marked as user-reported should be verified with your DSO or immigration attorney.',
      source_label_key: {
        'DSO-confirmed': 'Verified by Designated School Official',
        'user-reported': 'Entered by user, not independently verified',
        'system-calculated': 'Computed from checkpoint data and employment records',
      },
    },
    immigration_dates: immigrationDates,
    unemployment_log: unemploymentLog,
    employment_periods: employmentPeriods,
    checkpoint_corrections: correctionLog,
    application_history: applicationHistory,
    weekly_activity_summary: weeklyActivity,
  }

  // Return as downloadable JSON file
  const filename = `attorney-export-${new Date().toISOString().split('T')[0]}.json`

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function labelDate(
  date: string | null | undefined,
  source: string,
): { value: string | null; source: string } | null {
  if (!date) return null
  return { value: date, source }
}

interface VoteRow { id: string; job_id: string; decision: string; created_at: string }
interface AppRow { id: string; applied_date: string | null; created_at: string }
interface OutreachRow { id: string; type: string; event_date: string | null }

/**
 * Generate weekly activity summaries from existing system data.
 * Each week shows: jobs reviewed, applications submitted, networking outreach.
 * This serves as USCIS compliance evidence for active job search.
 */
function generateWeeklyActivity(
  votes: VoteRow[],
  applications: AppRow[],
  outreach: OutreachRow[],
  postdocEndDate: string | null,
): Array<{
  week_start: string
  week_end: string
  jobs_reviewed: number
  applications_submitted: number
  networking_events: number
  source: string
}> {
  if (!postdocEndDate) return []

  // Group activity by ISO week starting from postdoc end
  const startDate = new Date(postdocEndDate + 'T00:00:00')
  startDate.setDate(startDate.getDate() + 1) // unemployment starts day after postdoc

  const now = new Date()
  const weeks: Array<{
    week_start: string
    week_end: string
    jobs_reviewed: number
    applications_submitted: number
    networking_events: number
    source: string
  }> = []

  // Walk week by week starting from actual unemployment start date.
  // No Monday alignment — partial first week data must not be silently dropped
  // from an attorney export. Weeks are 7-day windows from startDate.
  const cursor = new Date(startDate)

  while (cursor < now) {
    const weekStart = cursor.toISOString().split('T')[0]
    const weekEnd = new Date(cursor.getTime() + 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    const jobsReviewed = votes.filter((v) => {
      const d = v.created_at.split('T')[0]
      return d >= weekStart && d <= weekEnd
    }).length

    const appsSubmitted = applications.filter((a) => {
      const d = (a.applied_date ?? a.created_at).split('T')[0]
      return d >= weekStart && d <= weekEnd
    }).length

    const networkingEvents = outreach.filter((o) => {
      const d = (o.event_date ?? '').split('T')[0]
      return d >= weekStart && d <= weekEnd
    }).length

    weeks.push({
      week_start: weekStart,
      week_end: weekEnd,
      jobs_reviewed: jobsReviewed,
      applications_submitted: appsSubmitted,
      networking_events: networkingEvents,
      source: 'system-calculated (from votes, applications, and outreach events)',
    })

    cursor.setDate(cursor.getDate() + 7)
  }

  return weeks
}
