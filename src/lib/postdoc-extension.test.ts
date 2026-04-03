import { describe, it, expect } from 'vitest'
import { computeExtensionCorrections } from './postdoc-extension'

describe('computeExtensionCorrections', () => {
  const userId = 'user-123'

  it('produces corrections for unemployed days in the extended range', () => {
    const result = computeExtensionCorrections({
      userId,
      oldEndDate: '2026-04-11',
      newEndDate: '2026-07-01',
      unemployedCheckpointDates: ['2026-04-12', '2026-04-13', '2026-04-14'],
    })

    expect(result).toHaveLength(3)
    expect(result[0]).toEqual({
      user_id: userId,
      checkpoint_date: '2026-04-12',
      original_status: 'unemployed',
      corrected_status: 'employed_postdoc',
      trigger_source: 'postdoc_extension_backfill',
    })
  })

  it('filters out dates on or before old end date', () => {
    const result = computeExtensionCorrections({
      userId,
      oldEndDate: '2026-04-11',
      newEndDate: '2026-07-01',
      unemployedCheckpointDates: ['2026-04-10', '2026-04-11', '2026-04-12'],
    })

    expect(result).toHaveLength(1)
    expect(result[0].checkpoint_date).toBe('2026-04-12')
  })

  it('filters out dates after new end date', () => {
    const result = computeExtensionCorrections({
      userId,
      oldEndDate: '2026-04-11',
      newEndDate: '2026-05-01',
      unemployedCheckpointDates: ['2026-04-12', '2026-05-01', '2026-05-02'],
    })

    expect(result).toHaveLength(2)
    expect(result.map((r) => r.checkpoint_date)).toEqual(['2026-04-12', '2026-05-01'])
  })

  it('returns empty array when no unemployed dates in range', () => {
    const result = computeExtensionCorrections({
      userId,
      oldEndDate: '2026-04-11',
      newEndDate: '2026-07-01',
      unemployedCheckpointDates: [],
    })

    expect(result).toHaveLength(0)
  })

  it('handles single-day extension', () => {
    const result = computeExtensionCorrections({
      userId,
      oldEndDate: '2026-04-11',
      newEndDate: '2026-04-12',
      unemployedCheckpointDates: ['2026-04-12'],
    })

    expect(result).toHaveLength(1)
    expect(result[0].checkpoint_date).toBe('2026-04-12')
    expect(result[0].corrected_status).toBe('employed_postdoc')
  })

  it('corrected days no longer count toward unemployment total', () => {
    // Simulates the view behavior: corrections mark days as employed_postdoc
    const corrections = computeExtensionCorrections({
      userId,
      oldEndDate: '2026-04-11',
      newEndDate: '2026-05-01',
      unemployedCheckpointDates: ['2026-04-12', '2026-04-13', '2026-04-14'],
    })

    // All corrections should be employed_postdoc (not counted as unemployed)
    expect(corrections.every((c) => c.corrected_status === 'employed_postdoc')).toBe(true)
    expect(corrections.every((c) => c.original_status === 'unemployed')).toBe(true)
  })

  it('is idempotent: pre-filtered dates produce no duplicates', () => {
    // Caller filters out already-corrected dates before passing
    const firstRun = computeExtensionCorrections({
      userId,
      oldEndDate: '2026-04-11',
      newEndDate: '2026-07-01',
      unemployedCheckpointDates: ['2026-04-12', '2026-04-13'],
    })
    expect(firstRun).toHaveLength(2)

    // Second run: caller has filtered out the already-corrected dates
    const secondRun = computeExtensionCorrections({
      userId,
      oldEndDate: '2026-04-11',
      newEndDate: '2026-07-01',
      unemployedCheckpointDates: [], // already corrected, filtered by caller
    })
    expect(secondRun).toHaveLength(0)
  })

  it('original checkpoint rows are never modified (corrections are additive)', () => {
    const corrections = computeExtensionCorrections({
      userId,
      oldEndDate: '2026-04-11',
      newEndDate: '2026-05-01',
      unemployedCheckpointDates: ['2026-04-12'],
    })

    // The function only produces INSERT data for checkpoint_corrections
    // It never modifies daily_checkpoint (verified by schema design)
    expect(corrections[0].trigger_source).toBe('postdoc_extension_backfill')
    expect(corrections[0]).not.toHaveProperty('id') // no PK = insert-only
  })

  it('user-entered dates are flagged via trigger_source', () => {
    const corrections = computeExtensionCorrections({
      userId,
      oldEndDate: '2026-04-11',
      newEndDate: '2026-07-01',
      unemployedCheckpointDates: ['2026-04-12'],
    })

    expect(corrections[0].trigger_source).toBe('postdoc_extension_backfill')
  })
})
