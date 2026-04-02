import { describe, it, expect, vi, beforeEach } from 'vitest'

function log(step: string, detail: string) {
  process.stdout.write(`  [push-subscribe] ${step}: ${detail}\n`)
}

// ─── Mock Supabase server client ────────────────────────────────────────────

const mockUpdate = vi.fn().mockReturnValue({
  eq: vi.fn().mockResolvedValue({ error: null }),
})

const mockAuth = {
  getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }),
}

vi.mock('@/db/supabase-server', () => ({
  createClient: vi.fn(async () => ({
    auth: mockAuth,
    from: vi.fn(() => ({
      update: mockUpdate,
    })),
  })),
}))

beforeEach(() => {
  vi.clearAllMocks()
  mockAuth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
})

const validSubscription = {
  endpoint: 'https://fcm.googleapis.com/fcm/send/test',
  keys: { p256dh: 'test-key', auth: 'test-auth' },
}

describe('POST /api/push/subscribe', () => {
  it('stores subscription for authenticated user', async () => {
    log('happy', 'Valid subscription')
    const { POST } = await import('./route')
    const res = await POST(new Request('http://localhost/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription: validSubscription }),
    }))
    const body = await res.json()

    expect(body.ok).toBe(true)
    expect(mockUpdate).toHaveBeenCalledWith({ push_subscription: validSubscription })
    log('result', 'Subscription stored')
  })

  it('rejects unauthenticated requests', async () => {
    log('auth', 'No user')
    mockAuth.getUser.mockResolvedValueOnce({ data: { user: null } })

    const { POST } = await import('./route')
    const res = await POST(new Request('http://localhost/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription: validSubscription }),
    }))

    expect(res.status).toBe(401)
  })

  it('rejects invalid subscription (missing keys)', async () => {
    log('invalid', 'Missing keys')
    const { POST } = await import('./route')
    const res = await POST(new Request('http://localhost/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription: { endpoint: 'https://test' } }),
    }))

    expect(res.status).toBe(400)
  })
})

describe('DELETE /api/push/subscribe', () => {
  it('removes subscription for authenticated user', async () => {
    log('unsubscribe', 'Remove subscription')
    const { DELETE } = await import('./route')
    const res = await DELETE(new Request('http://localhost/api/push/subscribe', {
      method: 'DELETE',
    }))
    const body = await res.json()

    expect(body.ok).toBe(true)
    expect(mockUpdate).toHaveBeenCalledWith({ push_subscription: null })
    log('result', 'Subscription removed')
  })
})
