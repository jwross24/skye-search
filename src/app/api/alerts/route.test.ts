import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/email-alerts', () => ({
  checkAndSendAlerts: vi.fn().mockResolvedValue([]),
}))

vi.mock('@supabase/supabase-js', () => {
  // Chainable query builder that resolves to a fixed value at any point
  function queryBuilder(value: unknown) {
    return new Proxy({} as Record<string, unknown>, {
      get(_, prop) {
        if (prop === 'then') {
          return (resolve: (v: unknown) => void) => Promise.resolve(value).then(resolve)
        }
        return () => queryBuilder(value)
      },
    })
  }

  return {
    createClient: vi.fn(() => ({
      from: () => queryBuilder({ data: [{ id: 'user-1' }] }),
      auth: {
        admin: {
          listUsers: vi.fn().mockResolvedValue({
            data: { users: [{ id: 'user-1', email: 'test@example.com' }] },
          }),
        },
      },
    })),
  }
})

import { POST } from './route'
import { checkAndSendAlerts } from '@/lib/email-alerts'

const CRON_SECRET = 'test-alert-secret-456'

function makeRequest(options: {
  secret?: string
  body?: Record<string, unknown>
} = {}) {
  const headers = new Headers()
  if (options.secret) headers.set('authorization', `Bearer ${options.secret}`)

  return new NextRequest('http://localhost:3000/api/alerts', {
    method: 'POST',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  })
}

describe('POST /api/alerts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.CRON_SECRET = CRON_SECRET
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321'
    process.env.SUPABASE_SECRET_KEY = 'test-key'
  })

  it('returns 401 without authorization', async () => {
    const res = await POST(makeRequest())
    expect(res.status).toBe(401)
  })

  it('returns 401 with wrong secret', async () => {
    const res = await POST(makeRequest({ secret: 'wrong' }))
    expect(res.status).toBe(401)
  })

  it('returns 500 if CRON_SECRET is not configured', async () => {
    delete process.env.CRON_SECRET
    const res = await POST(makeRequest({ secret: 'anything' }))
    expect(res.status).toBe(500)
  })

  it('returns 200 and processes alerts with valid secret', async () => {
    vi.mocked(checkAndSendAlerts).mockResolvedValue([
      { userId: 'user-1', alertType: 'unemployment_digest', sent: true, messageId: 'msg-1' },
    ])

    const res = await POST(makeRequest({ secret: CRON_SECRET }))
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.summary.sent).toBe(1)
  })

  it('reports suppressed alerts in summary', async () => {
    vi.mocked(checkAndSendAlerts).mockResolvedValue([
      { userId: 'user-1', alertType: 'unemployment_digest', sent: false, reason: 'break_mode' },
    ])

    const res = await POST(makeRequest({ secret: CRON_SECRET }))
    const body = await res.json()

    expect(body.summary.suppressed).toBe(1)
    expect(body.summary.sent).toBe(0)
  })

  it('calls checkAndSendAlerts with user email from auth', async () => {
    vi.mocked(checkAndSendAlerts).mockResolvedValue([])

    await POST(makeRequest({ secret: CRON_SECRET }))

    expect(checkAndSendAlerts).toHaveBeenCalledWith(
      'user-1',
      'test@example.com',
      expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
    )
  })
})
