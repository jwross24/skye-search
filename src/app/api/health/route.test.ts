import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockFrom } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
}))

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({ from: mockFrom })),
}))

import { GET } from './route'

function makeRequest(ready = false) {
  const url = ready
    ? 'http://localhost:3000/api/health?ready=true'
    : 'http://localhost:3000/api/health'
  return new Request(url)
}


// Chainable mock that handles any Supabase query shape: .eq().eq().order().limit().maybeSingle()
function chainable(resolveValue: unknown): Record<string, unknown> {
  const obj: Record<string, unknown> = {}
  for (const method of ['eq', 'in', 'lt', 'gt', 'not', 'order', 'limit', 'select', 'single']) {
    obj[method] = () => chainable(resolveValue)
  }
  obj.maybeSingle = () => Promise.resolve(resolveValue)
  obj.then = (resolve: (v: unknown) => void) => resolve(resolveValue)
  return obj
}

function setupHealthyMocks() {
  const now = new Date().toISOString()
  mockFrom.mockImplementation((table: string) => {
    switch (table) {
      case 'users':
        return { select: () => Promise.resolve({ error: null }) }
      case 'daily_checkpoint':
        return { select: () => chainable({ data: { checkpoint_date: new Date().toISOString().split('T')[0], created_at: now } }) }
      case 'task_queue':
        return {
          select: (_col: string, opts?: { count?: string; head?: boolean }) => {
            if (opts?.head) {
              return chainable({ count: 0 })
            }
            return chainable({ data: { updated_at: now } })
          },
        }
      case 'discovered_jobs':
        return {
          select: (_col: string, opts?: { count?: string; head?: boolean }) => {
            if (opts?.head) {
              return chainable({ count: 5 })
            }
            return chainable({ data: { created_at: now } })
          },
        }
      default:
        return { select: () => chainable({ data: null, error: null }) }
    }
  })
}

