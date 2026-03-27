import { describe, it, expect } from 'vitest'
import { shouldSuppressForBreakMode } from './email-alerts'

describe('shouldSuppressForBreakMode', () => {
  const futureBreak = '2099-12-31T23:59:59Z'
  const pastBreak = '2020-01-01T00:00:00Z'

  it('returns false when break mode is null (not active)', () => {
    expect(shouldSuppressForBreakMode(null, 'unemployment_digest', 20)).toBe(false)
    expect(shouldSuppressForBreakMode(null, 'deadline_72h')).toBe(false)
    expect(shouldSuppressForBreakMode(null, 'cron_failure')).toBe(false)
  })

  it('returns false when break mode has expired', () => {
    expect(shouldSuppressForBreakMode(pastBreak, 'unemployment_digest', 20)).toBe(false)
    expect(shouldSuppressForBreakMode(pastBreak, 'deadline_72h')).toBe(false)
  })

  it('suppresses unemployment_digest when >15 days during break mode', () => {
    expect(shouldSuppressForBreakMode(futureBreak, 'unemployment_digest', 20)).toBe(true)
    expect(shouldSuppressForBreakMode(futureBreak, 'unemployment_digest', 29)).toBe(true)
  })

  it('does NOT suppress unemployment_digest when <=15 days (critical)', () => {
    expect(shouldSuppressForBreakMode(futureBreak, 'unemployment_digest', 15)).toBe(false)
    expect(shouldSuppressForBreakMode(futureBreak, 'unemployment_digest', 10)).toBe(false)
    expect(shouldSuppressForBreakMode(futureBreak, 'unemployment_digest', 1)).toBe(false)
  })

  it('does NOT suppress deadline_72h during break mode (always critical)', () => {
    expect(shouldSuppressForBreakMode(futureBreak, 'deadline_72h')).toBe(false)
  })

  it('does NOT suppress cron_failure during break mode (developer alert)', () => {
    expect(shouldSuppressForBreakMode(futureBreak, 'cron_failure')).toBe(false)
  })
})
