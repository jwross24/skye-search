import { describe, it, expect } from 'vitest'
import { computeAllScenarios, computeScenario, type ImmigrationState } from './what-if-scenarios'

function log(step: string, detail: string) {
  process.stdout.write(`  [what-if] ${step}: ${detail}\n`)
}

// ─── Skye's current state (as of March 30, 2026) ───────────────────────────

const SKYE_STATE: ImmigrationState = {
  daysUsed: 31,
  postdocEndDate: '2026-04-11',
  optExpiry: '2026-08-15',
  employmentActive: true,
  today: '2026-03-30',
}

// ─── Scenario 1: Cap-exempt offer in May ────────────────────────────────────

describe('Scenario 1: Cap-exempt offer in May', () => {
  it('projects 65 days used for May 15 start (34 unemployed days: Apr 11 → May 15)', () => {
    log('Step 1', 'Computing cap_exempt_may with 31 days used, postdoc ends Apr 11')
    const result = computeScenario(SKYE_STATE, 'cap_exempt_may')
    // Apr 11 to May 15 = 34 days + 31 initial = 65
    log('Step 2', `Projected: ${result.projectedDaysUsed} days used`)
    expect(result.projectedDaysUsed).toBe(65)
    expect(result.tone).toBe('reassuring')
    expect(result.recommendation).toContain('plenty')
  })

  it('shows encouraging tone when projected days > 90', () => {
    log('Step 1', 'Testing with higher initial days')
    const state: ImmigrationState = { ...SKYE_STATE, daysUsed: 80 }
    const result = computeScenario(state, 'cap_exempt_may')
    log('Step 2', `Projected: ${result.projectedDaysUsed}, tone: ${result.tone}`)
    expect(result.projectedDaysUsed).toBeGreaterThanOrEqual(90)
    expect(result.tone).toBe('encouraging')
  })
})

// ─── Scenario 2: Bridge job in May ──────────────────────────────────────────

describe('Scenario 2: Bridge job in May', () => {
  it('projects clock halted with days preserved', () => {
    log('Step 1', 'Computing bridge_may')
    const result = computeScenario(SKYE_STATE, 'bridge_may')
    // Apr 11 to May 1 = 20 days + 31 = 51
    log('Step 2', `Projected: ${result.projectedDaysUsed} days, status: ${result.projectedStatus}`)
    expect(result.projectedDaysUsed).toBe(51)
    expect(result.projectedStatus).toContain('halts')
    expect(result.projectedStatus).toContain('99') // 150 - 51 = 99 preserved
    expect(result.recommendation).toContain('clock stops')
  })
})

// ─── Scenario 3: Nothing by June ────────────────────────────────────────────

describe('Scenario 3: Nothing by June', () => {
  it('projects ~81 days used and actionable tone', () => {
    log('Step 1', 'Computing nothing_june')
    const result = computeScenario(SKYE_STATE, 'nothing_june')
    // Apr 11 to Jun 1 = 51 days + 31 = 82
    log('Step 2', `Projected: ${result.projectedDaysUsed} days, tone: ${result.tone}`)
    expect(result.projectedDaysUsed).toBe(82)
    expect(result.tone).toBe('actionable')
    expect(result.recommendation).toContain('Plan C')
  })

  it('mentions CPT deadlines and Canada timeline', () => {
    const result = computeScenario(SKYE_STATE, 'nothing_june')
    expect(result.recommendation).toContain('CPT')
    expect(result.recommendation).toContain('Canada')
  })
})

// ─── Scenario 4: Nothing by August ──────────────────────────────────────────

