/**
 * Pipeline eval route tests — co-located wrapper.
 * Main tests in ../admin-routes.test.ts (shared infrastructure).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockAuthResult = vi.hoisted(() => ({
  value: null as { supabase: unknown; userId: string } | null,
}))

vi.mock('../auth', () => ({
  authenticateAdmin: vi.fn(() => Promise.resolve(mockAuthResult.value)),
}))

function chainable(result: unknown) {
  return new Proxy({} as Record<string, unknown>, {
    get(_, prop) {
      if (prop === 'then') return (r: (v: unknown) => void) => Promise.resolve(result).then(r)
      return () => chainable(result)
    },
  })
}

const mockSupabase = {
  from: vi.fn<(table: string) => ReturnType<typeof chainable>>(() => chainable({ data: [], count: 0 })),
}

beforeEach(() => {
  vi.clearAllMocks()
  mockAuthResult.value = { supabase: mockSupabase, userId: 'user-1' }
})

describe('GET /api/admin/pipeline-eval', () => {
  it('[admin] returns 401 when not authenticated', async () => {
    mockAuthResult.value = null
    const { GET } = await import('./route')
    const res = await GET(new Request('http://localhost:3000/api/admin/pipeline-eval'))
    expect(res.status).toBe(401)
  })

  it('[admin] returns all 5 metrics', async () => {
    const { GET } = await import('./route')
    const res = await GET(new Request('http://localhost:3000/api/admin/pipeline-eval'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.metrics.posting_precision).toBeDefined()
    expect(body.metrics.us_canada_rate).toBeDefined()
    expect(body.metrics.visa_known_rate).toBeDefined()
    expect(body.metrics.interested_rate).toBeDefined()
    expect(body.metrics.duplicate_rate).toBeDefined()
  })

  it('[admin] returns source_metrics as an object', async () => {
    const { GET } = await import('./route')
    const res = await GET(new Request('http://localhost:3000/api/admin/pipeline-eval'))
    expect(res.status).toBe(200)
    const body = await res.json()
    // With empty mock data, source_metrics should be an empty object (not undefined)
    expect(body.source_metrics).toBeDefined()
    expect(typeof body.source_metrics).toBe('object')
  })

  it('[admin] computes per-source precision correctly', async () => {
    // Override mock to return specific data for this test
    const discoveredRows = [
      { canonical_url: 'https://example.com/job1', url: 'https://example.com/job1', scored: true, discovery_source_detail: 'query:ocean color remote sensing' },
      { canonical_url: 'https://example.com/job2', url: 'https://example.com/job2', scored: true, discovery_source_detail: 'query:ocean color remote sensing' },
      { canonical_url: 'https://example.com/job3', url: 'https://example.com/job3', scored: false, discovery_source_detail: 'query:ocean color remote sensing' },
      { canonical_url: 'https://seed.com/job4', url: 'https://seed.com/job4', scored: true, discovery_source_detail: 'seed:https://seed.com/jobs' },
    ]
    const jobRows = [
      // job1: relevant, US/CA
      { url: 'https://example.com/job1', match_score: 0.8, location: 'Boston, MA', visa_path: null, company: 'Acme', title: 'Researcher' },
      // job2: scored but match_score=0 (filtered out as "not real")
      { url: 'https://example.com/job2', match_score: 0, location: 'Boston, MA', visa_path: null, company: 'Acme2', title: 'Role' },
      // job4: relevant but not US/CA
      { url: 'https://seed.com/job4', match_score: 0.5, location: 'London, UK', visa_path: null, company: 'UK Co', title: 'Analyst' },
    ]

    // Per-call mock: jobs query returns jobRows, discovered_jobs queries return discoveredRows or []
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'jobs') {
        // count query (head:true) → count, data query → jobRows
        // We return jobRows for both; the route handles count vs data separately
        return chainable({ data: jobRows, count: jobRows.length })
      }
      if (table === 'discovered_jobs') {
        return chainable({ data: discoveredRows, count: discoveredRows.length })
      }
      return chainable({ data: [], count: 0 })
    })

    const { GET } = await import('./route')
    const res = await GET(new Request('http://localhost:3000/api/admin/pipeline-eval'))
    expect(res.status).toBe(200)
    const body = await res.json()

    const sm = body.source_metrics as Record<string, {
      discovered: number; scored: number; matched: number
      relevant: number; us_canada: number; precision: number | null; us_canada_rate: number | null
    }>

    // query:ocean color remote sensing: 3 discovered, 2 scored, 1 matched+relevant (job1), 1 us_canada
    expect(sm['query:ocean color remote sensing']).toBeDefined()
    const q = sm['query:ocean color remote sensing']
    expect(q.discovered).toBe(3)
    expect(q.scored).toBe(2)
    expect(q.relevant).toBe(1)  // only job1 has match_score > 0
    expect(q.us_canada).toBe(1)
    expect(q.precision).toBeCloseTo(0.5)  // 1 relevant / 2 scored

    // seed source: 1 discovered, 1 scored, 1 matched, 1 relevant, 0 us_canada
    expect(sm['seed:https://seed.com/jobs']).toBeDefined()
    const s = sm['seed:https://seed.com/jobs']
    expect(s.discovered).toBe(1)
    expect(s.scored).toBe(1)
    expect(s.relevant).toBe(1)
    expect(s.us_canada).toBe(0)
    expect(s.precision).toBeCloseTo(1.0)
    expect(s.us_canada_rate).toBe(0)
  })
})