describe('GET /api/health', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321'
    process.env.SUPABASE_SECRET_KEY = 'test-key'
  })

  it('returns alive for liveness probe (no DB check)', async () => {
    const response = await GET(makeRequest())
    const body = await response.json()
    expect(response.status).toBe(200)
    expect(body.status).toBe('alive')
    expect(body.timestamp).toBeDefined()
    // DB should NOT be queried for liveness
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('returns ready with 200 when all systems healthy', async () => {
    setupHealthyMocks()

    const response = await GET(makeRequest(true))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.status).toBe('ready')
    expect(body.checks.db.healthy).toBe(true)
    expect(body.checks.unemployment_cron.healthy).toBe(true)
    expect(body.checks.unemployment_cron.stale).toBeFalsy()
    expect(body.checks.queue_worker.healthy).toBe(true)
    expect(body.checks.exa_pipeline.healthy).toBe(true)
    expect(body.checks.scoring_pipeline).toBeDefined()
  })

  it('returns degraded with 503 when DB is down', async () => {
    setupHealthyMocks()
    const originalImpl = mockFrom.getMockImplementation()!
    mockFrom.mockImplementation((table: string) => {
      if (table === 'users') {
        return { select: () => Promise.resolve({ error: { message: 'connection refused' } }) }
      }
      return originalImpl(table)
    })

    const response = await GET(makeRequest(true))
    const body = await response.json()
    expect(response.status).toBe(503)
    expect(body.status).toBe('degraded')
    expect(body.checks.db.healthy).toBe(false)
    expect(body.checks.db.detail).toBe('connection refused')
  })

  it('detects stale unemployment checkpoint (>50 hours)', async () => {
    setupHealthyMocks()
    const staleTime = new Date(Date.now() - 55 * 60 * 60 * 1000).toISOString()
    const originalImpl = mockFrom.getMockImplementation()!
    mockFrom.mockImplementation((table: string) => {
      if (table === 'daily_checkpoint') {
        return { select: () => chainable({ data: { checkpoint_date: '2026-03-28', created_at: staleTime } }) }
      }
      return originalImpl(table)
    })

    const response = await GET(makeRequest(true))
    const body = await response.json()
    expect(response.status).toBe(503)
    expect(body.checks.unemployment_cron.healthy).toBe(false)
    expect(body.checks.unemployment_cron.stale).toBe(true)
    expect(body.checks.unemployment_cron.detail).toContain('55h')
  })

  it('detects stale queue worker (pending tasks >24h)', async () => {
    setupHealthyMocks()
    const originalImpl = mockFrom.getMockImplementation()!
    mockFrom.mockImplementation((table: string) => {
      if (table === 'task_queue') {
        return {
          select: (_col: string, opts?: { count?: string; head?: boolean }) => {
            if (opts?.head) {
              return chainable({ count: 3 })
            }
            return chainable({ data: null })
          },
        }
      }
      return originalImpl(table)
    })

    const response = await GET(makeRequest(true))
    const body = await response.json()
    expect(response.status).toBe(503)
    expect(body.checks.queue_worker.healthy).toBe(false)
    expect(body.checks.queue_worker.stale).toBe(true)
    expect(body.checks.queue_worker.detail).toContain('3 tasks')
  })

  it('detects stale Exa pipeline (>8 days)', async () => {
    setupHealthyMocks()
    const staleTime = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
    const originalImpl = mockFrom.getMockImplementation()!
    mockFrom.mockImplementation((table: string) => {
      if (table === 'discovered_jobs') {
        return {
          select: (_col: string, opts?: { count?: string; head?: boolean }) => {
            if (opts?.head) {
              return chainable({ count: 0 })
            }
            return chainable({ data: { created_at: staleTime } })
          },
        }
      }
      return originalImpl(table)
    })

    const response = await GET(makeRequest(true))
    const body = await response.json()
    expect(response.status).toBe(503)
    expect(body.checks.exa_pipeline.healthy).toBe(false)
    expect(body.checks.exa_pipeline.stale).toBe(true)
    expect(body.checks.exa_pipeline.detail).toContain('10d')
  })

  it('treats no checkpoints as bootstrap (healthy)', async () => {
    setupHealthyMocks()
    const originalImpl = mockFrom.getMockImplementation()!
    mockFrom.mockImplementation((table: string) => {
      if (table === 'daily_checkpoint') {
        return { select: () => chainable({ data: null }) }
      }
      return originalImpl(table)
    })

    const response = await GET(makeRequest(true))
    const body = await response.json()
    expect(body.checks.unemployment_cron.healthy).toBe(true)
    expect(body.checks.unemployment_cron.detail).toContain('bootstrap')
  })

  it('detects stale scoring pipeline (unscored + no recent scoring run)', async () => {
    setupHealthyMocks()
    const staleTime = new Date(Date.now() - 30 * 60 * 60 * 1000).toISOString() // 30h ago
    const originalImpl = mockFrom.getMockImplementation()!
    mockFrom.mockImplementation((table: string) => {
      if (table === 'task_queue') {
        return {
          select: (_col: string, opts?: { count?: string; head?: boolean }) => {
            if (opts?.head) {
              return chainable({ count: 0 }) // No stale pending tasks
            }
            // Return stale last completed for scoring pipeline
            return chainable({ data: { updated_at: staleTime } })
          },
        }
      }
      if (table === 'discovered_jobs') {
        return {
          select: (_col: string, opts?: { count?: string; head?: boolean }) => {
            if (opts?.head) {
              return chainable({ count: 20 }) // 20 unscored jobs
            }
            return chainable({ data: { created_at: new Date().toISOString() } })
          },
        }
      }
      return originalImpl(table)
    })

    const response = await GET(makeRequest(true))
    const body = await response.json()
    expect(response.status).toBe(503)
    expect(body.checks.scoring_pipeline.healthy).toBe(false)
    expect(body.checks.scoring_pipeline.stale).toBe(true)
    expect(body.checks.scoring_pipeline.detail).toContain('20 unscored')
  })

  it('treats no scoring runs as bootstrap (healthy)', async () => {
    setupHealthyMocks()
    const originalImpl = mockFrom.getMockImplementation()!
    mockFrom.mockImplementation((table: string) => {
      if (table === 'task_queue') {
        return {
          select: (_col: string, opts?: { count?: string; head?: boolean }) => {
            if (opts?.head) {
              return chainable({ count: 0 })
            }
            return chainable({ data: null }) // No completed scoring tasks
          },
        }
      }
      if (table === 'discovered_jobs') {
        return {
          select: (_col: string, opts?: { count?: string; head?: boolean }) => {
            if (opts?.head) {
              return chainable({ count: 10 })
            }
            return chainable({ data: { created_at: new Date().toISOString() } })
          },
        }
      }
      return originalImpl(table)
    })

    const response = await GET(makeRequest(true))
    const body = await response.json()
    expect(body.checks.scoring_pipeline.healthy).toBe(true)
    expect(body.checks.scoring_pipeline.detail).toContain('no scoring runs yet')
  })

  it('includes timestamp in all responses', async () => {
    const liveness = await GET(makeRequest())
    const livenessBody = await liveness.json()
    expect(livenessBody.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/)

    setupHealthyMocks()
    const readiness = await GET(makeRequest(true))
    const readinessBody = await readiness.json()
    expect(readinessBody.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })
})
