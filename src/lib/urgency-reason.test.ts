import { describe, it, expect } from 'vitest'
import { getPrimaryReason } from './urgency-reason'
import type { ModifierBreakdown } from './urgency-scoring'

describe('getPrimaryReason', () => {
  it('returns fallback for empty modifiers', () => {
    expect(getPrimaryReason([])).toBe('Relevant to your search')
  })

  it('picks the highest positive modifier', () => {
    const modifiers: ModifierBreakdown[] = [
      { name: 'boston_metro', value: 0.05 },
      { name: 'deadline_sprint_7d', value: 0.10 },
      { name: 'high_h1b_filer', value: 0.03 },
    ]
    expect(getPrimaryReason(modifiers)).toBe('Deadline in 7 days')
  })

  it('uses known label for direct_fit', () => {
    const modifiers: ModifierBreakdown[] = [
      { name: 'direct_fit', value: 0.02 },
    ]
    expect(getPrimaryReason(modifiers)).toBe('Direct fit — confirmed cap-exempt')
  })

  it('uses known label for cap-exempt bonus (boston_metro)', () => {
    const modifiers: ModifierBreakdown[] = [
      { name: 'boston_metro', value: 0.05 },
    ]
    expect(getPrimaryReason(modifiers)).toBe('Boston area match')
  })

  it('prefers positive over negative modifiers', () => {
    const modifiers: ModifierBreakdown[] = [
      { name: 'freshness_decay', value: -0.10 },
      { name: 'boston_metro', value: 0.05 },
    ]
    expect(getPrimaryReason(modifiers)).toBe('Boston area match')
  })

  it('falls back to highest absolute value when all negative', () => {
    const modifiers: ModifierBreakdown[] = [
      { name: 'freshness_decay', value: -0.10 },
      { name: 'academic_urgency_penalty', value: -0.20 },
    ]
    // academic_urgency_penalty has higher absolute value (-0.20)
    expect(getPrimaryReason(modifiers)).toBe('Academic hiring cycle lag')
  })

  it('humanizes unknown modifier names', () => {
    const modifiers: ModifierBreakdown[] = [
      { name: 'some_unknown_modifier', value: 0.05 },
    ]
    expect(getPrimaryReason(modifiers)).toBe('Some unknown modifier')
  })

  it('handles single negative modifier', () => {
    const modifiers: ModifierBreakdown[] = [
      { name: 'expired_deadline', value: -1.0 },
    ]
    expect(getPrimaryReason(modifiers)).toBe('Deadline has passed')
  })

  it('handles conversion_urgency modifier', () => {
    const modifiers: ModifierBreakdown[] = [
      { name: 'conversion_urgency', value: 0.05 },
    ]
    expect(getPrimaryReason(modifiers)).toBe('Bridge-to-perm window closing')
  })

  it('handles canada urgency modifiers', () => {
    const mods60: ModifierBreakdown[] = [{ name: 'canada_urgency_60d', value: 0.12 }]
    const mods90: ModifierBreakdown[] = [{ name: 'canada_urgency_90d', value: 0.08 }]
    expect(getPrimaryReason(mods60)).toBe('Canada route — under 60 days')
    expect(getPrimaryReason(mods90)).toBe('Canada route — under 90 days')
  })
})
