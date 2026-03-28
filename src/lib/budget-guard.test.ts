import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockFrom } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
}))

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({ from: mockFrom })),
}))

import { checkBudget, getSpendSummary, DEFAULT_CAPS } from './budget-guard'

function setupMocks(opts: {
  dailyCents?: number
  weeklyCents?: number
  caps?: Record<string, unknown> | null
}) {
  const dailyCents = opts.dailyCents ?? 0
  const weeklyCents = opts.weeklyCents ?? 0
  const caps = opts.caps ?? {
    daily_cap_cents: 300,
    weekly_soft_cap_cents: 1200,
    weekly_alert_threshold_cents: 800,
    pause_buffer_cents: 50,
  }

  mockFrom.mockImplementation((table: string) => {
    if (table === 'daily_spend') {
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({ data: dailyCents > 0 ? { total_cents: dailyCents } : null }),
            }),
          }),
        }),
      }
    }
    if (table === 'weekly_spend') {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: () => Promise.resolve({ data: weeklyCents > 0 ? { total_cents: weeklyCents } : null }),
          }),
        }),
      }
    }
    if (table === 'users') {
      return {
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve({
              data: { user_preferences: caps ? { budget: caps } : {} },
            }),
          }),
        }),
      }
    }
    return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null }) }) }) }
  })
}

describe('checkBudget', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321'
    process.env.SUPABASE_SECRET_KEY = 'test-key'
  })

  it('allows when spend is zero', async () => {
    setupMocks({ dailyCents: 0 })
    const verdict = await checkBudget({ userId: 'u1', taskType: 'cv_extraction' })
    expect(verdict.action).toBe('allow')
  })

  it('allows when spend is below cap', async () => {
    setupMocks({ dailyCents: 100 })
    const verdict = await checkBudget({ userId: 'u1', taskType: 'cv_extraction' })
    expect(verdict.action).toBe('allow')
  })

  it('reduces batch when within pause buffer of cap', async () => {
    setupMocks({ dailyCents: 260 }) // 300 - 50 = 250 threshold
    const verdict = await checkBudget({ userId: 'u1', taskType: 'exa_search_query' })
    expect(verdict.action).toBe('reduce_batch')
    if (verdict.action === 'reduce_batch') {
      expect(verdict.maxBatchSize).toBe(3)
      expect(verdict.reason).toContain('Approaching')
    }
  })

  it('pauses when at daily cap', async () => {
    setupMocks({ dailyCents: 300 })
    const verdict = await checkBudget({ userId: 'u1', taskType: 'cv_extraction' })
    expect(verdict.action).toBe('pause')
    if (verdict.action === 'pause') {
      expect(verdict.reason).toContain('$3.00')
    }
  })

  it('pauses when over daily cap', async () => {
    setupMocks({ dailyCents: 500 })
    const verdict = await checkBudget({ userId: 'u1', taskType: 'cv_extraction' })
    expect(verdict.action).toBe('pause')
  })

  it('allows at exactly one below reduce_batch threshold (249)', async () => {
    setupMocks({ dailyCents: 249 }) // 300 - 50 = 250 threshold, 249 is below
    const verdict = await checkBudget({ userId: 'u1', taskType: 'exa_search_query' })
    expect(verdict.action).toBe('allow')
  })

  it('reduces batch at exactly the threshold boundary (250)', async () => {
    setupMocks({ dailyCents: 250 }) // exactly daily_cap - pause_buffer
    const verdict = await checkBudget({ userId: 'u1', taskType: 'exa_search_query' })
    expect(verdict.action).toBe('reduce_batch')
  })

  it('pauses when weekly cap exceeded', async () => {
    setupMocks({ dailyCents: 100, weeklyCents: 1200 })
    const verdict = await checkBudget({ userId: 'u1', taskType: 'cv_extraction' })
    expect(verdict.action).toBe('pause')
    if (verdict.action === 'pause') {
      expect(verdict.reason).toContain('Weekly')
    }
  })

  it('allows when weekly spend below cap', async () => {
    setupMocks({ dailyCents: 100, weeklyCents: 800 })
    const verdict = await checkBudget({ userId: 'u1', taskType: 'cv_extraction' })
    expect(verdict.action).toBe('allow')
  })

  it('always allows critical tasks regardless of spend', async () => {
    setupMocks({ dailyCents: 9999 })

    const crit1 = await checkBudget({ userId: 'u1', taskType: 'unemployment_cron' })
    expect(crit1.action).toBe('allow')

    const crit2 = await checkBudget({ userId: 'u1', taskType: 'deadline_72h' })
    expect(crit2.action).toBe('allow')

    const crit3 = await checkBudget({ userId: 'u1', taskType: 'cron_failure' })
    expect(crit3.action).toBe('allow')
  })

  it('allows critical when criticality param is set', async () => {
    setupMocks({ dailyCents: 9999 })
    const verdict = await checkBudget({ userId: 'u1', taskType: 'any', criticality: 'critical' })
    expect(verdict.action).toBe('allow')
  })

  it('uses default caps when user has no budget preferences', async () => {
    setupMocks({ dailyCents: 310, caps: null })
    const verdict = await checkBudget({ userId: 'u1', taskType: 'cv_extraction' })
    expect(verdict.action).toBe('pause')
  })

  it('respects custom caps from user preferences', async () => {
    setupMocks({
      dailyCents: 400,
      caps: { daily_cap_cents: 500, weekly_soft_cap_cents: 2000, weekly_alert_threshold_cents: 1500, pause_buffer_cents: 50 },
    })
    const verdict = await checkBudget({ userId: 'u1', taskType: 'cv_extraction' })
    expect(verdict.action).toBe('allow') // 400 < 500
  })
})

describe('getSpendSummary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321'
    process.env.SUPABASE_SECRET_KEY = 'test-key'
  })

  it('returns zero when no spend exists', async () => {
    setupMocks({ dailyCents: 0, weeklyCents: 0 })
    const summary = await getSpendSummary('u1')
    expect(summary.dailyCents).toBe(0)
    expect(summary.weeklyCents).toBe(0)
    expect(summary.dailyRemaining).toBe(DEFAULT_CAPS.daily_cap_cents)
  })

  it('calculates remaining correctly', async () => {
    setupMocks({ dailyCents: 150, weeklyCents: 600 })
    const summary = await getSpendSummary('u1')
    expect(summary.dailyRemaining).toBe(150) // 300 - 150
    expect(summary.weeklyRemaining).toBe(600) // 1200 - 600
  })

  it('remaining never goes negative', async () => {
    setupMocks({ dailyCents: 500, weeklyCents: 2000 })
    const summary = await getSpendSummary('u1')
    expect(summary.dailyRemaining).toBe(0)
    expect(summary.weeklyRemaining).toBe(0)
  })
})
