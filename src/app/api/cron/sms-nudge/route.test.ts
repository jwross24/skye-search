import { describe, it, expect, vi, beforeEach } from 'vitest'

function log(step: string, detail: string) {
  process.stdout.write(`  [sms-nudge] ${step}: ${detail}\n`)
}

// ─── Mock Twilio ────────────────────────────────────────────────────────────

const mockSendSms = vi.fn().mockResolvedValue({ sid: 'SM_test_123', status: 'queued' })

vi.mock('@/lib/twilio', () => ({
  sendSms: (...args: unknown[]) => mockSendSms(...args),
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

beforeEach(() => {
  vi.clearAllMocks()
  process.env.CRON_SECRET = 'test-secret'
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://127.0.0.1:54321'
  process.env.SUPABASE_SECRET_KEY = 'test-key'
  process.env.SKYE_PHONE_NUMBER = '+15551234567'
  process.env.TWILIO_ACCOUNT_SID = 'AC_test'
  process.env.TWILIO_AUTH_TOKEN = 'test_token'
  process.env.TWILIO_FROM_NUMBER = '+15559876543'

  mockFrom.mockImplementation((table: string) => {
    if (table === 'users') return chainable({ data: [{ id: 'user-1', break_mode_until: null }] })
    if (table === 'immigration_clock') return chainable({ data: { days_remaining: 119 } })
    if (table === 'immigration_status') return chainable({ data: { initial_days_used: 31 } })
    if (table === 'votes') return chainable({ data: [] })
    if (table === 'applications') return chainable({ data: [] })
    if (table === 'jobs') return chainable({ data: [{ title: 'Physical Scientist', company: 'NOAA', match_score: 0.92, visa_path: 'cap_exempt', url: 'https://example.com' }] })
    return chainable({ data: null })
  })
})

function makeRequest(secret?: string) {
  return new Request('http://localhost:3000/api/cron/sms-nudge', {
    headers: secret ? { authorization: `Bearer ${secret}` } : {},
  }) as unknown as import('next/server').NextRequest
}

describe('POST /api/cron/sms-nudge', () => {
  it('rejects unauthorized requests', async () => {
    log('auth', 'No secret')
    const { POST } = await import('./route')
    const res = await POST(makeRequest())
    expect(res.status).toBe(401)
  })

  it('skips when no phone number configured', async () => {
    log('no-phone', 'SKYE_PHONE_NUMBER not set')
    delete process.env.SKYE_PHONE_NUMBER

    const { POST } = await import('./route')
    const res = await POST(makeRequest('test-secret'))
    const body = await res.json()

    expect(body.sent).toBe(false)
    expect(body.reason).toBe('no_phone_number')
  })

  it('sends SMS with top pick on standard day', async () => {
    log('happy', 'Standard day with top pick')
    const { POST } = await import('./route')
    const res = await POST(makeRequest('test-secret'))
    const body = await res.json()

    expect(body.ok).toBe(true)
    expect(body.sent).toBe(true)
    expect(body.messageSid).toBe('SM_test_123')
    expect(body.daysRemaining).toBe(119)
    expect(body.hasTopPick).toBe(true)

    expect(mockSendSms).toHaveBeenCalledOnce()
    const smsArgs = mockSendSms.mock.calls[0][0]
    expect(smsArgs.to).toBe('+15551234567')
    expect(smsArgs.body).toContain('NOAA')
    expect(smsArgs.body).toContain('119 days')
    log('result', 'SMS sent with correct content')
  })

  it('sends no-match message when no scored jobs', async () => {
    log('no-match', 'No scored jobs')
    mockFrom.mockImplementation((table: string) => {
      if (table === 'users') return chainable({ data: [{ id: 'user-1', break_mode_until: null }] })
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

    expect(body.sent).toBe(true)
    expect(body.hasTopPick).toBe(false)

    const smsBody = mockSendSms.mock.calls[0][0].body
    expect(smsBody).toContain('No new standout')
    log('result', 'No-match message sent')
  })

  it('skips during break mode when >15 days remaining', async () => {
    log('break', 'Break mode active with 119 days')
    mockFrom.mockImplementation((table: string) => {
      if (table === 'users') return chainable({ data: [{ id: 'user-1', break_mode_until: '2099-12-31' }] })
      if (table === 'immigration_clock') return chainable({ data: { days_remaining: 119 } })
      if (table === 'immigration_status') return chainable({ data: { initial_days_used: 31 } })
      return chainable({ data: [] })
    })

    const { POST } = await import('./route')
    const res = await POST(makeRequest('test-secret'))
    const body = await res.json()

    expect(body.sent).toBe(false)
    expect(body.reason).toBe('break_mode')
    expect(mockSendSms).not.toHaveBeenCalled()
    log('result', 'Skipped for break mode')
  })

  it('overrides break mode when <=15 days remaining', async () => {
    log('break-override', 'Break mode but critical clock')
    mockFrom.mockImplementation((table: string) => {
      if (table === 'users') return chainable({ data: [{ id: 'user-1', break_mode_until: '2099-12-31' }] })
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

    expect(body.sent).toBe(true)
    const smsBody = mockSendSms.mock.calls[0][0].body
    expect(smsBody).toContain('10 days')
    log('result', 'Break mode overridden for urgent clock')
  })

  it('handles Twilio errors gracefully', async () => {
    log('error', 'Twilio throws')
    mockSendSms.mockRejectedValueOnce(new Error('Twilio: invalid number'))

    const { POST } = await import('./route')
    const res = await POST(makeRequest('test-secret'))
    const body = await res.json()

    expect(res.status).toBe(500)
    expect(body.sent).toBe(false)
    expect(body.reason).toBe('twilio_error')
    log('result', 'Error handled gracefully')
  })
})