describe('Scenario 4: Nothing by August', () => {
  it('projects ~143 days used with urgent tone', () => {
    log('Step 1', 'Computing nothing_august')
    const result = computeScenario(SKYE_STATE, 'nothing_august')
    // Apr 11 to Aug 1 = 112 days + 31 = 143
    log('Step 2', `Projected: ${result.projectedDaysUsed} days, tone: ${result.tone}`)
    expect(result.projectedDaysUsed).toBe(143)
    expect(result.tone).toBe('urgent')
    // Status should show actual days used, NOT '150 days reached' (not exhausted yet)
    expect(result.projectedStatus).toContain('143 of 150 days used')
    expect(result.projectedStatus).not.toContain('150 days reached')
  })

  it('shows 150-days-reached status only when actually exhausted', () => {
    log('Step 1', 'Testing with 140 initial days (exhaustion at Aug 1)')
    const state: ImmigrationState = { ...SKYE_STATE, daysUsed: 140 }
    const result = computeScenario(state, 'nothing_august')
    log('Step 2', `Status: ${result.projectedStatus}`)
    expect(result.projectedDaysUsed).toBe(150)
    expect(result.projectedStatus).toContain('150 days reached')
  })

  it('mentions SEVIS transfer and Canada', () => {
    const result = computeScenario(SKYE_STATE, 'nothing_august')
    expect(result.recommendation).toContain('SEVIS transfer')
    expect(result.recommendation).toContain('Canada')
  })
})

// ─── All scenarios ──────────────────────────────────────────────────────────

describe('All scenarios', () => {
  it('returns exactly 4 scenarios in order', () => {
    log('Step 1', 'Computing all scenarios')
    const results = computeAllScenarios(SKYE_STATE)
    log('Step 2', `Got ${results.length} scenarios`)
    expect(results).toHaveLength(4)
    expect(results[0].id).toBe('cap_exempt_may')
    expect(results[1].id).toBe('bridge_may')
    expect(results[2].id).toBe('nothing_june')
    expect(results[3].id).toBe('nothing_august')
  })

  it('each scenario has title, subtitle, status, recommendation', () => {
    const results = computeAllScenarios(SKYE_STATE)
    for (const r of results) {
      expect(r.title).toBeTruthy()
      expect(r.subtitle).toBeTruthy()
      expect(r.projectedStatus).toBeTruthy()
      expect(r.recommendation).toBeTruthy()
    }
  })

  it('worst-case scenarios (nothing_*) project more days than best-case (offer/bridge)', () => {
    log('Step 1', 'Comparing worst vs best case projected days')
    const results = computeAllScenarios(SKYE_STATE)
    const bestCase = Math.min(results[0].projectedDaysUsed, results[1].projectedDaysUsed)
    const worstCase = Math.max(results[2].projectedDaysUsed, results[3].projectedDaysUsed)
    expect(worstCase).toBeGreaterThan(bestCase)
    log('Step 2', `Best: ${bestCase}, Worst: ${worstCase}`)
  })

  it('warm framing: no doom language in any scenario', () => {
    log('Step 1', 'Checking tone across all scenarios')
    const results = computeAllScenarios(SKYE_STATE)
    const doomWords = ['deport', 'illegal', 'danger', 'panic', 'emergency', 'doom', 'failure']
    for (const r of results) {
      const text = `${r.title} ${r.recommendation}`.toLowerCase()
      for (const word of doomWords) {
        expect(text).not.toContain(word)
      }
    }
    log('Step 2', 'No doom language found')
  })

  it('outcomes change with different initial days_used', () => {
    log('Step 1', 'Comparing 31 days vs 80 days initial')
    const low = computeAllScenarios({ ...SKYE_STATE, daysUsed: 31 })
    const high = computeAllScenarios({ ...SKYE_STATE, daysUsed: 80 })
    for (let i = 0; i < 4; i++) {
      expect(high[i].projectedDaysUsed).toBeGreaterThan(low[i].projectedDaysUsed)
    }
    log('Step 2', 'Higher initial days → higher projected days')
  })
})

// ─── Edge: 150 cap ──────────────────────────────────────────────────────────

describe('Edge: 150-day cap', () => {
  it('never exceeds 150 days', () => {
    log('Step 1', 'Testing with 140 initial days')
    const state: ImmigrationState = { ...SKYE_STATE, daysUsed: 140 }
    const results = computeAllScenarios(state)
    for (const r of results) {
      expect(r.projectedDaysUsed).toBeLessThanOrEqual(150)
    }
    log('Step 2', 'All capped at 150')
  })
})
