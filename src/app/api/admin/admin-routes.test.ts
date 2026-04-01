/**
 * Unit tests for all admin API routes.
 * Mocks authenticateAdmin + Supabase (admin routes are internal).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

function log(step: string, detail: string) {
  process.stdout.write(`  [admin] ${step}: ${detail}\n`)
}

// ─── Mock authenticateAdmin ─────────────────────────────────────────────────

const mockAuthResult = vi.hoisted(() => ({
  value: null as { supabase: unknown; userId: string } | null,
}))

vi.mock('./auth', () => ({
  authenticateAdmin: vi.fn(() => Promise.resolve(mockAuthResult.value)),
}))

// ─── Mock Supabase service client ───────────────────────────────────────────

function chainable(result: unknown) {
  return new Proxy({} as Record<string, unknown>, {
    get(_, prop) {
      if (prop === 'then') return (r: (v: unknown) => void) => Promise.resolve(result).then(r)
      return () => chainable(result)
    },
  })
}

const mockSupabase = {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  from: vi.fn((_table: string) => chainable({ data: [], count: 0 })),
}

beforeEach(() => {
  vi.clearAllMocks()
  // Default: authenticated admin
  mockAuthResult.value = { supabase: mockSupabase, userId: 'user-1' }
})

// ─── Auth rejection (applies to all routes) ─────────────────────────────────

describe('admin auth rejection', () => {
  it('[admin] returns 401 when not authenticated', async () => {
    mockAuthResult.value = null

    const { GET } = await import('./costs/route')
    const req = new Request('http://localhost:3000/api/admin/costs')
    const res = await GET(req)

    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBe('Unauthorized')
    log('auth', 'Rejected: non-admin user')
  })

  it('[admin] returns 401 for non-admin user on each route', async () => {
    mockAuthResult.value = null

    const routes = [
      { path: './costs/route', method: 'GET' },
      { path: './cron-history/route', method: 'GET' },
      { path: './pipeline-health/route', method: 'GET' },
      { path: './scoring-stats/route', method: 'GET' },
      { path: './sources/route', method: 'GET' },
      { path: './task-queue/route', method: 'GET' },
    ]

    for (const route of routes) {
      const mod = await import(route.path)
      const handler = mod[route.method]
      const req = new Request(`http://localhost:3000/api/admin/${route.path.replace('./', '').replace('/route', '')}`)
      const res = await handler(req)
      expect(res.status).toBe(401)
    }
    log('auth', `All ${routes.length} GET routes reject non-admin users`)
  })
})

// ─── Individual route tests ─────────────────────────────────────────────────

describe('GET /api/admin/costs', () => {
  it('[admin] returns cost breakdown', async () => {
    mockSupabase.from.mockReturnValue(
      chainable({
        data: [{
          model: 'claude-haiku-3-5',
          task_type: 'ai_score_batch',
          estimated_cost_cents: 5,
          input_tokens: 1000,
          output_tokens: 200,
          created_at: '2026-03-31T12:00:00Z',
        }],
      })
    )

    const { GET } = await import('./costs/route')
    const res = await GET(new Request('http://localhost:3000/api/admin/costs'))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.totalCostCents).toBeDefined()
    expect(body.dailyCosts).toBeDefined()
    expect(body.modelBreakdown).toBeDefined()
    log('costs', `totalCost=${body.totalCostCents}, models=${Object.keys(body.modelBreakdown).length}`)
  })
})

describe('GET /api/admin/cron-history', () => {
  it('[admin] returns execution log and task activity', async () => {
    // The route calls .from() twice: cron_execution_log and task_queue
    // Both need created_at for the split('T') processing
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'cron_execution_log') {
        return chainable({ data: [{ execution_date: '2026-03-31', status: 'completed', trigger_source: 'vercel_cron' }] })
      }
      if (table === 'task_queue') {
        return chainable({ data: [{ task_type: 'ai_score_batch', status: 'completed', created_at: '2026-03-31T04:15:00Z', result_json: {} }] })
      }
      return chainable({ data: [] })
    })

    const { GET } = await import('./cron-history/route')
    const res = await GET(new Request('http://localhost:3000/api/admin/cron-history'))

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.unemploymentCron).toBeDefined()
    expect(body.taskActivity).toBeDefined()
    log('cron-history', `Cron logs: ${body.unemploymentCron.length}, task days: ${Object.keys(body.taskActivity).length}`)
  })
})

describe('GET /api/admin/pipeline-health', () => {
  it('[admin] returns health status with all five pipeline components', async () => {
    const { GET } = await import('./pipeline-health/route')
    const res = await GET(new Request('http://localhost:3000/api/admin/pipeline-health'))

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.discovery).toBeDefined()
    expect(body.scoring).toBeDefined()
    expect(body.queue).toBeDefined()
    expect(body.unemployment).toBeDefined()
    expect(body.alerts).toBeDefined()
    // Each component has a status field
    expect(['green', 'yellow', 'red']).toContain(body.discovery.status)
    expect(['green', 'yellow', 'red']).toContain(body.scoring.status)
    expect(['green', 'yellow', 'red']).toContain(body.queue.status)
    log('pipeline-health', `discovery=${body.discovery.status} scoring=${body.scoring.status} queue=${body.queue.status}`)
  })
})

describe('GET /api/admin/scoring-stats', () => {
  it('[admin] returns scoring statistics with empty-state shape', async () => {
    const { GET } = await import('./scoring-stats/route')
    const res = await GET(new Request('http://localhost:3000/api/admin/scoring-stats'))

    expect(res.status).toBe(200)
    const body = await res.json()
    // Empty-state response (mock returns no jobs)
    expect(body.total).toBe(0)
    expect(body.scoreDistribution).toEqual([])
    expect(body.avgMatchScore).toBeNull()
    expect(body.employerBreakdown).toEqual({})
    expect(body.visaPathBreakdown).toEqual({})
    expect(body.sourceBreakdown).toEqual({})
    expect(body.topMatches).toEqual([])
    log('scoring-stats', `total=${body.total}`)
  })
})

describe('GET /api/admin/sources', () => {
  it('[admin] returns discovery source stats with exa and usajobs entries', async () => {
    const { GET } = await import('./sources/route')
    const res = await GET(new Request('http://localhost:3000/api/admin/sources'))

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body.sources)).toBe(true)
    // Route always initializes exa and usajobs sources
    const names = body.sources.map((s: { name: string }) => s.name)
    expect(names).toContain('exa')
    expect(names).toContain('usajobs')
    // Each source has the expected shape
    const exa = body.sources.find((s: { name: string }) => s.name === 'exa')
    expect(exa).toMatchObject({ jobs24h: 0, jobs7d: 0, jobs30d: 0, errorRate7d: 0 })
    log('sources', `sources=${names.join(', ')}`)
  })
})

describe('GET /api/admin/task-queue', () => {
  it('[admin] returns queue status with tasks array and counts', async () => {
    const { GET } = await import('./task-queue/route')
    const res = await GET(new Request('http://localhost:3000/api/admin/task-queue'))

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body.tasks)).toBe(true)
    expect(typeof body.total).toBe('number')
    expect(body.counts).toBeDefined()
    log('task-queue', `total=${body.total}`)
  })
})

describe('POST /api/admin/retry-task', () => {
  it('[admin] returns 401 when not authenticated', async () => {
    mockAuthResult.value = null

    const { POST } = await import('./retry-task/route')
    const req = new Request('http://localhost:3000/api/admin/retry-task', {
      method: 'POST',
      body: JSON.stringify({ taskId: 'task-123' }),
    })
    const res = await POST(req)

    expect(res.status).toBe(401)
    log('retry-task', 'Rejected: non-admin')
  })

  it('[admin] returns 400 when taskId is missing', async () => {
    const { POST } = await import('./retry-task/route')
    const req = new Request('http://localhost:3000/api/admin/retry-task', {
      method: 'POST',
      body: JSON.stringify({}),
    })
    const res = await POST(req)

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('taskId')
    log('retry-task', 'Rejected: missing taskId')
  })

  it('[admin] retries a failed_validation task', async () => {
    mockSupabase.from.mockReturnValue(
      chainable({ data: { id: 'task-123', status: 'failed_validation', dead_lettered_at: null }, error: null })
    )

    const { POST } = await import('./retry-task/route')
    const req = new Request('http://localhost:3000/api/admin/retry-task', {
      method: 'POST',
      body: JSON.stringify({ taskId: 'task-123' }),
    })
    const res = await POST(req)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.taskId).toBe('task-123')
    log('retry-task', 'Task retried successfully (failed_validation)')
  })

  it('[admin] retries a failed_retry task', async () => {
    mockSupabase.from.mockReturnValue(
      chainable({ data: { id: 'task-456', status: 'failed_retry', dead_lettered_at: null }, error: null })
    )

    const { POST } = await import('./retry-task/route')
    const req = new Request('http://localhost:3000/api/admin/retry-task', {
      method: 'POST',
      body: JSON.stringify({ taskId: 'task-456' }),
    })
    const res = await POST(req)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.taskId).toBe('task-456')
    log('retry-task', 'Task retried successfully (failed_retry)')
  })

  it('[admin] rejects retry of pending task', async () => {
    mockSupabase.from.mockReturnValue(
      chainable({ data: { id: 'task-789', status: 'pending', dead_lettered_at: null }, error: null })
    )

    const { POST } = await import('./retry-task/route')
    const req = new Request('http://localhost:3000/api/admin/retry-task', {
      method: 'POST',
      body: JSON.stringify({ taskId: 'task-789' }),
    })
    const res = await POST(req)

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('not retryable')
    log('retry-task', 'Rejected: pending task is not retryable')
  })
})
