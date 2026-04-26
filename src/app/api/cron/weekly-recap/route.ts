import { timingSafeEqual } from 'crypto'
import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  getWeekBounds,
  detectNotableEvents,
  generateTemplateSummary,
  generateHaikuSummary,
  buildMomentumContext,
  buildPhaseFromContext,
  type NotableEventContext,
} from '@/lib/weekly-recap'
import { WeeklyRecapEmail } from '@/lib/email-templates/templates/weekly-recap'
import { sendEmail } from '@/lib/resend'

/**
 * POST /api/cron/weekly-recap
 *
 * Generates a weekly recap summary and sends it via email.
 * Runs Sunday evenings via GitHub Actions cron.
 *
 * Secured with CRON_SECRET. Idempotent: skips if recap already
 * exists for this week_start + user_id.
 */
export const GET = handler
export const POST = handler

async function handler(req: NextRequest) {
  // ─── Auth ──────────────────────────────────────────────────────────────
  const secret = req.headers.get('authorization')?.replace('Bearer ', '')

  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 })
  }

  const a = Buffer.from(secret ?? '')
  const b = Buffer.from(process.env.CRON_SECRET)
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SECRET_KEY!,
    )

    // 1. Get the primary user
    const { data: users } = await supabase
      .from('users')
      .select('id, email')
      .eq('is_admin', false)
      .limit(1)

    if (!users || users.length === 0) {
      return NextResponse.json({ ok: true, reason: 'no users' })
    }

    const userId = users[0].id
    const userEmail = users[0].email

    // 2. Compute week bounds (Mon-Sun for the week ending today)
    const today = new Date()
    const { weekStart, weekEnd } = getWeekBounds(today)

    // 3. Idempotency check
    const { data: existing } = await supabase
      .from('weekly_activity_log')
      .select('id')
      .eq('user_id', userId)
      .eq('week_start', weekStart)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({
        ok: true,
        reason: `recap already exists for week ${weekStart}`,
        recap_id: existing.id,
      })
    }

    // 4. Aggregate weekly data
    const mondayIso = `${weekStart}T00:00:00Z`
    const sundayEndIso = `${weekEnd}T23:59:59Z`

    const [
      votesResult,
      appsResult,
      interviewsResult,
      clockResult,
      checkpointResult,
      totalAppsResult,
      immResult,
      rejectionsResult,
      prevWeekCheckpointResult,
    ] = await Promise.all([
      // Jobs reviewed (votes) this week
      supabase
        .from('votes')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('created_at', mondayIso)
        .lte('created_at', sundayEndIso),
      // Applications submitted this week
      supabase
        .from('applications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('created_at', mondayIso)
        .lte('created_at', sundayEndIso),
      // Interviews pending (phone_screen, interview, final_round)
      supabase
        .from('applications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .in('kanban_status', ['phone_screen', 'interview', 'final_round']),
      // Days remaining from immigration_clock view
      supabase
        .from('immigration_clock')
        .select('days_remaining')
        .eq('user_id', userId)
        .maybeSingle(),
      // Days used this week (unemployment checkpoints)
      supabase
        .from('daily_checkpoint')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'unemployed')
        .gte('check_date', weekStart)
        .lte('check_date', weekEnd),
      // Total lifetime applications
      supabase
        .from('applications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId),
      // Employment status
      supabase
        .from('immigration_status')
        .select('employment_active')
        .eq('user_id', userId)
        .maybeSingle(),
      // High-match rejections this week — join jobs to filter by match_score > 0.8
      supabase
        .from('applications')
        .select('jobs!inner(match_score)', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('kanban_status', 'rejected')
        .gte('updated_at', mondayIso)
        .lte('updated_at', sundayEndIso)
        .gt('jobs.match_score', 0.8),
      // Previous week's recap for interview count comparison
      (() => {
        const prevWeekStart = new Date(today)
        prevWeekStart.setDate(prevWeekStart.getDate() - 7)
        const { weekStart: prevStart } = getWeekBounds(prevWeekStart)
        return supabase
          .from('weekly_activity_log')
          .select('interview_prep_count')
          .eq('user_id', userId)
          .eq('week_start', prevStart)
          .maybeSingle()
      })(),
    ])

    const jobsReviewed = votesResult.count ?? 0
    const applicationsSubmitted = appsResult.count ?? 0
    const interviewsPending = interviewsResult.count ?? 0
    const daysRemaining = clockResult.data?.days_remaining ?? 150
    const daysUsedThisWeek = checkpointResult.count ?? 0
    const totalApplications = totalAppsResult.count ?? 0
    const isEmployed = immResult.data?.employment_active ?? false
    const highMatchRejections = rejectionsResult.count ?? 0

    // 5. Detect phase
    const momentumCtx = buildMomentumContext(
      jobsReviewed,
      applicationsSubmitted,
      totalApplications,
      interviewsPending,
      daysRemaining,
      isEmployed,
    )
    const phase = buildPhaseFromContext(momentumCtx)

    // 6. Detect notable events
    // First interview this week: interviews now > 0, and last week's recap had 0 (or no recap yet)
    const prevWeekInterviewCount = prevWeekCheckpointResult.data?.interview_prep_count ?? 0
    const firstInterviewThisWeek = interviewsPending > 0 && prevWeekInterviewCount === 0

    const eventCtx: NotableEventContext = {
      firstInterviewThisWeek,
      totalApplications,
      interviewsPending,
      daysRemaining,
      previousDaysRemaining: null, // Would need previous week's clock — simplified for now
      highMatchRejections,
    }
    const notableEvents = detectNotableEvents(eventCtx)

    // 7. Generate summary
    let summaryText: string
    let haikuInputTokens = 0
    let haikuOutputTokens = 0
    // Set when generateHaikuSummary returns aiUnavailable=true (Anthropic auth
    // failure). Other skip paths (no notable events, missing API key entirely)
    // leave this false — the email template can read haiku_used + ai_unavailable
    // together to disambiguate "AI down" from "AI not invoked this week."
    let aiUnavailable = false

    if (notableEvents.length > 0 && process.env.ANTHROPIC_API_KEY) {
      try {
        const result = await generateHaikuSummary(
          phase,
          notableEvents,
          jobsReviewed,
          applicationsSubmitted,
          daysRemaining,
        )
        summaryText = result.text
        haikuInputTokens = result.inputTokens
        haikuOutputTokens = result.outputTokens
        if (result.aiUnavailable) aiUnavailable = true
      } catch (err) {
        // Fallback to template if Haiku fails (non-auth errors only — auth
        // is handled inside generateHaikuSummary and returns aiUnavailable).
        console.error('[weekly-recap] Haiku summary failed, using template:', err)
        summaryText = generateTemplateSummary(phase, jobsReviewed, applicationsSubmitted)
      }
    } else {
      summaryText = generateTemplateSummary(phase, jobsReviewed, applicationsSubmitted)
    }

    // 8. Upsert into weekly_activity_log
    const { error: upsertError } = await supabase.from('weekly_activity_log').upsert(
      {
        user_id: userId,
        week_start: weekStart,
        week_end: weekEnd,
        jobs_reviewed_count: jobsReviewed,
        applications_submitted_count: applicationsSubmitted,
        interview_prep_count: interviewsPending,
        notable_event_types: notableEvents.length > 0 ? notableEvents : null,
        summary_text: summaryText,
      },
      { onConflict: 'user_id,week_start' },
    )

    if (upsertError) {
      console.error('[weekly-recap] Upsert error:', upsertError.message)
      return NextResponse.json(
        { error: 'Failed to save recap', message: upsertError.message },
        { status: 500 },
      )
    }

    // 9. Log Haiku cost if applicable
    if (haikuInputTokens > 0) {
      const { error: costError } = await supabase.from('api_usage_log').insert({
        user_id: userId,
        model: 'claude-haiku-4-5-20251001',
        input_tokens: haikuInputTokens,
        output_tokens: haikuOutputTokens,
        estimated_cost_cents: Math.ceil(
          haikuInputTokens * 0.0000008 * 100 + haikuOutputTokens * 0.000004 * 100,
        ),
        task_type: 'weekly_recap',
      })
      if (costError) {
        console.error('[weekly-recap] Failed to log API usage:', costError.message)
      }
    }

    // 10. Send email via Resend
    const weekLabel = formatWeekLabel(weekStart, weekEnd)
    let emailId: string | null = null

    if (userEmail) {
      try {
        const result = await sendEmail({
          to: userEmail,
          subject: `Your week in review — ${weekLabel}`,
          react: WeeklyRecapEmail({
            weekLabel,
            summaryText,
            jobsReviewed,
            applicationsSubmitted,
            interviewsPending,
            daysRemaining,
            phase,
          }),
          idempotencyKey: `weekly-recap-${userId}-${weekStart}`,
        })
        emailId = result.id
      } catch (err) {
        // Email failure is non-fatal — the recap is already saved
        console.error('[weekly-recap] Email send failed:', err)
      }
    }

    return NextResponse.json({
      ok: true,
      weekStart,
      weekEnd,
      jobsReviewed,
      applicationsSubmitted,
      interviewsPending,
      daysRemaining,
      daysUsedThisWeek,
      phase,
      notableEvents,
      haiku_used: haikuInputTokens > 0,
      ai_unavailable: aiUnavailable,
      email_sent: !!emailId,
      email_id: emailId,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json(
      { error: 'Weekly recap generation failed', message },
      { status: 500 },
    )
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Format week bounds into a human-readable label: "Mar 31 – Apr 6"
 */
function formatWeekLabel(weekStart: string, weekEnd: string): string {
  const start = new Date(weekStart + 'T12:00:00Z')
  const end = new Date(weekEnd + 'T12:00:00Z')

  const startMonth = start.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' })
  const startDay = start.getUTCDate()
  const endMonth = end.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' })
  const endDay = end.getUTCDate()

  if (startMonth === endMonth) {
    return `${startMonth} ${startDay} – ${endDay}`
  }
  return `${startMonth} ${startDay} – ${endMonth} ${endDay}`
}
