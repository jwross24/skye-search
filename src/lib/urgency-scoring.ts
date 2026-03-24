/**
 * Urgency Scoring Algorithm — the mathematical expression of the Strategic Pathway Hierarchy.
 * Pure function: no DB calls, no side effects. Receives all data as params.
 *
 * Score range: [0.0, 1.0] (clamped). -1.0 for ineligible (security clearance/citizenship).
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export type VisaPath = 'cap_exempt' | 'cap_subject' | 'opt_compatible' | 'canada' | 'unknown'
export type EmployerType =
  | 'university'
  | 'nonprofit_research'
  | 'cooperative_institute'
  | 'government_contractor'
  | 'government_direct'
  | 'private_sector'
  | 'unknown'
export type CapExemptConfidence = 'none' | 'unverified' | 'likely' | 'confirmed'
export type EmploymentType = 'full_time' | 'part_time' | 'contract' | 'unknown'
export type SourceType = 'industry' | 'government' | 'academic' | 'until_filled'

export interface JobInput {
  visa_path: VisaPath
  employer_type: EmployerType
  cap_exempt_confidence: CapExemptConfidence
  employment_type: EmploymentType
  source_type: SourceType | null
  location: string | null
  h1b_sponsor_count: number | null
  application_deadline: string | null // ISO date
  application_complexity: string | null
  indexed_date: string | null // ISO date or timestamptz
  requires_security_clearance?: boolean
  requires_citizenship?: boolean
}

export interface UserState {
  days_remaining: number // 150 - days_used
  is_employed: boolean // employment_active from cron (start_date <= today)
  offer_accepted_not_started: boolean // has accepted offer but start_date > today
  employment_end_date: string | null // ISO date, nullable
  in_grace_period: boolean
  today: string // ISO date for relative calculations
}

export interface ApplicationContext {
  has_active_application: boolean // kanban_status in ('interested'..'offer_accepted','h1b_filed')
  has_interview: boolean // kanban_status = 'interview'
}

export interface ScoringResult {
  urgency_score: number
  base_score: number
  modifiers: ModifierBreakdown[]
  final_before_clamp: number
}

export interface ModifierBreakdown {
  name: string
  value: number
}

// ─── Constants ───────────────────────────────────────────────────────────────

const FRESHNESS_WINDOWS: Record<string, number> = {
  industry: 7,
  government: 30,
  academic: 90,
  until_filled: 90,
}

const ACADEMIC_EMPLOYER_TYPES: EmployerType[] = [
  'university',
  'government_direct',
  'cooperative_institute',
]

// ─── Core Algorithm ──────────────────────────────────────────────────────────

export function computeUrgencyScore(
  job: JobInput,
  user: UserState,
  application: ApplicationContext = { has_active_application: false, has_interview: false },
): ScoringResult {
  const modifiers: ModifierBreakdown[] = []

  // Ineligibility check — hard -1.0
  if (job.requires_security_clearance || job.requires_citizenship) {
    return {
      urgency_score: -1.0,
      base_score: -1.0,
      modifiers: [{ name: 'ineligible_security_clearance_or_citizenship', value: -1.0 }],
      final_before_clamp: -1.0,
    }
  }

  const clock_pressure = 1 - user.days_remaining / 150

  // Grace period override
  if (user.in_grace_period) {
    if (job.visa_path === 'canada') {
      return {
        urgency_score: 0.95,
        base_score: 0.95,
        modifiers: [{ name: 'grace_period_canada', value: 0.95 }],
        final_before_clamp: 0.95,
      }
    }
    return {
      urgency_score: 0.0,
      base_score: 0.0,
      modifiers: [{ name: 'grace_period_us_zeroed', value: 0.0 }],
      final_before_clamp: 0.0,
    }
  }

  // ─── Base Score ──────────────────────────────────────────────────────────
  let base_score = 0

  const isCapExempt = job.visa_path === 'cap_exempt'
  const isPartTime = job.employment_type === 'part_time'
  const isFullTime = job.employment_type === 'full_time' || job.employment_type === 'unknown'

  if (isCapExempt && isPartTime) {
    // Bridge job scoring
    const raw_bridge = 0.65 + 0.25 * clock_pressure

    if (user.is_employed) {
      // Already employed and started — no need for second bridge
      base_score = 0
    } else if (user.offer_accepted_not_started) {
      // Accepted but not started — halve bridge score
      base_score = raw_bridge / 2
    } else {
      base_score = raw_bridge
    }
  } else if (isCapExempt && isFullTime) {
    // Cap-exempt full-time: 0.85 with confidence discount
    base_score = 0.85
    if (job.cap_exempt_confidence === 'likely') {
      base_score *= 0.95 // → 0.8075
    } else if (job.cap_exempt_confidence === 'unverified' || job.cap_exempt_confidence === 'none') {
      base_score *= 0.85 // → 0.7225
    }
    // 'confirmed' = no discount
  } else if (job.visa_path === 'canada') {
    base_score = 0.60
  } else if (job.visa_path === 'opt_compatible') {
    base_score = 0.50
  } else if (job.visa_path === 'cap_subject') {
    base_score = 0.40
  }
  // 'unknown' visa_path gets 0

  // ─── Modifiers ───────────────────────────────────────────────────────────

  // Boston metro
  if (job.location && isBoston(job.location)) {
    modifiers.push({ name: 'boston_metro', value: 0.05 })
  }

  // High H1-B filer
  if (job.h1b_sponsor_count != null && job.h1b_sponsor_count > 25) {
    modifiers.push({ name: 'high_h1b_filer', value: 0.03 })
  }

  // Direct fit (cap-exempt full-time roles are "direct fit" by default)
  if (isCapExempt && isFullTime && job.cap_exempt_confidence === 'confirmed') {
    modifiers.push({ name: 'direct_fit', value: 0.02 })
  }

  // Deadline sprint
  if (job.application_deadline) {
    const daysUntilDeadline = daysBetween(user.today, job.application_deadline)
    if (daysUntilDeadline >= 0 && daysUntilDeadline <= 7) {
      modifiers.push({ name: 'deadline_sprint_7d', value: 0.10 })
    } else if (daysUntilDeadline > 7 && daysUntilDeadline <= 14) {
      modifiers.push({ name: 'deadline_sprint_14d', value: 0.05 })
    }
  }

  // Quick apply at high clock pressure
  if (
    job.application_complexity === 'quick_apply' &&
    clock_pressure > 0.6
  ) {
    modifiers.push({ name: 'quick_apply_high_pressure', value: 0.03 })
  }

  // Conversion urgency: if employed with known end_date, and projected
  // days_remaining post-bridge < 75, full-time cap-exempt gets +0.05
  if (
    user.is_employed &&
    user.employment_end_date &&
    isCapExempt &&
    isFullTime
  ) {
    const daysUntilEnd = daysBetween(user.today, user.employment_end_date)
    if (daysUntilEnd > 0) {
      const projectedRemaining = user.days_remaining - 0 // clock paused while employed
      // After bridge ends, clock resumes. Projected days = current remaining
      // (since clock is paused now). But if end_date is known, we're looking at
      // how much runway she'll have after employment ends.
      if (projectedRemaining < 75) {
        modifiers.push({ name: 'conversion_urgency', value: 0.05 })
      }
    }
  }

  // Academic urgency penalty (only for academic full-time, not bridge)
  if (
    ACADEMIC_EMPLOYER_TYPES.includes(job.employer_type) &&
    isFullTime &&
    user.days_remaining < 60 &&
    !isPartTime
  ) {
    // Check for dead zone cliff first (replaces gradual)
    if (
      user.days_remaining <= 21 &&
      !application.has_active_application &&
      !application.has_interview
    ) {
      // Dead zone cliff: -0.40 for cold applications at <= 21 days
      modifiers.push({ name: 'academic_dead_zone_cliff', value: -0.40 })
    } else if (!application.has_interview) {
      // Gradual academic urgency penalty
      const factor = Math.max(0, (60 - user.days_remaining) / 60)
      const penalty = -(0.15 * factor)
      if (penalty < 0) {
        modifiers.push({ name: 'academic_urgency_penalty', value: penalty })
      }
    }
    // If has_interview, penalty is suppressed entirely
  }

  // Freshness decay
  if (job.indexed_date && job.source_type) {
    const window = FRESHNESS_WINDOWS[job.source_type] ?? 7
    const daysSinceIndexed = daysBetween(job.indexed_date, user.today)
    const daysPastWindow = daysSinceIndexed - window

    if (daysPastWindow > 0) {
      const weeksPast = daysPastWindow / 7
      const decay = Math.max(-0.30, -(0.02 * weeksPast)) // floor at -0.30
      modifiers.push({ name: 'freshness_decay', value: decay })
    }
  }

  // Stale "until filled" penalty
  if (job.source_type === 'until_filled' && job.indexed_date) {
    const daysSinceIndexed = daysBetween(job.indexed_date, user.today)
    if (daysSinceIndexed > 90) {
      modifiers.push({ name: 'stale_until_filled', value: -0.05 })
    }
  }

  // ─── Sum & Clamp ────────────────────────────────────────────────────────

  const totalModifiers = modifiers.reduce((sum, m) => sum + m.value, 0)
  const final_before_clamp = base_score + totalModifiers
  const urgency_score = Math.max(0.0, Math.min(1.0, final_before_clamp))

  return {
    urgency_score,
    base_score,
    modifiers,
    final_before_clamp,
  }
}

// ─── Batch Scoring ───────────────────────────────────────────────────────────

export function computeUrgencyScores(
  jobs: JobInput[],
  user: UserState,
  applicationsByJobId?: Map<string, ApplicationContext>,
): ScoringResult[] {
  return jobs.map((job, i) => {
    const appCtx = applicationsByJobId?.get(String(i)) ?? {
      has_active_application: false,
      has_interview: false,
    }
    return computeUrgencyScore(job, user, appCtx)
  })
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function daysBetween(fromDate: string, toDate: string): number {
  const from = new Date(fromDate + (fromDate.includes('T') ? '' : 'T00:00:00Z'))
  const to = new Date(toDate + (toDate.includes('T') ? '' : 'T00:00:00Z'))
  return Math.floor((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24))
}

function isBoston(location: string): boolean {
  const normalized = location.toLowerCase()
  return (
    normalized.includes('boston') ||
    normalized.includes('cambridge, ma') ||
    normalized.includes('somerville, ma') ||
    normalized.includes('brookline, ma') ||
    normalized.includes('quincy, ma')
  )
}
