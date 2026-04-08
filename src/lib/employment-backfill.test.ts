import { describe, it, expect } from 'vitest'
import { computeEmploymentEndCorrections } from './employment-backfill'

describe('computeEmploymentEndCorrections', () => {
  const userId = 'user-123'

  it('creates corrections for employed_bridge days after end date', () => {
    const result = computeEmploymentEndCorrections({
      userId,
      endDate: '2026-03-15',
      today: '2026-04-05',
      employmentStartDate: '2026-01-15',
      employedBridgeDates: ['2026-03-16', '2026-03-17', '2026-03-18', '2026-03-20'],
    })

    expect('corrections' in result).toBe(true)
    if ('corrections' in result) {
      expect(result.corrections).toHaveLength(4)
      for (const c of result.corrections) {
        expect(c.user_id).toBe(userId)
        expect(c.original_status).toBe('employed_bridge')
        expect(c.corrected_status).toBe('unemployed')
        expect(c.trigger_source).toBe('retroactive_end_date')
      }
    }
  })

  it('rejects end date in the future', () => {
    const result = computeEmploymentEndCorrections({
      userId,
      endDate: '2026-12-31',
      today: '2026-04-05',
      employmentStartDate: null,
      employedBridgeDates: [],
    })

    expect('error' in result).toBe(true)
    if ('error' in result) {
      expect(result.error).toContain('future')
    }
  })

  it('rejects end date before employment start date', () => {
    const result = computeEmploymentEndCorrections({
      userId,
      endDate: '2026-01-01',
      today: '2026-04-05',
      employmentStartDate: '2026-02-01',
      employedBridgeDates: [],
    })

    expect('error' in result).toBe(true)
    if ('error' in result) {
      expect(result.error).toContain('before employment start')
    }
  })

  it('rejects backfill exceeding 90 days', () => {
    const result = computeEmploymentEndCorrections({
      userId,
      endDate: '2025-12-01',
      today: '2026-04-05',
      employmentStartDate: '2025-06-01',
      employedBridgeDates: [],
    })

    expect('error' in result).toBe(true)
    if ('error' in result) {
      expect(result.error).toContain('90 days')
    }
  })

  it('allows null employment start date (no start date validation)', () => {
    const result = computeEmploymentEndCorrections({
      userId,
      endDate: '2026-03-20',
      today: '2026-04-05',
      employmentStartDate: null,
      employedBridgeDates: ['2026-03-21'],
    })

    expect('corrections' in result).toBe(true)
    if ('corrections' in result) {
      expect(result.corrections).toHaveLength(1)
    }
  })

  it('returns empty corrections when no employed_bridge days exist', () => {
    const result = computeEmploymentEndCorrections({
      userId,
      endDate: '2026-03-20',
      today: '2026-04-05',
      employmentStartDate: null,
      employedBridgeDates: [],
    })

    expect('corrections' in result).toBe(true)
    if ('corrections' in result) {
      expect(result.corrections).toHaveLength(0)
    }
  })

  it('filters dates: only includes days AFTER endDate and up to today', () => {
    const result = computeEmploymentEndCorrections({
      userId,
      endDate: '2026-03-15',
      today: '2026-03-20',
      employmentStartDate: null,
      // Date on endDate itself should NOT be corrected (employment was active that day)
      // Date after today should NOT be corrected
      employedBridgeDates: ['2026-03-15', '2026-03-16', '2026-03-17', '2026-03-21'],
    })

    expect('corrections' in result).toBe(true)
    if ('corrections' in result) {
      expect(result.corrections).toHaveLength(2)
      expect(result.corrections.map(c => c.checkpoint_date)).toEqual(['2026-03-16', '2026-03-17'])
    }
  })

  it('allows end date equal to today (no days to backfill)', () => {
    const result = computeEmploymentEndCorrections({
      userId,
      endDate: '2026-04-05',
      today: '2026-04-05',
      employmentStartDate: null,
      employedBridgeDates: [],
    })

    expect('corrections' in result).toBe(true)
    if ('corrections' in result) {
      expect(result.corrections).toHaveLength(0)
    }
  })

  it('allows end date equal to employment start date (same-day employment)', () => {
    const result = computeEmploymentEndCorrections({
      userId,
      endDate: '2026-03-15',
      today: '2026-04-05',
      employmentStartDate: '2026-03-15',
      employedBridgeDates: ['2026-03-16', '2026-03-17'],
    })

    expect('corrections' in result).toBe(true)
    if ('corrections' in result) {
      expect(result.corrections).toHaveLength(2)
    }
  })
})
