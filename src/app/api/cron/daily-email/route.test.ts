import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

function log(step: string, detail: string) {
  process.stdout.write(`  [daily-email-cron] ${step}: ${detail}\n`)
}

const { mockPrepareDailyPicks, mockSendEmail } = vi.hoisted(() => ({
  mockPrepareDailyPicks: vi.fn(),
  mockSendEmail: vi.fn().mockResolvedValue({ id: 'msg-test-123' }),
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
        return chainable({ data: [] })
      },
      auth: {
        admin: {
          listUsers: vi.fn().mockResolvedValue({
            data: { users: [{ id: 'user-1', email: 'test@example.com' }] },
            error: null,
          }),
        },
      },
    })),
  }
})

vi.mock('@/lib/daily-picks', () => ({
  prepareDailyPicks: (...args: unknown[]) => mockPrepareDailyPicks(...args),
}))

vi.mock('@/lib/resend', () => ({
  sendEmail: (...args: unknown[]) => mockSendEmail(...args),
}))

// Mock React email component
vi.mock('@/lib/email-templates/templates/daily-picks', () => ({
  DailyPicksEmail: vi.fn(() => null),
}))

const CRON_SECRET = 'test-email-secret'

function makeRequest(secret?: string, body?: Record<string, unknown>) {
  const headers = new Headers()
  if (secret) headers.set('authorization', `Bearer ${secret}`)
  return new NextRequest('http://localhost:3000/api/cron/daily-email', {
    method: 'POST',
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
}

describe('POST /api/cron/daily-email', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.CRON_SECRET = CRON_SECRET
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321'
    process.env.SUPABASE_SECRET_KEY = 'test-key'

    mockPrepareDailyPicks.mockResolvedValue({
      sent: true,
      data: {
        picks: [{ id: 'j1', title: 'Test Job', company: 'Test Co' }],
        daysUsed: 31,
        daysRemaining: 119,
        capExemptCount: 1,
        bridgeCount: 0,
        scoringStatus: 'complete' as const,
      },
    })
  })

  it('[daily-email] returns 401 without authorization', async () => {
    const { POST } = await import('./route')
    const res = await POST(makeRequest())
    expect(res.status).toBe(401)
    log('auth', 'Rejected: no auth header')
  })

  it('[daily-email] returns 401 with wrong secret', async () => {
    const { POST } = await import('./route')
    const res = await POST(makeRequest('wrong'))
    expect(res.status).toBe(401)
    log('auth', 'Rejected: wrong secret')
  })

  it('[daily-email] returns 500 when CRON_SECRET not configured', async () => {
    delete process.env.CRON_SECRET
    const { POST } = await import('./route')
    const res = await POST(makeRequest('anything'))
    expect(res.status).toBe(500)
    log('auth', 'Rejected: CRON_SECRET missing')
  })

  it('[daily-email] sends email when picks available', async () => {
    const { POST } = await import('./route')
    const res = await POST(makeRequest(CRON_SECRET))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.ok).toBe(true)
    expect(body.summary.sent).toBe(1)
    expect(body.results[0].messageId).toBe('msg-test-123')
    expect(mockSendEmail).toHaveBeenCalledOnce()
    log('happy path', `Sent: ${body.summary.sent}, messageId: ${body.results[0].messageId}`)
  })

  it('[daily-email] skips when break mode active', async () => {
    mockPrepareDailyPicks.mockResolvedValue({ sent: false, reason: 'break_mode' })
    const { POST } = await import('./route')
    const res = await POST(makeRequest(CRON_SECRET))
    const body = await res.json()

    expect(body.ok).toBe(true)
    expect(body.summary.sent).toBe(0)
    expect(body.summary.skipped).toBe(1)
    expect(body.results[0].reason).toBe('break_mode')
    expect(mockSendEmail).not.toHaveBeenCalled()
    log('break mode', `Skipped: ${body.results[0].reason}`)
  })

  it('[daily-email] skips when no picks', async () => {
    mockPrepareDailyPicks.mockResolvedValue({ sent: false, reason: 'no_picks' })
    const { POST } = await import('./route')
    const res = await POST(makeRequest(CRON_SECRET))
    const body = await res.json()

    expect(body.summary.sent).toBe(0)
    expect(body.summary.skipped).toBe(1)
    expect(body.results[0].reason).toBe('no_picks')
    log('no picks', `Skipped: ${body.results[0].reason}`)
  })
})
