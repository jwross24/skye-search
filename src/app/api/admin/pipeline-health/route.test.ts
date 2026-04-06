import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from './route'

// Mock the admin auth module
vi.mock('../auth', () => ({
  authenticateAdmin: vi.fn(),
}))

import { authenticateAdmin } from '../auth'

const mockAuthenticateAdmin = vi.mocked(authenticateAdmin)

// Deep chainable mock that returns empty/zero data for any Supabase query pattern
function chainable(terminal: Record<string, unknown> = {}): Record<string, unknown> {
  const handler: ProxyHandler<Record<string, unknown>> = {
    get(_target, prop) {
      if (prop === 'then') return undefined // not a thenable
      if (prop in terminal) return terminal[prop]
      // Terminal values for count queries
      if (prop === 'count') return 0
      if (prop === 'data') return []
      // Return chainable for any method call
      return (..._args: unknown[]) => new Proxy({}, handler)
    },
  }
  return new Proxy({}, handler)
}

function createMockSupabase() {
  return {
    from: () => chainable(),
  }
}

describe('GET /api/admin/pipeline-health', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when not authenticated', async () => {
    mockAuthenticateAdmin.mockResolvedValue(null)

    const req = new Request('http://localhost:3000/api/admin/pipeline-health')
    const res = await GET(req)

    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBe('Unauthorized')
  })

  it('returns health data with all pipeline sections', async () => {
    const supabase = createMockSupabase()
    mockAuthenticateAdmin.mockResolvedValue({ userId: 'user-1', supabase: supabase as never })

    const req = new Request('http://localhost:3000/api/admin/pipeline-health')
    const res = await GET(req)

    expect(res.status).toBe(200)
    const data = await res.json()

    // Verify all pipeline sections present
    expect(data).toHaveProperty('discovery')
    expect(data).toHaveProperty('scoring')
    expect(data).toHaveProperty('queue')
    expect(data).toHaveProperty('unemployment')
    expect(data).toHaveProperty('alerts')
    expect(data).toHaveProperty('linkValidation')

    // Link validation section has expected shape
    expect(data.linkValidation).toMatchObject({
      status: expect.any(String),
      active: expect.any(Number),
      unvalidated: expect.any(Number),
      deadLink: expect.any(Number),
      closed: expect.any(Number),
      timeout: expect.any(Number),
    })
  })
})
