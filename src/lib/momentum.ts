/**
 * Momentum + Milestones — gentle gamification for job search.
 *
 * Philosophy: warm acknowledgment of forward motion, never punishment.
 * No streaks, no XP, no urgency pressure. Just a trusted companion
 * noticing she's making progress.
 */

export type SearchPhase = 'launch' | 'active' | 'response' | 'pressure'

export interface MomentumContext {
  jobs_reviewed_this_week: number   // votes cast this week
  apps_submitted_this_week: number  // applications created this week
  total_applications: number        // lifetime application count
  interviews_active: number         // applications in interview stages
  days_remaining: number            // OPT clock days
  is_employed: boolean              // currently employed
}

export interface Milestone {
  message: string
  key: string
}

/**
 * Detect the user's current search phase.
 *
 * Priority order (first match wins):
 *   pressure   — clock is pressing (<60 days, not employed)
 *   response   — got at least one interview
 *   active     — applying steadily, no responses yet
 *   launch     — just starting out (0-10 apps)
 */
export function detectPhase(ctx: MomentumContext): SearchPhase {
  if (!ctx.is_employed && ctx.days_remaining < 60) return 'pressure'
  if (ctx.interviews_active > 0) return 'response'
  if (ctx.total_applications >= 10 && ctx.interviews_active === 0) return 'active'
  return 'launch'
}

/**
 * Return a warm, one-sentence momentum message for this session,
 * or null if there's nothing meaningful to say (silence > noise).
 */
export function getMomentumMessage(ctx: MomentumContext): string | null {
  const phase = detectPhase(ctx)

  // Employed: clock is paused — always takes priority.
  if (ctx.is_employed) {
    return 'Clock paused — you\'re in a good spot. Explore at your own pace.'
  }

  // No activity this week: say nothing rather than highlighting the gap.
  if (ctx.jobs_reviewed_this_week === 0 && ctx.apps_submitted_this_week === 0) {
    return null
  }

  // Pressure phase: warm but action-oriented.
  if (phase === 'pressure') {
    if (ctx.apps_submitted_this_week > 0) {
      return `You applied to ${ctx.apps_submitted_this_week} ${ctx.apps_submitted_this_week === 1 ? 'role' : 'roles'} this week. Focus on the top picks. Bridge roles can stop the clock.`
    }
    return `You explored ${ctx.jobs_reviewed_this_week} ${ctx.jobs_reviewed_this_week === 1 ? 'job' : 'jobs'} this week. Focus on the top picks. Bridge roles can stop the clock.`
  }

  // Response phase: celebrate the interview signal.
  if (phase === 'response') {
    if (ctx.apps_submitted_this_week > 0) {
      return `You applied to ${ctx.apps_submitted_this_week} ${ctx.apps_submitted_this_week === 1 ? 'role' : 'roles'} this week. You have an interview — that's a real signal they liked your profile.`
    }
    return `You explored ${ctx.jobs_reviewed_this_week} ${ctx.jobs_reviewed_this_week === 1 ? 'job' : 'jobs'} this week. You have an interview — that's a real signal they liked your profile.`
  }

  // Active phase: normalise the silence from employers.
  if (phase === 'active') {
    if (ctx.apps_submitted_this_week > 0) {
      return `You applied to ${ctx.apps_submitted_this_week} ${ctx.apps_submitted_this_week === 1 ? 'role' : 'roles'} this week. Academic searches typically take 4-6 weeks after applying. You're on track.`
    }
    return `You explored ${ctx.jobs_reviewed_this_week} ${ctx.jobs_reviewed_this_week === 1 ? 'job' : 'jobs'} this week. Academic searches typically take 4-6 weeks after applying. You're on track.`
  }

  // Launch phase: build momentum encouragement.
  if (ctx.apps_submitted_this_week > 0) {
    return `You applied to ${ctx.apps_submitted_this_week} ${ctx.apps_submitted_this_week === 1 ? 'role' : 'roles'} this week. Every application sharpens the recommendations.`
  }
  return `You explored ${ctx.jobs_reviewed_this_week} ${ctx.jobs_reviewed_this_week === 1 ? 'job' : 'jobs'} this week. You're building momentum.`
}

/**
 * Check if a one-time milestone should fire.
 * Returns the milestone if it's new, or null if already seen.
 *
 * Milestones fire once; caller is responsible for persisting the key
 * and calling markMilestoneSeen() after render.
 */
export function getMilestone(
  ctx: MomentumContext,
  seenMilestones: string[],
): Milestone | null {
  const seen = new Set(seenMilestones)

  // Evaluate in priority order — only one milestone fires per session.
  const candidates: Milestone[] = []

  if (ctx.interviews_active >= 1) {
    candidates.push({
      key: 'first_interview',
      message: 'First interview! They want to meet you.',
    })
  }

  if (ctx.total_applications >= 10) {
    candidates.push({
      key: 'ten_applications',
      message: '10 applications. You\'re in the groove.',
    })
  }

  if (ctx.total_applications >= 1) {
    candidates.push({
      key: 'first_application',
      message: 'First application submitted!',
    })
  }

  if (ctx.jobs_reviewed_this_week >= 5) {
    candidates.push({
      key: 'five_reviews_week',
      message: '5 jobs reviewed this week — that\'s real progress.',
    })
  }

  if (ctx.jobs_reviewed_this_week >= 1 && ctx.total_applications === 0) {
    candidates.push({
      key: 'first_review',
      message: 'First job reviewed!',
    })
  }

  // Return the highest-priority unseen milestone.
  for (const candidate of candidates) {
    if (!seen.has(candidate.key)) {
      return candidate
    }
  }

  return null
}
