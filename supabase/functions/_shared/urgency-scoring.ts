/**
 * Urgency Scoring Algorithm (Deno mirror)
 *
 * Mirror of src/lib/urgency-scoring.ts for use in Edge Functions.
 * Pure function: no DB calls, no side effects, no external deps.
 *
 * KEEP IN SYNC with src/lib/urgency-scoring.ts — both files implement
 * the same algorithm. Changes to one must be reflected in the other.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export type SourceType = 'industry' | 'government' | 'academic' | 'until_filled'
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

export interface JobInput {
  visa_path: VisaPath
  employer_type: EmployerType
  cap_exempt_confidence: CapExemptConfidence
  employment_type: EmploymentType
  source_type: SourceType | null
  location: string | null
  h1b_sponsor_count: number | null
  application_deadline: string | null
  application_complexity: string | null
  indexed_date: string | null
  requires_security_clearance?: boolean
  requires_citizenship?: boolean
}

export interface UserState {
  days_remaining: number
  is_employed: boolean
  offer_accepted_not_started: boolean
  employment_end_date: string | null
  in_grace_period: boolean
  today: string
}

export interface ApplicationContext {
  has_active_application: boolean
  has_interview: boolean
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

  if (job.requires_security_clearance || job.requires_citizenship) {
    return {
      urgency_score: -1.0,
      base_score: -1.0,
      modifiers: [{ name: 'ineligible_security_clearance_or_citizenship', value: -1.0 }],
      final_before_clamp: -1.0,
    }
  }

  const clock_pressure = 1 - user.days_remaining / 150

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
    const raw_bridge = 0.65 + 0.25 * clock_pressure
    if (user.is_employed) {
      base_score = 0
    } else if (user.offer_accepted_not_started) {
      base_score = raw_bridge / 2
    } else {
      base_score = raw_bridge
    }
  } else if (isCapExempt && isFullTime) {
    base_score = 0.85
    if (job.cap_exempt_confidence === 'likely') {
      base_score *= 0.95
    } else if (job.cap_exempt_confidence === 'unverified' || job.cap_exempt_confidence === 'none') {
      base_score *= 0.85
    }
  } else if (job.visa_path === 'canada') {
    base_score = 0.60
  } else if (job.visa_path === 'opt_compatible') {
    base_score = 0.50
  } else if (job.visa_path === 'cap_subject') {
    base_score = 0.40
  }

  // ─── Modifiers ───────────────────────────────────────────────────────────

  if (job.location && isBoston(job.location)) {
    modifiers.push({ name: 'boston_metro', value: 0.05 })
  }

  if (job.h1b_sponsor_count !== null && job.h1b_sponsor_count !== undefined && job.h1b_sponsor_count > 25) {
    modifiers.push({ name: 'high_h1b_filer', value: 0.03 })
  }

  if (isCapExempt && isFullTime && job.cap_exempt_confidence === 'confirmed') {
    modifiers.push({ name: 'direct_fit', value: 0.02 })
  }

  if (job.application_deadline) {
    const daysUntilDeadline = daysBetween(user.today, job.application_deadline)
    if (daysUntilDeadline >= 0 && daysUntilDeadline <= 7) {
      modifiers.push({ name: 'deadline_sprint_7d', value: 0.10 })
    } else if (daysUntilDeadline > 7 && daysUntilDeadline <= 14) {
      modifiers.push({ name: 'deadline_sprint_14d', value: 0.05 })
    }
  }

  if (job.application_complexity === 'quick_apply' && clock_pressure > 0.6) {
    modifiers.push({ name: 'quick_apply_high_pressure', value: 0.03 })
  }

  if (user.is_employed && user.employment_end_date && isCapExempt && isFullTime) {
    const daysUntilEnd = daysBetween(user.today, user.employment_end_date)
    if (daysUntilEnd > 0 && user.days_remaining < 75) {
      modifiers.push({ name: 'conversion_urgency', value: 0.05 })
    }
  }

  if (
    ACADEMIC_EMPLOYER_TYPES.includes(job.employer_type) &&
    isFullTime &&
    user.days_remaining < 60 &&
    !isPartTime
  ) {
    if (
      user.days_remaining <= 21 &&
      !application.has_active_application &&
      !application.has_interview
    ) {
      modifiers.push({ name: 'academic_dead_zone_cliff', value: -0.40 })
    } else if (!application.has_interview) {
      const factor = Math.max(0, (60 - user.days_remaining) / 60)
      const penalty = -(0.15 * factor)
      if (penalty < 0) {
        modifiers.push({ name: 'academic_urgency_penalty', value: penalty })
      }
    }
  }

  if (job.indexed_date && job.source_type) {
    const window = FRESHNESS_WINDOWS[job.source_type] ?? 7
    const daysSinceIndexed = daysBetween(job.indexed_date, user.today)
    const daysPastWindow = daysSinceIndexed - window

    if (daysPastWindow > 0) {
      const weeksPast = daysPastWindow / 7
      const decay = Math.max(-0.30, -(0.02 * weeksPast))
      modifiers.push({ name: 'freshness_decay', value: decay })
    }
  }

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

  return { urgency_score, base_score, modifiers, final_before_clamp }
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
