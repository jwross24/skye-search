import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ─── Supabase mock ─────────────────────────────────────────────────────────

const { mockUpsert, mockCountSelect } = vi.hoisted(() => ({
  mockUpsert: vi.fn().mockResolvedValue({ error: null }),
  mockCountSelect: vi.fn(),
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
            select: () => ({
              eq: () => ({
                eq: () => ({
                  gte: () => mockCountSelect(),
                }),
                gte: () => mockCountSelect(),
              }),
            }),
            upsert: mockUpsert,
          }
        }
        return chainable({ data: [] })
      },
    })),
  }
})

// ─── Adapter mock ─────────────────────────────────────────────────────────

const { mockDiscover } = vi.hoisted(() => ({
  mockDiscover: vi.fn(),
}))

vi.mock('@/lib/adapters/career-page-monitor', () => ({
  careerPageMonitorAdapter: {
    discover: mockDiscover,
    healthCheck: vi.fn().mockResolvedValue({ healthy: true, latencyMs: 10 }),
  },
  CAREER_PAGES: [],
}))

import { POST } from './route'

// ─── Helpers ───────────────────────────────────────────────────────────────

const CRON_SECRET = 'test-career-secret'

function makeRequest(secret?: string) {
  const headers = new Headers()
  if (secret) headers.set('authorization', `Bearer ${secret}`)
  return new NextRequest('http://localhost:3000/api/cron/career-page-monitor', {
    method: 'POST',
    headers,
  })
}

function fakeJobs(n: number) {
  return Array.from({ length: n }, (_, i) => ({
    source: 'career_page_monitor' as const,
    url: `https://example.org/jobs/${i}`,
    title: `Job Title ${i}`,
    company: 'Test Org',
    raw_description: null,
    canonical_url: `https://example.org/jobs/${i}`,
    normalized_company: 'Test Org',
    indexed_date: new Date().toISOString(),
    source_type: 'academic' as const,
    discovery_source_detail: 'career_page:test',
  }))
}

// ─── Tests ────────────────────────���──────────────────────────────────��─────

describe('POST /api/cron/career-page-monitor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.CRON_SECRET = CRON_SECRET
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321'
    process.env.SUPABASE_SECRET_KEY = 'test-key'
    // Default: no recent runs (idempotency check passes)
    mockCountSelect.mockResolvedValue({ count: 0 })
    // Default: adapter returns 3 jobs
    mockDiscover.mockResolvedValue({
      jobs: fakeJobs(3),
      errors: [],
      metadata: { request_count: 4, latency_ms: 5000 },
    })
  })

  it('returns 401 on missing authorization', async () => {
    const res = await POST(makeRequest())
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBe('Unauthorized')
  })

  it('returns 401 on wrong secret', async () => {
    const res = await POST(makeRequest('wrong-secret'))
    expect(res.status).toBe(401)
  })

  it('returns 200 and upserts jobs on valid request', async () => {
    const res = await POST(makeRequest(CRON_SECRET))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.ok).toBe(true)
    expect(body.jobs_found).toBe(3)
    expect(body.jobs_inserted).toBe(3)
    expect(body.errors).toEqual([])

    expect(mockUpsert).toHaveBeenCalledTimes(1)
    const rows = mockUpsert.mock.calls[0][0]
    expect(rows).toHaveLength(3)
    expect(rows[0].source).toBe('career_page_monitor')
    expect(rows[0].user_id).toBe('user-1')
    expect(rows[0].scored).toBe(false)
  })

  it('short-circuits when recent career_page_monitor runs exist', async () => {
    mockCountSelect.mockResolvedValue({ count: 12 })

    const res = await POST(makeRequest(CRON_SECRET))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.ok).toBe(true)
    expect(body.jobs_found).toBe(0)
    expect(body.reason).toContain('already ran in the last 2 hours')
    expect(mockDiscover).not.toHaveBeenCalled()
    expect(mockUpsert).not.toHaveBeenCalled()
  })

  it('returns 200 with errors array when adapter returns partial errors', async () => {
    mockDiscover.mockResolvedValue({
      jobs: fakeJobs(2),
      errors: [
        { adapter: 'career_page:mbari', message: 'HTTP 503' },
      ],
      metadata: { request_count: 4, latency_ms: 8000 },
    })

    const res = await POST(makeRequest(CRON_SECRET))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.ok).toBe(true)
    expect(body.jobs_found).toBe(2)
    expect(body.errors).toHaveLength(1)
    expect(body.errors[0].adapter).toBe('career_page:mbari')
  })

  it('returns 200 with zero insertions when adapter finds no jobs', async () => {
    mockDiscover.mockResolvedValue({
      jobs: [],
      errors: [],
      metadata: { request_count: 4, latency_ms: 3000 },
    })

    const res = await POST(makeRequest(CRON_SECRET))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.ok).toBe(true)
    expect(body.jobs_found).toBe(0)
    expect(body.jobs_inserted).toBe(0)
    expect(mockUpsert).not.toHaveBeenCalled()
  })

  it('returns 500 if CRON_SECRET not configured', async () => {
    delete process.env.CRON_SECRET
    const res = await POST(makeRequest('anything'))
    expect(res.status).toBe(500)
  })
})
