import { describe, it, expect } from 'vitest'
import { getCalibrationWeekStart } from './calibration-week'

describe('getCalibrationWeekStart', () => {
  it('returns Monday for a Sunday input (Sunday belongs to the prior week)', () => {
    // Sunday April 5, 2026 at 7pm ET = 2026-04-05T23:00:00Z
    // This week's Monday was March 30
    const sunday = new Date('2026-04-05T23:00:00Z')
    const result = getCalibrationWeekStart(sunday)
    expect(result.toISOString().split('T')[0]).toBe('2026-03-30')
  })

  it('returns the same Monday for a Monday input', () => {
    // Monday April 6, 2026 (verified: April 6 is Monday in ET)
    const monday = new Date('2026-04-06T14:00:00Z') // Monday 10am ET (EDT=UTC-4)
    const result = getCalibrationWeekStart(monday)
    expect(result.toISOString().split('T')[0]).toBe('2026-04-06')
  })

  it('returns the correct Monday for a Wednesday input', () => {
    // Wednesday April 8, 2026
    const wednesday = new Date('2026-04-08T14:00:00Z')
    const result = getCalibrationWeekStart(wednesday)
    expect(result.toISOString().split('T')[0]).toBe('2026-04-06')
  })

  it('returns the correct Monday for a Saturday input', () => {
    // Saturday April 11, 2026
    const saturday = new Date('2026-04-11T14:00:00Z')
    const result = getCalibrationWeekStart(saturday)
    expect(result.toISOString().split('T')[0]).toBe('2026-04-06')
  })

  it('returns the prior Monday for a Sunday (Sunday belongs to prev week)', () => {
    // Sunday April 12, 2026 — belongs to the week that started April 6
    const sunday = new Date('2026-04-12T14:00:00Z')
    const result = getCalibrationWeekStart(sunday)
    expect(result.toISOString().split('T')[0]).toBe('2026-04-06')
  })

  it('handles DST boundary in March (spring forward)', () => {
    // Sunday March 8, 2026 — DST starts that day in US
    const sunday = new Date('2026-03-08T20:00:00Z') // after spring-forward
    const result = getCalibrationWeekStart(sunday)
    // Monday of that week is March 2
    expect(result.toISOString().split('T')[0]).toBe('2026-03-02')
  })

  it('returns ISO date string usable for DB storage', () => {
    const date = new Date('2026-04-05T22:00:00Z')
    const result = getCalibrationWeekStart(date)
    const iso = result.toISOString().split('T')[0]
    // Should be a valid YYYY-MM-DD string
    expect(iso).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})
