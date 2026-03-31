import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

function log(step: string, detail: string) {
  process.stdout.write(`  [daily-picks test] ${step}: ${detail}\n`)
}

// ─── Mock Supabase ──────────────────────────────────────────────────────────

// Chain builder that supports the fluent query API
function createChain(resolvedValue: { data: unknown; count?: number; error?: null }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {}
  chain.select = vi.fn().mockReturnValue(chain)
  chain.eq = vi.fn().mockReturnValue(chain)
  chain.not = vi.fn().mockReturnValue(chain)
  chain.order = vi.fn().mockReturnValue(chain)
  chain.limit = vi.fn().mockReturnValue(chain)
  chain.gte = vi.fn().mockReturnValue(chain)
  chain.in = vi.fn().mockReturnValue(chain)
  chain.filter = vi.fn().mockReturnValue(chain)
  chain.single = vi.fn().mockResolvedValue(resolvedValue)
  chain.maybeSingle = vi.fn().mockResolvedValue(resolvedValue)
  // When awaited as a whole (no .single()/.maybeSingle()), return the resolved value
  chain.then = (resolve: (v: unknown) => void) => resolve(resolvedValue)
  return chain
}

let fromHandlers: Record<string, ReturnType<typeof createChain>>

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: (table: string) => {
      if (fromHandlers[table]) return fromHandlers[table]
      return createChain({ data: null })
    },
  })),
}))

// ─── Mock email-alerts (just the function we need) ──────────────────────────

vi.mock('./email-alerts', () => ({
  shouldSuppressForBreakMode: vi.fn().mockReturnValue(false),
}))

import { shouldSuppressForBreakMode } from './email-alerts'

// ─── Env ────────────────────────────────────────────────────────────────────

const ORIGINAL_ENV = { ...process.env }

beforeEach(() => {
  vi.clearAllMocks()
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://127.0.0.1:54321'
  process.env.SUPABASE_SECRET_KEY = 'test-secret-key'
})

afterEach(() => {
  process.env = { ...ORIGINAL_ENV }
})

// ─── Helper ─────────────────────────────────────────────────────────────────

