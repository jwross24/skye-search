import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ─── Mock link-validator ──────────────────────────────────────────────────

const { mockValidateJobBatch } = vi.hoisted(() => ({
  mockValidateJobBatch: vi.fn(),
}))

vi.mock('@/lib/link-validator', () => ({
  validateJobBatch: mockValidateJobBatch,
}))

// ─── Supabase mock ─────────────────────────────────────────────────────────

const { mockUpdate, mockIdempotencyCheck, mockJobsQuery } = vi.hoisted(() => ({
  mockUpdate: vi.fn().mockReturnValue({
    eq: vi.fn().mockResolvedValue({ error: null }),
  }),
  mockIdempotencyCheck: vi.fn(),
  mockJobsQuery: vi.fn(),
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
        if (table === 'discovered_jobs') {
          return {
            select: (cols: string, opts?: { count?: string; head?: boolean }) => {
              // Idempotency check (count query)
              if (opts?.head) {
                return {
                  eq: () => ({
                    gte: () => mockIdempotencyCheck(),
                  }),
                }
              }
              // Jobs query
              return {
                eq: () => ({
                  not: () => ({
                    not: () => ({
                      or: () => ({
                        order: () => ({
                          order: () => ({
                            limit: () => mockJobsQuery(),
                          }),
                        }),
                      }),
                    }),
                  }),
                }),
              }
            },
            update: mockUpdate,
          }
        }
        return chainable({ data: [] })
      },
    })),
  }
})

import { POST } from './route'

// ─── Helpers ───────────────────────────────────────────────────────────────

const CRON_SECRET = 'test-link-validation-secret'

function makeRequest(secret?: string) {
  const headers = new Headers()
  if (secret) headers.set('authorization', `Bearer ${secret}`)
  return new NextRequest('http://localhost:3000/api/cron/link-validation', {
    method: 'POST',
    headers,
  })
}

// ─── Tests ─────────────────────────────────────────────────────────────────

describe('POST /api/cron/link-validation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.CRON_SECRET = CRON_SECRET
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321'
    process.env.SUPABASE_SECRET_KEY = 'test-key'
    // Default: no recent runs
    mockIdempotencyCheck.mockResolvedValue({ count: 0 })
    // Default: some jobs to validate
    mockJobsQuery.mockResolvedValue({
      data: [
        { id: 'dj-1', url: 'https://example.com/job/1', content_hash: null },
        { id: 'dj-2', url: 'https://example.com/job/2', content_hash: 'abc123' },
      ],
      error: null,
    })
    // Default: validator returns mixed results
    mockValidateJobBatch.mockResolvedValue([
      { discoveredJobId: 'dj-1', status: 'active', reason: 'OK', contentHash: 'hash1' },
      { discoveredJobId: 'dj-2', status: 'dead_link', reason: 'HTTP 404' },
    ])
  })

  it('returns 401 without authorization', async () => {
    const res = await POST(makeRequest())
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBe('Unauthorized')
  })

  it('returns 401 with wrong secret', async () => {
    const res = await POST(makeRequest('wrong-secret'))
    expect(res.status).toBe(401)
  })

  it('returns 500 if CRON_SECRET not configured', async () => {
    delete process.env.CRON_SECRET
    const res = await POST(makeRequest('anything'))
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toBe('CRON_SECRET not configured')
  })

  it('validates jobs and returns result summary', async () => {
    const res = await POST(makeRequest(CRON_SECRET))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.ok).toBe(true)
    expect(body.validated).toBe(2)
    expect(body.results.active).toBe(1)
    expect(body.results.dead_link).toBe(1)
    expect(body.duration_ms).toBeGreaterThanOrEqual(0)
    expect(mockValidateJobBatch).toHaveBeenCalledTimes(1)
  })

  it('skips when recently validated (idempotency)', async () => {
    mockIdempotencyCheck.mockResolvedValue({ count: 5 })

    const res = await POST(makeRequest(CRON_SECRET))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.ok).toBe(true)
    expect(body.validated).toBe(0)
    expect(body.reason).toContain('already ran')
    expect(mockValidateJobBatch).not.toHaveBeenCalled()
  })

  it('returns empty results when no jobs to validate', async () => {
    mockJobsQuery.mockResolvedValue({ data: [], error: null })

    const res = await POST(makeRequest(CRON_SECRET))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.ok).toBe(true)
    expect(body.validated).toBe(0)
    expect(body.results).toEqual({ active: 0, dead_link: 0, closed: 0, timeout: 0 })
  })

  it('updates discovered_jobs with validation results', async () => {
    await POST(makeRequest(CRON_SECRET))

    // update should be called for each result
    expect(mockUpdate).toHaveBeenCalledTimes(2)

    // First call: active with contentHash
    const firstUpdate = mockUpdate.mock.calls[0][0]
    expect(firstUpdate.validation_status).toBe('active')
    expect(firstUpdate.content_hash).toBe('hash1')
    expect(firstUpdate.last_validated_at).toBeDefined()

    // Second call: dead_link without contentHash
    const secondUpdate = mockUpdate.mock.calls[1][0]
    expect(secondUpdate.validation_status).toBe('dead_link')
    expect(secondUpdate.content_hash).toBeUndefined()
  })
})
