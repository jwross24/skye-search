import { describe, it, expect } from 'vitest'
import { getStalenessLevel, getNudgeMessage, getThresholds } from './application-staleness'

describe('getStalenessLevel', () => {
  it('returns fresh when under nudge threshold', () => {
    expect(getStalenessLevel(2, 'interested', 'academic', false)).toBe('fresh')
  })

  it('returns stale when over nudge threshold', () => {
    expect(getStalenessLevel(6, 'interested', 'academic', false)).toBe('stale')
  })

  it('returns stale when over cooldown threshold', () => {
    expect(getStalenessLevel(15, 'interested', 'academic', false)).toBe('stale')
  })

  it('returns ghosted when over ghosted threshold', () => {
    expect(getStalenessLevel(57, 'interested', 'academic', false)).toBe('ghosted')
  })

  it('returns archived when over archive threshold', () => {
    expect(getStalenessLevel(91, 'interested', 'academic', false)).toBe('archived')
  })

  it('source-aware: academic has longer thresholds than industry', () => {
    // 15 days in "applied": fresh for academic (nudge at 28), stale for industry (nudge at 14)
    expect(getStalenessLevel(15, 'applied', 'academic', false)).toBe('fresh')
    expect(getStalenessLevel(15, 'applied', 'industry', false)).toBe('stale')
  })

  it('source-aware: government has longest applied thresholds', () => {
    // 30 days in applied: fresh for government (nudge at 35)
    expect(getStalenessLevel(30, 'applied', 'government', false)).toBe('fresh')
    // 36 days: stale for government
    expect(getStalenessLevel(36, 'applied', 'government', false)).toBe('stale')
  })

  it('deadline acceleration: nudge at 2 days when deadline within 14 days for interested', () => {
    expect(getStalenessLevel(2, 'interested', 'academic', true, 10)).toBe('stale')
    // Without deadline, 2 days is fresh
    expect(getStalenessLevel(2, 'interested', 'academic', false)).toBe('fresh')
  })

  it('deadline acceleration: works for tailoring status', () => {
    expect(getStalenessLevel(2, 'tailoring', 'industry', true, 7)).toBe('stale')
    expect(getStalenessLevel(2, 'tailoring', 'industry', false)).toBe('fresh')
  })

  it('deadline acceleration: does not apply when deadline > 14 days', () => {
    expect(getStalenessLevel(2, 'interested', 'academic', true, 30)).toBe('fresh')
  })

  it('deadline acceleration: does not apply to applied status', () => {
    expect(getStalenessLevel(2, 'applied', 'academic', true, 5)).toBe('fresh')
  })

  it('returns fresh for unknown status', () => {
    expect(getStalenessLevel(100, 'offer', 'academic', false)).toBe('fresh')
  })

  it('returns fresh for unknown source type', () => {
    expect(getStalenessLevel(100, 'applied', 'unknown' as never, false)).toBe('fresh')
  })

  it('until_filled: between academic and industry for applied', () => {
    // 22 days in applied: stale for until_filled (nudge at 21), fresh for academic (nudge at 28)
    expect(getStalenessLevel(22, 'applied', 'until_filled', false)).toBe('stale')
    expect(getStalenessLevel(22, 'applied', 'academic', false)).toBe('fresh')
  })
})

describe('getNudgeMessage', () => {
  it('returns null when fresh (under nudge threshold)', () => {
    expect(getNudgeMessage('interested', 'Acme Corp', 'academic', 3)).toBeNull()
  })

  it('interested >5 days academic: shows "still interested?" with 3 actions', () => {
    const result = getNudgeMessage('interested', 'MIT', 'academic', 6)
    expect(result).not.toBeNull()
    expect(result!.message).toContain('MIT')
    expect(result!.message).toContain('still interested')
    expect(result!.actions).toHaveLength(3)
    expect(result!.actions.map((a) => a.action)).toEqual(['advance', 'snooze', 'remove'])
  })

  it('tailoring >3 days industry: shows "still interested?" message', () => {
    const result = getNudgeMessage('tailoring', 'Google', 'industry', 4)
    expect(result).not.toBeNull()
    expect(result!.message).toContain('Google')
    expect(result!.actions.map((a) => a.action)).toEqual(['advance', 'snooze', 'remove'])
  })

  it('applied >14 days industry: shows "any updates?" with 2 actions', () => {
    const result = getNudgeMessage('applied', 'Amazon', 'industry', 15)
    expect(result).not.toBeNull()
    expect(result!.message).toContain('Amazon')
    expect(result!.message).toContain('15 days ago')
    expect(result!.actions).toHaveLength(2)
    expect(result!.actions.map((a) => a.action)).toEqual(['advance', 'snooze'])
  })

  it('applied >28 days industry (ghosted): shows "normal for this timeline"', () => {
    const result = getNudgeMessage('applied', 'Meta', 'industry', 29)
    expect(result).not.toBeNull()
    expect(result!.message).toContain('Meta')
    expect(result!.message).toContain('normal for this timeline')
    expect(result!.actions.map((a) => a.action)).toEqual(['snooze', 'remove'])
  })

  it('applied >56 days academic (ghosted): shows "normal for academic hiring"', () => {
    const result = getNudgeMessage('applied', 'Harvard', 'academic', 57)
    expect(result).not.toBeNull()
    expect(result!.message).toContain('normal for academic hiring')
  })

  it('applied >70 days government (ghosted): shows "normal for government hiring"', () => {
    const result = getNudgeMessage('applied', 'USGS', 'government', 71)
    expect(result).not.toBeNull()
    expect(result!.message).toContain('normal for government hiring')
  })

  it('deadline within 14 days: accelerated message with company name + days', () => {
    const futureDeadline = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const result = getNudgeMessage('interested', 'Stanford', 'academic', 3, futureDeadline)
    expect(result).not.toBeNull()
    expect(result!.message).toContain('Stanford')
    expect(result!.message).toContain('closes in')
    expect(result!.message).toContain('days')
    expect(result!.actions.map((a) => a.action)).toEqual(['advance', 'remove'])
  })

  it('deadline > 14 days away: no accelerated message', () => {
    const farDeadline = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    // Still returns regular nudge if past nudge threshold
    const result = getNudgeMessage('interested', 'MIT', 'academic', 6, farDeadline)
    expect(result).not.toBeNull()
    expect(result!.message).not.toContain('closes in')
    expect(result!.message).toContain('still interested')
  })

  it('returns null for phone_screen and interview (no nudge messages defined)', () => {
    // phone_screen and interview statuses have thresholds but no specific messages
    expect(getNudgeMessage('phone_screen', 'Acme', 'academic', 100)).toBeNull()
    expect(getNudgeMessage('interview', 'Acme', 'academic', 100)).toBeNull()
  })

  it('returns null for offer status', () => {
    expect(getNudgeMessage('offer', 'Acme', 'academic', 100)).toBeNull()
  })
})

describe('getThresholds', () => {
  it('returns thresholds for valid source/status combo', () => {
    const t = getThresholds('academic', 'applied')
    expect(t).not.toBeNull()
    expect(t!.nudgeDays).toBe(28)
    expect(t!.archiveDays).toBe(90)
  })

  it('returns null for unknown status', () => {
    expect(getThresholds('academic', 'offer')).toBeNull()
  })

  it('returns null for unknown source type', () => {
    expect(getThresholds('unknown' as never, 'applied')).toBeNull()
  })
})
