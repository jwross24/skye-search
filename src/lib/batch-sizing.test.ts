import { describe, it, expect } from 'vitest'
import { getBatchSize, getBatchFramingMessage } from './batch-sizing'

function log(step: string, detail: string) {
  process.stdout.write(`  [batch-sizing] ${step}: ${detail}\n`)
}

describe('getBatchSize', () => {
  // ─── Unemployed: clock pressure tiers ──────────────────────────────────

  it('90+ days, unemployed: 8 cards', () => {
    const size = getBatchSize(119, false, null)
    expect(size).toBe(8)
    log('119 days unemployed', `expected=8, actual=${size}`)
  })

  it('60-89 days, unemployed: 10 cards', () => {
    const size = getBatchSize(75, false, null)
    expect(size).toBe(10)
    log('75 days unemployed', `expected=10, actual=${size}`)
  })

  it('30-59 days, unemployed: 12 cards', () => {
    const size = getBatchSize(45, false, null)
    expect(size).toBe(12)
    log('45 days unemployed', `expected=12, actual=${size}`)
  })

  it('<30 days, unemployed: 15 cards', () => {
    const size = getBatchSize(20, false, null)
    expect(size).toBe(15)
    log('20 days unemployed', `expected=15, actual=${size}`)
  })

  // ─── Employment overrides ─────────────────────────────────────────────

  it('employed full-time cap-exempt: 3 cards regardless of days', () => {
    const size = getBatchSize(119, true, 'cap_exempt')
    expect(size).toBe(3)
    log('119 days cap_exempt', `expected=3, actual=${size}`)
  })

  it('employed full-time cap-exempt: 3 even at <30 days', () => {
    const size = getBatchSize(20, true, 'cap_exempt')
    expect(size).toBe(3)
    log('20 days cap_exempt', `expected=3, actual=${size}`)
  })

  it('employed part-time bridge: 8 cards regardless of days', () => {
    const size = getBatchSize(20, true, 'bridge')
    expect(size).toBe(8)
    log('20 days bridge', `expected=8, actual=${size}`)
  })

  it('employed bridge at 119 days: still 8 cards', () => {
    const size = getBatchSize(119, true, 'bridge')
    expect(size).toBe(8)
    log('119 days bridge', `expected=8, actual=${size}`)
  })

  // ─── Boundary values ──────────────────────────────────────────────────

  it('boundary: 90 days → 8 (upper tier includes 90)', () => {
    expect(getBatchSize(90, false, null)).toBe(8)
  })

  it('boundary: 89 days → 10 (drops to mid tier)', () => {
    expect(getBatchSize(89, false, null)).toBe(10)
  })

  it('boundary: 60 days → 10', () => {
    expect(getBatchSize(60, false, null)).toBe(10)
  })

  it('boundary: 59 days → 12', () => {
    expect(getBatchSize(59, false, null)).toBe(12)
  })

  it('boundary: 30 days → 12', () => {
    expect(getBatchSize(30, false, null)).toBe(12)
  })

  it('boundary: 29 days → 15', () => {
    expect(getBatchSize(29, false, null)).toBe(15)
  })

  it('boundary: 0 days → 15', () => {
    expect(getBatchSize(0, false, null)).toBe(15)
  })

  it('boundary: 150 days → 8', () => {
    expect(getBatchSize(150, false, null)).toBe(8)
  })
})

describe('getBatchFramingMessage', () => {
  it('returns null for default batch size (8)', () => {
    expect(getBatchFramingMessage(8)).toBeNull()
  })

  it('returns null for smaller batches (3)', () => {
    expect(getBatchFramingMessage(3)).toBeNull()
  })

  it('returns warm framing for batch > 8', () => {
    const msg = getBatchFramingMessage(10)
    expect(msg).toBeTruthy()
    expect(msg).toContain('extra strong matches')
    log('framing 10', `message="${msg}"`)
  })

  it('no panic language at any batch size', () => {
    const forbidden = ['urgent', 'warning', 'critical', 'running out', 'panic', 'hurry', 'danger', 'expir']
    for (const size of [8, 10, 12, 15]) {
      const msg = getBatchFramingMessage(size)
      if (msg) {
        for (const word of forbidden) {
          expect(msg.toLowerCase()).not.toContain(word)
        }
      }
    }
    log('panic check', 'No forbidden words in any framing message')
  })
})
