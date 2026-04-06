import { describe, it, expect, vi, beforeEach } from 'vitest'

function log(step: string, detail: string) {
  process.stdout.write(`  [healthcheck-cron] ${step}: ${detail}\n`)
}

// ─── Mock fetch (for internal health call) ──────────────────────────────────

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

// ─── Mock sendEmail ─────────────────────────────────────────────────────────

const mockSendEmail = vi.fn().mockResolvedValue({ messageId: 'msg-test' })

vi.mock('@/lib/resend', () => ({
  sendEmail: (...args: unknown[]) => mockSendEmail(...args),
}))

// ─── Mock CronFailureAlert ─────────────────────────────────────────────────

vi.mock('@/lib/email-templates/templates/cron-failure', () => ({
  CronFailureAlert: vi.fn(() => '<div>alert</div>'),
}))

// ─── Mock Supabase (used by reaper) ────────────────────────────────────────

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: () => ({
      update: () => ({
        eq: () => ({
          lt: () => ({
            select: () => Promise.resolve({ data: [], error: null }),
          }),
        }),
      }),
    }),
  })),
}))

// ─── Env ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
  process.env.CRON_SECRET = 'test-secret'
  process.env.NEXT_PUBLIC_SITE_URL = 'http://localhost:3000'
  process.env.DEVELOPER_ALERT_EMAIL = 'dev@test.com'
})

function makeRequest(secret?: string) {
  return new Request('http://localhost:3000/api/cron/healthcheck', {
    headers: secret ? { authorization: `Bearer ${secret}` } : {},
  }) as unknown as import('next/server').NextRequest
}

describe('GET /api/cron/healthcheck', () => {
  it('rejects requests without auth', async () => {
    log('auth', 'No authorization header')
    const { GET } = await import('./route')
    const res = await GET(makeRequest())
    expect(res.status).toBe(401)
  })

  it('rejects wrong secret', async () => {
    log('auth', 'Wrong secret')
    const { GET } = await import('./route')
    const res = await GET(makeRequest('wrong'))
    expect(res.status).toBe(401)
  })

  it('returns ok when health is ready', async () => {
    log('happy', 'Health endpoint returns ready')
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ status: 'ready', checks: {} }),
    })

    const { GET } = await import('./route')
    const res = await GET(makeRequest('test-secret'))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.status).toBe('ok')
    expect(body.health).toBe('ready')
    expect(mockSendEmail).not.toHaveBeenCalled()
    log('result', 'No alert sent')
  })

  it('sends email alert when health is degraded', async () => {
    log('degraded', 'Health endpoint returns degraded')
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 503,
      json: async () => ({
        status: 'degraded',
        checks: {
          db: { healthy: false, detail: 'connection failed' },
          unemployment_cron: { healthy: true },
        },
      }),
    })

    const { GET } = await import('./route')
    const res = await GET(makeRequest('test-secret'))
    const body = await res.json()

    expect(body.status).toBe('alerted')
    expect(body.health).toBe('degraded')
    expect(body.failedChecks).toContain('db: connection failed')
    expect(mockSendEmail).toHaveBeenCalledOnce()

    const emailArgs = mockSendEmail.mock.calls[0][0]
    expect(emailArgs.to).toBe('dev@test.com')
    expect(emailArgs.subject).toContain('health check failed')
    log('result', 'Alert email sent with failure details')
  })

  it('sends alert when health endpoint is unreachable', async () => {
    log('unreachable', 'Health endpoint throws')
    mockFetch.mockRejectedValueOnce(new Error('ECONNREFUSED'))

    const { GET } = await import('./route')
    const res = await GET(makeRequest('test-secret'))
    const body = await res.json()

    expect(body.status).toBe('alerted')
    expect(body.health).toBe('unreachable')
    expect(mockSendEmail).toHaveBeenCalledOnce()
    log('result', 'Alert sent for unreachable endpoint')
  })

  it('does not crash if email sending fails', async () => {
    log('email-fail', 'Resend throws')
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 503,
      json: async () => ({ status: 'degraded', checks: { db: { healthy: false } } }),
    })
    mockSendEmail.mockRejectedValueOnce(new Error('Resend down'))

    const { GET } = await import('./route')
    const res = await GET(makeRequest('test-secret'))

    expect(res.status).toBe(200)
    log('result', 'Gracefully handled email failure')
  })

  it('returns 500 when CRON_SECRET not configured', async () => {
    log('config', 'No CRON_SECRET')
    delete process.env.CRON_SECRET

    const { GET } = await import('./route')
    const res = await GET(makeRequest('anything'))
    expect(res.status).toBe(500)
  })
})
