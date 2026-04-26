/**
 * Weekly Recap — aggregates the week's job search activity into a
 * phase-aware summary. Designed to run Sundays, surfaced as a card
 * on the jobs page and sent via email.
 *
 * Cost strategy: template literal most weeks ($0). Only calls
 * Haiku when notable events are detected (first interview,
 * milestone crossed, clock threshold, high-match rejection).
 */

import { detectPhase, type MomentumContext, type SearchPhase } from './momentum'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface WeeklyRecapData {
  weekStart: string   // ISO date (Monday)
  weekEnd: string     // ISO date (Sunday)
  jobsReviewed: number
  applicationsSubmitted: number
  interviewsPending: number
  daysRemaining: number
  daysUsedThisWeek: number
  phase: SearchPhase
  summaryText: string
  notableEvents: string[]
}

export interface NotableEventContext {
  firstInterviewThisWeek: boolean
  totalApplications: number
  interviewsPending: number
  daysRemaining: number
  previousDaysRemaining: number | null // null if unknown
  highMatchRejections: number           // rejections where match_score > 0.8
}

// ─── Week Bounds ────────────────────────────────────────────────────────────

/**
 * Returns Monday-Sunday bounds for the week containing `today`.
 * Returns ISO date strings (YYYY-MM-DD).
 */
export function getWeekBounds(today: Date): { weekStart: string; weekEnd: string } {
  const day = today.getDay()
  const mondayOffset = day === 0 ? -6 : 1 - day
  const monday = new Date(today)
  monday.setDate(today.getDate() + mondayOffset)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  return {
    weekStart: monday.toISOString().split('T')[0],
    weekEnd: sunday.toISOString().split('T')[0],
  }
}

// ─── Notable Event Detection ────────────────────────────────────────────────

/** Clock thresholds that trigger a notable event when crossed during the week. */
const CLOCK_THRESHOLDS = [120, 90, 60, 30] as const

/** Application milestones that trigger a notable event. */
const APP_MILESTONES = [1, 5, 10, 25, 50] as const

export function detectNotableEvents(ctx: NotableEventContext): string[] {
  const events: string[] = []

  // First interview scheduled this week
  if (ctx.firstInterviewThisWeek) {
    events.push('First interview scheduled')
  }

  // Application milestones
  for (const milestone of APP_MILESTONES) {
    if (ctx.totalApplications >= milestone && ctx.totalApplications - milestone < 5) {
      // Close enough to the milestone to count as "just crossed it"
      // More precisely: crossed it this week if previous week's total was below it
      events.push(`Reached ${milestone} application${milestone > 1 ? 's' : ''}`)
      break // Only report the highest milestone
    }
  }

  // Clock crossed a threshold
  if (ctx.previousDaysRemaining !== null) {
    for (const threshold of CLOCK_THRESHOLDS) {
      if (ctx.previousDaysRemaining > threshold && ctx.daysRemaining <= threshold) {
        events.push(`Clock crossed ${threshold}-day mark`)
        break
      }
    }
  }

  // High-match rejection
  if (ctx.highMatchRejections > 0) {
    events.push(
      `Rejection from ${ctx.highMatchRejections} high-match ${ctx.highMatchRejections === 1 ? 'role' : 'roles'}`,
    )
  }

  return events
}

// ─── Summary Generation ─────────────────────────────────────────────────────

/**
 * Template-based summary — $0 cost, used when no notable events.
 * Warm tone, phase-aware.
 */
export function generateTemplateSummary(
  phase: SearchPhase,
  jobsReviewed: number,
  applicationsSubmitted: number,
): string {
  const jobsText = jobsReviewed === 1 ? '1 job' : `${jobsReviewed} jobs`
  const appsText =
    applicationsSubmitted > 0
      ? ` and submitted ${applicationsSubmitted} application${applicationsSubmitted === 1 ? '' : 's'}`
      : ''

  switch (phase) {
    case 'launch':
      return `You explored ${jobsText}${appsText} this week. Every step builds momentum.`
    case 'active':
      return `You explored ${jobsText}${appsText} this week. Steady progress — academic searches take time, and you're on track.`
    case 'response':
      return `You explored ${jobsText}${appsText} this week. With interviews in progress, your profile is clearly resonating.`
    case 'pressure':
      return `You explored ${jobsText}${appsText} this week. Focused effort on the highest-priority roles will make the difference.`
    default:
      return `You explored ${jobsText}${appsText} this week. Steady progress.`
  }
}

/**
 * Generates a Haiku-powered summary for weeks with notable events.
 * Calls Claude Haiku with phase context + events for a warm 2-3 sentence summary.
 *
 * Returns the generated text and cost info for api_usage_log.
 */
export async function generateHaikuSummary(
  phase: SearchPhase,
  notableEvents: string[],
  jobsReviewed: number,
  applicationsSubmitted: number,
  daysRemaining: number,
): Promise<{
  text: string
  inputTokens: number
  outputTokens: number
  aiUnavailable?: boolean
}> {
  // Lift import out of the try block so AuthenticationError is in scope for the catch.
  const Anthropic = (await import('@anthropic-ai/sdk')).default
  const client = new Anthropic()

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
      temperature: 0.7,
      system: [
        {
          type: 'text',
          text: `You write warm, encouraging weekly recap summaries for a job search companion app. The user is an international PhD scientist navigating STEM OPT immigration deadlines. Current phase: "${phase}". Tone rules: supportive friend, never clinical or alarming. No AI patterns (no emdashes, no "Here's why", no "Let's"). 2-3 sentences max. Acknowledge the notable events naturally without listing them.`,
        },
      ],
      messages: [
        {
          role: 'user',
          content: `Write a weekly recap summary. This week: ${jobsReviewed} jobs reviewed, ${applicationsSubmitted} applications submitted, ${daysRemaining} days remaining on OPT clock. Notable events: ${notableEvents.join('; ')}.`,
        },
      ],
    })

    const text =
      message.content[0].type === 'text'
        ? message.content[0].text
        : generateTemplateSummary(phase, jobsReviewed, applicationsSubmitted)

    return {
      text,
      inputTokens: message.usage.input_tokens,
      outputTokens: message.usage.output_tokens,
    }
  } catch (err) {
    // Auth failure (e.g., stale or placeholder API key in production) — fall
    // back to the template summary and signal the caller so the recap payload
    // can flag that AI commentary was skipped this week. Other errors bubble
    // up so the cron route's existing try/catch can log + decide.
    if (err instanceof Anthropic.AuthenticationError) {
      console.error('[weekly-recap] anthropic_auth_failed', { request_id: err.requestID })
      return {
        text: generateTemplateSummary(phase, jobsReviewed, applicationsSubmitted),
        inputTokens: 0,
        outputTokens: 0,
        aiUnavailable: true,
      }
    }
    throw err
  }
}

// ─── Build Recap ────────────────────────────────────────────────────────────

export function buildMomentumContext(
  jobsReviewed: number,
  applicationsSubmitted: number,
  totalApplications: number,
  interviewsPending: number,
  daysRemaining: number,
  isEmployed: boolean,
): MomentumContext {
  return {
    jobs_reviewed_this_week: jobsReviewed,
    apps_submitted_this_week: applicationsSubmitted,
    total_applications: totalApplications,
    interviews_active: interviewsPending,
    days_remaining: daysRemaining,
    is_employed: isEmployed,
  }
}

export function buildPhaseFromContext(ctx: MomentumContext): SearchPhase {
  return detectPhase(ctx)
}
