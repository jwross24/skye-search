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
  from: vi.fn(() => chainable({ data: [], count: 0 })),
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
})
