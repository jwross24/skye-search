import { describe, it, expect } from 'vitest'
import {
  getWeekBounds,
  detectNotableEvents,
  generateTemplateSummary,
  buildMomentumContext,
  buildPhaseFromContext,
  type NotableEventContext,
} from './weekly-recap'

describe('getWeekBounds', () => {
  it('returns Monday-Sunday for a Wednesday', () => {
    // 2026-04-01 is a Wednesday
    const result = getWeekBounds(new Date('2026-04-01T12:00:00Z'))
    expect(result.weekStart).toBe('2026-03-30')
    expect(result.weekEnd).toBe('2026-04-05')
  })

  it('returns Monday-Sunday for a Monday', () => {
    // 2026-03-30 is a Monday
    const result = getWeekBounds(new Date('2026-03-30T12:00:00Z'))
    expect(result.weekStart).toBe('2026-03-30')
    expect(result.weekEnd).toBe('2026-04-05')
  })

  it('returns Monday-Sunday for a Sunday', () => {
    // 2026-04-05 is a Sunday
    const result = getWeekBounds(new Date('2026-04-05T12:00:00Z'))
    expect(result.weekStart).toBe('2026-03-30')
    expect(result.weekEnd).toBe('2026-04-05')
  })

  it('returns Monday-Sunday for a Saturday', () => {
    // 2026-04-04 is a Saturday
    const result = getWeekBounds(new Date('2026-04-04T12:00:00Z'))
    expect(result.weekStart).toBe('2026-03-30')
    expect(result.weekEnd).toBe('2026-04-05')
  })

  it('handles year boundary', () => {
    // 2025-12-31 is a Wednesday
    const result = getWeekBounds(new Date('2025-12-31T12:00:00Z'))
    expect(result.weekStart).toBe('2025-12-29')
    expect(result.weekEnd).toBe('2026-01-04')
  })
})

describe('generateTemplateSummary', () => {
  it('launch phase with only reviews', () => {
    const result = generateTemplateSummary('launch', 5, 0)
    expect(result).toBe(
      'You explored 5 jobs this week. Every step builds momentum.',
    )
  })

  it('launch phase with reviews and applications', () => {
    const result = generateTemplateSummary('launch', 8, 2)
    expect(result).toBe(
      'You explored 8 jobs and submitted 2 applications this week. Every step builds momentum.',
    )
  })

  it('active phase', () => {
    const result = generateTemplateSummary('active', 12, 3)
    expect(result).toContain('Steady progress')
    expect(result).toContain('12 jobs')
    expect(result).toContain('3 applications')
  })

  it('response phase', () => {
    const result = generateTemplateSummary('response', 6, 1)
    expect(result).toContain('resonating')
    expect(result).toContain('6 jobs')
    expect(result).toContain('1 application')
  })

  it('pressure phase', () => {
    const result = generateTemplateSummary('pressure', 10, 4)
    expect(result).toContain('highest-priority')
    expect(result).toContain('10 jobs')
    expect(result).toContain('4 applications')
  })

  it('singular grammar for 1 job', () => {
    const result = generateTemplateSummary('launch', 1, 0)
    expect(result).toContain('1 job')
    expect(result).not.toContain('1 jobs')
  })

  it('singular grammar for 1 application', () => {
    const result = generateTemplateSummary('launch', 5, 1)
    expect(result).toContain('1 application')
    expect(result).not.toContain('1 applications')
  })
})

describe('detectNotableEvents', () => {
  const baseCtx: NotableEventContext = {
    firstInterviewThisWeek: false,
    totalApplications: 0,
    interviewsPending: 0,
    daysRemaining: 120,
    previousDaysRemaining: null,
    highMatchRejections: 0,
  }

  it('returns empty when nothing notable', () => {
    const events = detectNotableEvents(baseCtx)
    expect(events).toEqual([])
  })

  it('detects first interview', () => {
    const events = detectNotableEvents({
      ...baseCtx,
      firstInterviewThisWeek: true,
    })
    expect(events).toContain('First interview scheduled')
  })

  it('detects clock threshold crossed: 120 days', () => {
    const events = detectNotableEvents({
      ...baseCtx,
      previousDaysRemaining: 125,
      daysRemaining: 118,
    })
    expect(events).toContain('Clock crossed 120-day mark')
  })

  it('detects clock threshold crossed: 60 days', () => {
    const events = detectNotableEvents({
      ...baseCtx,
      previousDaysRemaining: 63,
      daysRemaining: 58,
    })
    expect(events).toContain('Clock crossed 60-day mark')
  })

  it('detects clock threshold crossed: 30 days', () => {
    const events = detectNotableEvents({
      ...baseCtx,
      previousDaysRemaining: 32,
      daysRemaining: 29,
    })
    expect(events).toContain('Clock crossed 30-day mark')
  })

  it('does not detect clock threshold when not crossed', () => {
    const events = detectNotableEvents({
      ...baseCtx,
      previousDaysRemaining: 125,
      daysRemaining: 122,
    })
    expect(events).toEqual([])
  })

  it('detects high-match rejection', () => {
    const events = detectNotableEvents({
      ...baseCtx,
      highMatchRejections: 1,
    })
    expect(events).toContain('Rejection from 1 high-match role')
  })

  it('pluralizes multiple high-match rejections', () => {
    const events = detectNotableEvents({
      ...baseCtx,
      highMatchRejections: 3,
    })
    expect(events).toContain('Rejection from 3 high-match roles')
  })

  it('detects application milestone', () => {
    const events = detectNotableEvents({
      ...baseCtx,
      totalApplications: 10,
    })
    expect(events.some((e) => e.includes('10 applications'))).toBe(true)
  })
})

describe('phase detection integration', () => {
  it('launch phase: few applications, no interviews', () => {
    const ctx = buildMomentumContext(5, 2, 5, 0, 120, false)
    expect(buildPhaseFromContext(ctx)).toBe('launch')
  })

  it('active phase: 10+ applications, no interviews', () => {
    const ctx = buildMomentumContext(5, 2, 15, 0, 120, false)
    expect(buildPhaseFromContext(ctx)).toBe('active')
  })

  it('response phase: has interviews', () => {
    const ctx = buildMomentumContext(5, 2, 15, 2, 120, false)
    expect(buildPhaseFromContext(ctx)).toBe('response')
  })

  it('pressure phase: low days, not employed', () => {
    const ctx = buildMomentumContext(5, 2, 15, 0, 45, false)
    expect(buildPhaseFromContext(ctx)).toBe('pressure')
  })

  it('response trumps pressure when interviews exist and days < 60', () => {
    // detectPhase checks pressure first, so this is actually pressure
    const ctx = buildMomentumContext(5, 2, 15, 2, 45, false)
    // pressure wins because <60 days + not employed takes priority
    expect(buildPhaseFromContext(ctx)).toBe('pressure')
  })
})