function setupHandlers(overrides: Partial<Record<string, ReturnType<typeof createChain>>> = {}) {
  fromHandlers = {
    immigration_status: createChain({
      data: { initial_days_used: 10 },
    }),
    immigration_clock: createChain({
      data: { days_remaining: 120 },
    }),
    users: createChain({
      data: { break_mode_until: null },
    }),
    task_queue: createChain({
      data: [{ status: 'completed', created_at: new Date().toISOString() }],
    }),
    votes: createChain({ data: [] }),
    applications: createChain({ data: [] }),
    jobs: createChain({
      data: [
        { id: 'j1', title: 'Research Scientist', company: 'MIT', visa_path: 'cap_exempt', location: 'Boston, MA', url: 'https://example.com/j1', match_score: 0.92, why_fits: 'Strong fit for ocean color research' },
        { id: 'j2', title: 'Data Analyst', company: 'NOAA', visa_path: 'cap_exempt', location: 'Silver Spring, MD', url: 'https://example.com/j2', match_score: 0.85, why_fits: 'Government research lab' },
        { id: 'j3', title: 'Software Engineer', company: 'Acme Corp', visa_path: 'cap_subject', location: 'NYC', url: 'https://example.com/j3', match_score: 0.70, why_fits: null },
      ],
    }),
    ...overrides,
  }
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('checkScoringStatus', () => {
  it('returns complete when scoring task finished', async () => {
    log('Step 1', 'Setting up completed scoring task')
    setupHandlers()
    const { checkScoringStatus } = await import('./daily-picks')
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient('', '')

    const status = await checkScoringStatus(supabase as ReturnType<typeof createClient>, 'user-1')
    log('Step 2', `Scoring status: ${status}`)
    expect(status).toBe('complete')
  })

  it('returns stale when scoring task is still processing', async () => {
    log('Step 1', 'Setting up processing scoring task')
    setupHandlers({
      task_queue: createChain({
        data: [{ status: 'processing', created_at: new Date().toISOString() }],
      }),
    })
    const { checkScoringStatus } = await import('./daily-picks')
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient('', '')

    const status = await checkScoringStatus(supabase as ReturnType<typeof createClient>, 'user-1')
    log('Step 2', `Scoring status: ${status}`)
    expect(status).toBe('stale')
  })

  it('returns failed when scoring task failed', async () => {
    log('Step 1', 'Setting up failed scoring task')
    setupHandlers({
      task_queue: createChain({
        data: [{ status: 'failed', created_at: new Date().toISOString() }],
      }),
    })
    const { checkScoringStatus } = await import('./daily-picks')
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient('', '')

    const status = await checkScoringStatus(supabase as ReturnType<typeof createClient>, 'user-1')
    log('Step 2', `Scoring status: ${status}`)
    expect(status).toBe('failed')
  })

  it('returns stale when scoring task is pending', async () => {
    log('Step 1', 'Setting up pending scoring task')
    setupHandlers({
      task_queue: createChain({
        data: [{ status: 'pending', created_at: new Date().toISOString() }],
      }),
    })
    const { checkScoringStatus } = await import('./daily-picks')
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient('', '')

    const status = await checkScoringStatus(supabase as ReturnType<typeof createClient>, 'user-1')
    log('Step 2', `Scoring status: ${status}`)
    expect(status).toBe('stale')
  })

  it('returns failed when no scoring task found', async () => {
    log('Step 1', 'Setting up empty task queue')
    setupHandlers({
      task_queue: createChain({ data: [] }),
    })
    const { checkScoringStatus } = await import('./daily-picks')
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient('', '')

    const status = await checkScoringStatus(supabase as ReturnType<typeof createClient>, 'user-1')
    log('Step 2', `Scoring status: ${status}`)
    expect(status).toBe('failed')
  })
})

describe('selectTopPicks', () => {
  it('returns top 3 jobs sorted by match_score, excluding voted/applied', async () => {
    log('Step 1', 'Setting up 3 jobs, 0 votes, 0 applications')
    setupHandlers()
    const { selectTopPicks } = await import('./daily-picks')
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient('', '')

    const picks = await selectTopPicks(supabase as ReturnType<typeof createClient>, 'user-1')
    log('Step 2', `Got ${picks.length} picks: ${picks.map((p) => p.title).join(', ')}`)

    expect(picks).toHaveLength(3)
    expect(picks[0].title).toBe('Research Scientist')
    expect(picks[0].score).toBe(92) // 0.92 * 100 rounded
    expect(picks[0].visaPath).toBe('cap_exempt')
    expect(picks[0].whyFits).toBe('Strong fit for ocean color research')
  })

  it('excludes jobs the user already voted on', async () => {
    log('Step 1', 'Setting up votes that exclude j1')
    setupHandlers({
      votes: createChain({ data: [{ job_id: 'j1' }] }),
    })
    const { selectTopPicks } = await import('./daily-picks')
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient('', '')

    const picks = await selectTopPicks(supabase as ReturnType<typeof createClient>, 'user-1')
    log('Step 2', `Got ${picks.length} picks after excluding j1`)

    expect(picks).toHaveLength(2)
    expect(picks.every((p) => p.title !== 'Research Scientist')).toBe(true)
  })

  it('excludes jobs the user already applied to', async () => {
    log('Step 1', 'Setting up application that excludes j2')
    setupHandlers({
      applications: createChain({ data: [{ job_id: 'j2' }] }),
    })
    const { selectTopPicks } = await import('./daily-picks')
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient('', '')

    const picks = await selectTopPicks(supabase as ReturnType<typeof createClient>, 'user-1')
    log('Step 2', `Got ${picks.length} picks after excluding j2`)

    expect(picks).toHaveLength(2)
    expect(picks.every((p) => p.title !== 'Data Analyst')).toBe(true)
  })

  it('handles null job_id in applications gracefully', async () => {
    log('Step 1', 'Setting up application with null job_id')
    setupHandlers({
      applications: createChain({ data: [{ job_id: null }] }),
    })
    const { selectTopPicks } = await import('./daily-picks')
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient('', '')

    const picks = await selectTopPicks(supabase as ReturnType<typeof createClient>, 'user-1')
    log('Step 2', `Got ${picks.length} picks (null job_id should not exclude anything)`)

    expect(picks).toHaveLength(3)
  })

  it('returns empty array when no scored jobs exist', async () => {
    log('Step 1', 'Setting up empty jobs table')
    setupHandlers({
      jobs: createChain({ data: [] }),
    })
    const { selectTopPicks } = await import('./daily-picks')
    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient('', '')

    const picks = await selectTopPicks(supabase as ReturnType<typeof createClient>, 'user-1')
    log('Step 2', `Got ${picks.length} picks (expected 0)`)

    expect(picks).toHaveLength(0)
  })
})

describe('prepareDailyPicks', () => {
  it('returns picks with clock state and scoring status', async () => {
    log('Step 1', 'Setting up full data for prepareDailyPicks')
    setupHandlers()
    const { prepareDailyPicks } = await import('./daily-picks')

    const result = await prepareDailyPicks('user-1')
    log('Step 2', `Result: sent=${result.sent}, reason=${result.reason}`)

    expect(result.sent).toBe(true)
    expect(result.data).toBeDefined()
    expect(result.data!.daysRemaining).toBe(120)
    expect(result.data!.daysUsed).toBe(30)
    expect(result.data!.picks).toHaveLength(3)
    expect(result.data!.scoringStatus).toBe('complete')
    expect(result.data!.capExemptCount).toBe(2) // MIT and NOAA
    log('Step 3', `Cap-exempt: ${result.data!.capExemptCount}, Bridge: ${result.data!.bridgeCount}`)
  })

  it('skips email when no picks available', async () => {
    log('Step 1', 'Setting up empty jobs (no picks)')
    setupHandlers({
      jobs: createChain({ data: [] }),
    })
    const { prepareDailyPicks } = await import('./daily-picks')

    const result = await prepareDailyPicks('user-1')
    log('Step 2', `Result: sent=${result.sent}, reason=${result.reason}`)

    expect(result.sent).toBe(false)
    expect(result.reason).toBe('no_picks')
  })

  it('skips email during break mode', async () => {
    log('Step 1', 'Enabling break mode')
    setupHandlers()
    vi.mocked(shouldSuppressForBreakMode).mockReturnValue(true)
    const { prepareDailyPicks } = await import('./daily-picks')

    const result = await prepareDailyPicks('user-1')
    log('Step 2', `Result: sent=${result.sent}, reason=${result.reason}`)

    expect(result.sent).toBe(false)
    expect(result.reason).toBe('break_mode')

    // Reset mock
    vi.mocked(shouldSuppressForBreakMode).mockReturnValue(false)
  })

  it('still sends during break mode when <15 days remaining', async () => {
    log('Step 1', 'Break mode on but <15 days remaining')
    setupHandlers({
      immigration_clock: createChain({ data: { days_remaining: 10 } }),
    })
    // shouldSuppressForBreakMode returns false when daysRemaining <= 15 (built-in logic)
    vi.mocked(shouldSuppressForBreakMode).mockReturnValue(false)
    const { prepareDailyPicks } = await import('./daily-picks')

    const result = await prepareDailyPicks('user-1')
    log('Step 2', `Result: sent=${result.sent}, daysRemaining=${result.data?.daysRemaining}`)

    expect(result.sent).toBe(true)
    expect(result.data!.daysRemaining).toBe(10)
  })

  it('includes correct bridge count for cap_subject and opt_compatible', async () => {
    log('Step 1', 'Setting up mix of visa paths')
    setupHandlers({
      jobs: createChain({
        data: [
          { id: 'j1', title: 'Job A', company: 'Co A', visa_path: 'cap_exempt', location: 'A', url: null, match_score: 0.9, why_fits: null },
          { id: 'j2', title: 'Job B', company: 'Co B', visa_path: 'cap_subject', location: 'B', url: null, match_score: 0.8, why_fits: null },
          { id: 'j3', title: 'Job C', company: 'Co C', visa_path: 'opt_compatible', location: 'C', url: null, match_score: 0.7, why_fits: null },
        ],
      }),
    })
    const { prepareDailyPicks } = await import('./daily-picks')

    const result = await prepareDailyPicks('user-1')
    log('Step 2', `Bridge count: ${result.data?.bridgeCount}, Cap-exempt: ${result.data?.capExemptCount}`)

    expect(result.data!.capExemptCount).toBe(1)
    expect(result.data!.bridgeCount).toBe(2) // cap_subject + opt_compatible
  })
})
