import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockGetUser, mockFrom } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockFrom: vi.fn(),
}))

vi.mock('@/db/supabase-server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  }),
}))

import { GET } from './route'

describe('GET /api/inbox-count', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 with error type when unauthenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const res = await GET()
    const body = await res.json()

    expect(res.status).toBe(401)
    expect(body.error).toBe('unauthenticated')
    expect(body.count).toBe(0)
  })

  it('returns count for authenticated user', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          eq: () => Promise.resolve({ count: 3, error: null }),
        }),
      }),
    })

    const res = await GET()
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.count).toBe(3)
    expect(body.error).toBeUndefined()
  })

  it('returns 500 with db_error on query failure', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          eq: () => Promise.resolve({ count: null, error: { message: 'connection failed' } }),
        }),
      }),
    })

    const res = await GET()
    const body = await res.json()

    expect(res.status).toBe(500)
    expect(body.error).toBe('db_error')
    expect(body.count).toBe(0)
  })

  it('returns 500 with internal_error on unexpected throw', async () => {
    mockGetUser.mockRejectedValue(new Error('unexpected'))

    const res = await GET()
    const body = await res.json()

    expect(res.status).toBe(500)
    expect(body.error).toBe('internal_error')
    expect(body.count).toBe(0)
  })
})
