import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

function log(step: string, detail: string) {
  process.stdout.write(`  [fetch-description-cron] ${step}: ${detail}\n`)
}

const { mockInsert, mockSelectCount, mockSelectPending } = vi.hoisted(() => ({
  mockInsert: vi.fn().mockResolvedValue({ error: null }),
  mockSelectCount: vi.fn(),
  mockSelectPending: vi.fn(),
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
              // Head count query: select('*', { count: 'exact', head: true })
              if (args.length > 1) {
                return chainable(mockSelectCount())
              }
              // Data query: select('id') ...
              return {
                eq: () => ({
                  is: () => ({
                    lt: () => ({
                      order: () => ({
                        limit: () => mockSelectPending(),
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

const CRON_SECRET = 'test-fetch-desc-secret'

function makeRequest(secret?: string) {
  const headers = new Headers()
  if (secret) headers.set('authorization', `Bearer ${secret}`)
  return new NextRequest('http://localhost:3000/api/cron/fetch-description', {
    method: 'POST',
    headers,
  })
}

describe('POST /api/cron/fetch-description', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.CRON_SECRET = CRON_SECRET
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321'
    process.env.SUPABASE_SECRET_KEY = 'test-key'
    mockSelectCount.mockResolvedValue({ count: 0 })
    mockSelectPending.mockResolvedValue({
      data: [{ id: 'job-1' }, { id: 'job-2' }],
      error: null,
    })
  })

  it('[fetch-desc] returns 401 without authorization', async () => {
    const { POST } = await import('./route')
    const res = await POST(makeRequest())
    expect(res.status).toBe(401)
    log('auth', 'Rejected: no authorization header')
  })

  it('[fetch-desc] returns 401 with wrong secret', async () => {
    const { POST } = await import('./route')
    const res = await POST(makeRequest('wrong-secret'))
    expect(res.status).toBe(401)
    log('auth', 'Rejected: wrong secret')
  })

  it('[fetch-desc] returns 500 when CRON_SECRET not configured', async () => {
    delete process.env.CRON_SECRET
    const { POST } = await import('./route')
    const res = await POST(makeRequest('anything'))
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toContain('CRON_SECRET')
    log('auth', 'Rejected: CRON_SECRET missing')
  })

  it('[fetch-desc] enqueues fetch_description task with correct payload shape', async () => {
    const { POST } = await import('./route')
    const res = await POST(makeRequest(CRON_SECRET))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.ok).toBe(true)
    expect(body.tasks_created).toBe(1)
    expect(body.jobs_to_fetch).toBe(2)
    expect(mockInsert).toHaveBeenCalledOnce()
    const insertArg = mockInsert.mock.calls[0][0]
    expect(insertArg.task_type).toBe('fetch_description')
    expect(insertArg.payload_json).toEqual({ discovered_job_ids: ['job-1', 'job-2'] })
    log('happy path', `Created ${body.tasks_created} task(s) for ${body.jobs_to_fetch} jobs`)
  })

  it('[fetch-desc] returns tasks_created: 0 when no rows pending fetch', async () => {
    mockSelectPending.mockResolvedValue({ data: [], error: null })
    const { POST } = await import('./route')
    const res = await POST(makeRequest(CRON_SECRET))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.ok).toBe(true)
    expect(body.tasks_created).toBe(0)
    expect(body.reason).toBe('no rows pending fetch')
    expect(mockInsert).not.toHaveBeenCalled()
    log('no work', `Skipped: ${body.reason}`)
  })

  it('[fetch-desc] idempotency: skips when pending task < 30min old', async () => {
    mockSelectCount.mockResolvedValue({ count: 1 })
    const { POST } = await import('./route')
    const res = await POST(makeRequest(CRON_SECRET))
    const body = await res.json()

    expect(body.ok).toBe(true)
    expect(body.tasks_created).toBe(0)
    expect(body.reason).toContain('pending')
    expect(body.reason).toContain('30min')
    expect(mockInsert).not.toHaveBeenCalled()
    log('idempotent', `Skipped: ${body.reason}`)
  })
})
