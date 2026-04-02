import { describe, it, expect, vi, beforeEach } from 'vitest'

function log(step: string, detail: string) {
  process.stdout.write(`  [push-nudge] ${step}: ${detail}\n`)
}

// ─── Mock web-push ──────────────────────────────────────────────────────────

const mockSendPush = vi.fn().mockResolvedValue({ success: true, statusCode: 201 })

vi.mock('@/lib/web-push', () => ({
  sendPushNotification: (...args: unknown[]) => mockSendPush(...args),
}))

// ─── Mock Supabase ──────────────────────────────────────────────────────────

type ChainResult = { data: unknown; count?: number; error?: null }

function chainable(result: ChainResult) {
  return new Proxy({} as Record<string, unknown>, {
    get(_, prop) {
      if (prop === 'then') return (r: (v: unknown) => void) => Promise.resolve(result).then(r)
      return () => chainable(result)
    },
  })
}

const mockFrom = vi.fn()

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: (...args: unknown[]) => mockFrom(...args),
  })),
}))

// ─── Env ────────────────────────────────────────────────────────────────────

const testSubscription = {
  endpoint: 'https://fcm.googleapis.com/fcm/send/test',
  keys: { p256dh: 'test-p256dh', auth: 'test-auth' },
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.CRON_SECRET = 'test-secret'
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://127.0.0.1:54321'
  process.env.SUPABASE_SECRET_KEY = 'test-key'
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = 'test-public-key'
  process.env.VAPID_PRIVATE_KEY = 'test-private-key'

  mockFrom.mockImplementation((table: string) => {
    if (table === 'users') return chainable({ data: [{ id: 'user-1', push_subscription: testSubscription, break_mode_until: null }] })
    if (table === 'immigration_clock') return chainable({ data: { days_remaining: 119 } })
    if (table === 'immigration_status') return chainable({ data: { initial_days_used: 31 } })
    if (table === 'votes') return chainable({ data: [] })
    if (table === 'applications') return chainable({ data: [] })
    if (table === 'jobs') return chainable({ data: [{ title: 'Physical Scientist', company: 'NOAA', match_score: 0.92, visa_path: 'cap_exempt', url: 'https://example.com' }] })
    return chainable({ data: null })
  })
})

function makeRequest(secret?: string) {
  return new Request('http://localhost:3000/api/cron/push-nudge', {
    headers: secret ? { authorization: `Bearer ${secret}` } : {},
  }) as unknown as import('next/server').NextRequest
}

describe('POST /api/cron/push-nudge', () => {
  it('rejects unauthorized requests', async () => {
    log('auth', 'No secret')
    const { POST } = await import('./route')
    const res = await POST(makeRequest())
    expect(res.status).toBe(401)
  })

  it('skips when no users have push subscriptions', async () => {
    log('no-subs', 'No subscribed users')
    mockFrom.mockImplementation((table: string) => {
      if (table === 'users') return chainable({ data: [] })
      return chainable({ data: null })
    })

    const { POST } = await import('./route')
    const res = await POST(makeRequest('test-secret'))
    const body = await res.json()

    expect(body.ok).toBe(true)
    expect(body.sent).toBe(0)
    expect(body.reason).toBe('no_subscribed_users')
    log('result', 'Skipped correctly')
  })

  it('sends push with top pick on standard day', async () => {
    log('happy', 'Standard day with top pick')
    const { POST } = await import('./route')
    const res = await POST(makeRequest('test-secret'))
    const body = await res.json()

    expect(body.ok).toBe(true)
    expect(body.sent).toBe(1)
    expect(mockSendPush).toHaveBeenCalledOnce()

    const [sub, payload] = mockSendPush.mock.calls[0]
    expect(sub.endpoint).toBe(testSubscription.endpoint)
    expect(payload.title).toContain('NOAA')
    expect(payload.body).toContain('119 days')
    expect(payload.url).toBe('https://example.com')
    log('result', 'Push sent with correct content')
  })

  it('skips during break mode when >15 days remaining', async () => {
    log('break', 'Break mode active')
    mockFrom.mockImplementation((table: string) => {
      if (table === 'users') return chainable({ data: [{ id: 'user-1', push_subscription: testSubscription, break_mode_until: '2099-12-31' }] })
      if (table === 'immigration_clock') return chainable({ data: { days_remaining: 119 } })
      if (table === 'immigration_status') return chainable({ data: { initial_days_used: 31 } })
      return chainable({ data: [] })
    })

    const { POST } = await import('./route')
    const res = await POST(makeRequest('test-secret'))
    const body = await res.json()

    expect(body.sent).toBe(0)
    expect(mockSendPush).not.toHaveBeenCalled()
    log('result', 'Skipped for break mode')
  })

  it('overrides break mode when <=15 days', async () => {
    log('break-override', 'Break mode but critical')
    mockFrom.mockImplementation((table: string) => {
      if (table === 'users') return chainable({ data: [{ id: 'user-1', push_subscription: testSubscription, break_mode_until: '2099-12-31' }] })
      if (table === 'immigration_clock') return chainable({ data: { days_remaining: 10 } })
      if (table === 'immigration_status') return chainable({ data: { initial_days_used: 140 } })
      if (table === 'votes') return chainable({ data: [] })
      if (table === 'applications') return chainable({ data: [] })
      if (table === 'jobs') return chainable({ data: [{ title: 'Scientist', company: 'MIT', match_score: 0.85, visa_path: 'cap_exempt', url: null }] })
      return chainable({ data: null })
    })

    const { POST } = await import('./route')
    const res = await POST(makeRequest('test-secret'))
    const body = await res.json()

    expect(body.sent).toBe(1)
    log('result', 'Break mode overridden')
  })

  it('removes expired subscriptions on 410', async () => {
    log('expired', 'Push service returns 410')
    mockSendPush.mockResolvedValueOnce({ success: false, statusCode: 410, error: 'subscription_expired' })

    const { POST } = await import('./route')
    const res = await POST(makeRequest('test-secret'))
    const body = await res.json()

    expect(body.sent).toBe(0)
    // Verify the update call to clear push_subscription was made
    const updateCalls = mockFrom.mock.calls.filter((args) => args[0] === 'users')
    expect(updateCalls.length).toBeGreaterThan(1) // initial query + cleanup update
    log('result', 'Expired subscription cleaned up')
  })

  it('sends no-match message when no scored jobs', async () => {
    log('no-match', 'No scored jobs')
    mockFrom.mockImplementation((table: string) => {
      if (table === 'users') return chainable({ data: [{ id: 'user-1', push_subscription: testSubscription, break_mode_until: null }] })
      if (table === 'immigration_clock') return chainable({ data: { days_remaining: 119 } })
      if (table === 'immigration_status') return chainable({ data: { initial_days_used: 31 } })
      if (table === 'votes') return chainable({ data: [] })
      if (table === 'applications') return chainable({ data: [] })
      if (table === 'jobs') return chainable({ data: [] })
      return chainable({ data: null })
    })

    const { POST } = await import('./route')
    const res = await POST(makeRequest('test-secret'))
    const body = await res.json()

    expect(body.sent).toBe(1)
    const payload = mockSendPush.mock.calls[0][1]
    expect(payload.title).toBe('Your daily check-in')
    expect(payload.body).toContain('No new standout')
    log('result', 'No-match push sent')
  })
})
