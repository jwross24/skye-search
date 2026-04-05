import type { ModifierBreakdown } from './urgency-scoring'

/**
 * Map of modifier name → human-readable reason.
 * Covers every unique modifier name emitted by urgency-scoring.ts.
 * Unknown names fall through to humanize() which title-cases the name.
 */
const REASON_LABELS: Record<string, string> = {
  // Hard stops (returned as only modifier)
  ineligible_security_clearance_or_citizenship: 'Requires clearance or citizenship',
  expired_deadline: 'Deadline has passed',

  // Grace period overrides
  grace_period_canada: 'Canada route — grace period',
  grace_period_us_zeroed: 'Grace period active',

  // Positive modifiers
  boston_metro: 'Boston area match',
  high_h1b_filer: 'Strong H-1B sponsor',
  direct_fit: 'Direct fit — confirmed cap-exempt',
  deadline_sprint_7d: 'Deadline in 7 days',
  deadline_sprint_14d: 'Deadline in 14 days',
  quick_apply_high_pressure: 'Quick apply — time sensitive',
  canada_urgency_60d: 'Canada route — under 60 days',
  canada_urgency_90d: 'Canada route — under 90 days',
  conversion_urgency: 'Bridge-to-perm window closing',

  // Negative modifiers
  academic_dead_zone_cliff: 'Academic hiring cycle — too late',
  academic_urgency_penalty: 'Academic hiring cycle lag',
  freshness_decay: 'Posting may be stale',
  stale_until_filled: 'Old "until filled" posting',
}

export function getPrimaryReason(modifiers: ModifierBreakdown[]): string {
  if (!modifiers.length) return 'Relevant to your search'

  // Highest positive modifier wins.
  // If all are negative (e.g. expired), use highest absolute value.
  const sorted = [...modifiers].sort((a, b) => {
    if (a.value > 0 && b.value > 0) return b.value - a.value
    if (a.value > 0) return -1
    if (b.value > 0) return 1
    return Math.abs(b.value) - Math.abs(a.value)
  })

  const top = sorted[0]
  return REASON_LABELS[top.name] ?? humanize(top.name)
}

function humanize(s: string): string {
  return s.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase())
}
