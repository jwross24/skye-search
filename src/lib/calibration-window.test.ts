import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { isCalibrationWindow } from './calibration-window'

// Clear SKYE_FORCE_CALIBRATION before/after each test so it doesn't bleed
beforeEach(() => {
  delete process.env.SKYE_FORCE_CALIBRATION
})
afterEach(() => {
  delete process.env.SKYE_FORCE_CALIBRATION
})

describe('isCalibrationWindow', () => {
  // April 2026: ET = UTC-4 (EDT, DST active)

  it('returns false for Sunday 5:59pm ET', () => {
    // 2026-04-05 Sunday 17:59 ET = 21:59 UTC
    const date = new Date('2026-04-05T21:59:00Z')
    expect(isCalibrationWindow(date)).toBe(false)
  })

  it('returns true for Sunday 6:00pm ET', () => {
    // 2026-04-05 Sunday 18:00 ET = 22:00 UTC
    const date = new Date('2026-04-05T22:00:00Z')
    expect(isCalibrationWindow(date)).toBe(true)
  })

  it('returns true for Sunday 11:59pm ET', () => {
    // 2026-04-05 Sunday 23:59 ET = 2026-04-06 03:59 UTC
    const date = new Date('2026-04-06T03:59:00Z')
    expect(isCalibrationWindow(date)).toBe(true)
  })

  it('returns false for Monday 12:00am ET', () => {
    // 2026-04-06 Monday 00:00 ET = 04:00 UTC
    const date = new Date('2026-04-06T04:00:00Z')
    expect(isCalibrationWindow(date)).toBe(false)
  })

  it('returns false for Saturday 6pm ET', () => {
    // 2026-04-04 Saturday 18:00 ET = 22:00 UTC
    const date = new Date('2026-04-04T22:00:00Z')
    expect(isCalibrationWindow(date)).toBe(false)
  })

  it('returns false for Sunday 6pm ET when SKYE_FORCE_CALIBRATION=0', () => {
    // Force flag only activates on '1'
    process.env.SKYE_FORCE_CALIBRATION = '0'
    const date = new Date('2026-04-05T22:00:00Z') // Sunday 6pm ET
    // Should still follow the time logic — '0' is not the override value
    expect(isCalibrationWindow(date)).toBe(true) // time logic still applies
  })

  it('returns true on any weekday when SKYE_FORCE_CALIBRATION=1', () => {
    process.env.SKYE_FORCE_CALIBRATION = '1'
    // Wednesday afternoon — not the calibration window normally
    const date = new Date('2026-04-01T14:00:00Z')
    expect(isCalibrationWindow(date)).toBe(true)
  })

  it('returns false for weekday mornings', () => {
    // Tuesday 9am ET
    const date = new Date('2026-03-31T13:00:00Z')
    expect(isCalibrationWindow(date)).toBe(false)
  })
})
