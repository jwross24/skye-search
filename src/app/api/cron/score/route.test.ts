import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

function log(step: string, detail: string) {
  process.stdout.write(`  [score-cron] ${step}: ${detail}\n`)
}

const { mockInsert, mockSelectCount, mockSelectUnscored } = vi.hoisted(() => ({
  mockInsert: vi.fn().mockResolvedValue({ error: null }),
  mockSelectCount: vi.fn(),
  mockSelectUnscored: vi.fn(),
}))

vi.mock('@supabase/supabase-js', () => {
  function chainable(result: unknown) {
    return new Proxy({} as Record<string, unknown>, {
      get(_, prop) {
        if (prop === 'then') return (r: (v: unknown) => void) => Promise.resolve(result).then(r)
        return () => chainable(result)
      },
    })
  }

  return {
    createClient: vi.fn(() => ({
      from: (table: string) => {
        if (table === 'users') return chainable({ data: [{ id: 'user-1' }] })
        if (table === 'task_queue') {
          return {
            select: () => ({
              eq: () => ({
                in: () => ({
                  gte: () => mockSelectCount(),
                }),
              }),
            }),
            insert: mockInsert,
          }
        }
        if (table === 'discovered_jobs') {
          return {
            select: (...args: unknown[]) => {
              // Head count query vs data query
              if (args.length > 1) {
                // count query: .select('*', { count: 'exact', head: true })
                return chainable(mockSelectCount())
              }
              return {
                eq: () => ({
                  eq: () => ({
                    not: () => ({
                      order: () => ({
                        order: () => ({
                          limit: () => mockSelectUnscored(),
                        }),
                      }),
                    }),
                  }),
                }),
              }
            },
          }
        }
        return chainable({ data: [] })
      },
    })),
  }
})

vi.mock('@/lib/budget-guard', () => ({
  checkBudget: vi.fn().mockResolvedValue({ action: 'allow' }),
}))

const CRON_SECRET = 'test-score-secret'

function makeRequest(secret?: string) {
  const headers = new Headers()
  if (secret) headers.set('authorization', `Bearer ${secret}`)
  return new NextRequest('http://localhost:3000/api/cron/score', { method: 'POST', headers })
}

describe('POST /api/cron/score', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.CRON_SECRET = CRON_SECRET
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321'
    process.env.SUPABASE_SECRET_KEY = 'test-key'
    mockSelectCount.mockResolvedValue({ count: 0 })
    mockSelectUnscored.mockResolvedValue({
      data: [{ id: 'job-1' }, { id: 'job-2' }],
      error: null,
    })
  })

  it('[score] returns 401 without authorization', async () => {
    const { POST } = await import('./route')
    const res = await POST(makeRequest())
    expect(res.status).toBe(401)
    log('auth', 'Rejected: no authorization header')
  })

  it('[score] returns 401 with wrong secret', async () => {
    const { POST } = await import('./route')
    const res = await POST(makeRequest('wrong-secret'))
    expect(res.status).toBe(401)
    log('auth', 'Rejected: wrong secret')
  })

  it('[score] returns 500 when CRON_SECRET not configured', async () => {
    delete process.env.CRON_SECRET
    const { POST } = await import('./route')
    const res = await POST(makeRequest('anything'))
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toContain('CRON_SECRET')
    log('auth', 'Rejected: CRON_SECRET missing')
  })

  it('[score] creates scoring task when unscored jobs exist', async () => {
    const { POST } = await import('./route')
    const res = await POST(makeRequest(CRON_SECRET))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.ok).toBe(true)
    expect(body.tasks_created).toBe(1)
    expect(body.jobs_to_score).toBe(2)
    expect(mockInsert).toHaveBeenCalledOnce()
    log('happy path', `Created ${body.tasks_created} task(s), ${body.jobs_to_score} jobs to score`)
  })

  it('[score] skips when pending task exists (idempotent)', async () => {
    mockSelectCount.mockResolvedValue({ count: 1 })
    const { POST } = await import('./route')
    const res = await POST(makeRequest(CRON_SECRET))
    const body = await res.json()

    expect(body.ok).toBe(true)
    expect(body.tasks_created).toBe(0)
    expect(body.reason).toContain('pending')
    expect(mockInsert).not.toHaveBeenCalled()
    log('idempotent', `Skipped: ${body.reason}`)
  })

  it('[score] skips when no unscored jobs', async () => {
    mockSelectCount.mockResolvedValue({ count: 0 })
    mockSelectUnscored.mockResolvedValue({ data: [], error: null })
    const { POST } = await import('./route')
    const res = await POST(makeRequest(CRON_SECRET))
    const body = await res.json()

    expect(body.ok).toBe(true)
    expect(body.tasks_created).toBe(0)
    expect(body.reason).toBe('no unscored jobs')
    log('no work', `Skipped: ${body.reason}`)
  })

  it('[score] skips when budget paused', async () => {
    const { checkBudget } = await import('@/lib/budget-guard')
    vi.mocked(checkBudget).mockResolvedValue({ action: 'pause', reason: 'Daily cap reached' } as ReturnType<typeof checkBudget> extends Promise<infer T> ? T : never)
    const { POST } = await import('./route')
    const res = await POST(makeRequest(CRON_SECRET))
    const body = await res.json()

    expect(body.ok).toBe(true)
    expect(body.tasks_created).toBe(0)
    expect(body.reason).toContain('Budget paused')
    log('budget', `Skipped: ${body.reason}`)
  })
})
