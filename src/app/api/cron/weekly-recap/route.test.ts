import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ─── Mock setup (before route imports) ──────────────────────────────────────

const mockSelect = vi.fn()
const mockInsert = vi.fn()
const mockUpsert = vi.fn()

const mockFrom = vi.fn().mockImplementation((table: string) => {
  if (table === 'users') {
    return {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({
            data: [{ id: 'user-123', email: 'skye@example.com' }],
          }),
        }),
      }),
    }
  }
  if (table === 'weekly_activity_log') {
    return {
      select: mockSelect.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null }),
          }),
        }),
      }),
      upsert: mockUpsert.mockResolvedValue({ error: null }),
    }
  }
  if (table === 'api_usage_log') {
    return { insert: mockInsert.mockResolvedValue({ error: null }) }
  }

  // Default: votes, applications, daily_checkpoint, immigration_clock, immigration_status
  // The lte/gt chain handles high-match rejections: .eq.eq.gte.lte.gt
  const lteMock = vi.fn().mockReturnValue({
    gt: vi.fn().mockResolvedValue({ count: 0 }),
    then: (resolve: (v: unknown) => void) => resolve({ count: 0 }),
  })
  const gteMock = vi.fn().mockReturnValue({ lte: lteMock })
  return {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        gte: gteMock,
        eq: vi.fn().mockReturnValue({
          gte: gteMock,
          maybeSingle: vi.fn().mockResolvedValue({ data: null }),
        }),
        in: vi.fn().mockResolvedValue({ count: 0 }),
        maybeSingle: vi.fn().mockResolvedValue({ data: null }),
      }),
    }),
  }
})

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn().mockReturnValue({ from: mockFrom }),
}))

vi.mock('@/lib/resend', () => ({
  sendEmail: vi.fn().mockResolvedValue({ id: 'email-abc' }),
}))

// Mock the email template
vi.mock('@/lib/email-templates/templates/weekly-recap', () => ({
  WeeklyRecapEmail: vi.fn().mockReturnValue(null),
}))

// ─── Import route after mocks ──────────────────────────────────────────────

const { POST } = await import('./route')

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeRequest(secret?: string): NextRequest {
  const headers = new Headers()
  if (secret) headers.set('Authorization', `Bearer ${secret}`)
  return new NextRequest('http://localhost:3000/api/cron/weekly-recap', {
    method: 'POST',
    headers,
  })
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('POST /api/cron/weekly-recap', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.CRON_SECRET = 'test-secret'
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321'
    process.env.SUPABASE_SECRET_KEY = 'test-key'
  })

  it('returns 401 without CRON_SECRET', async () => {
    const response = await POST(makeRequest())
    expect(response.status).toBe(401)

    const body = await response.json()
    expect(body.error).toBe('Unauthorized')
  })

  it('returns 401 with wrong CRON_SECRET', async () => {
    const response = await POST(makeRequest('wrong-secret'))
    expect(response.status).toBe(401)
  })

  it('returns ok with valid secret', async () => {
    const response = await POST(makeRequest('test-secret'))
    expect(response.status).toBe(200)

    const body = await response.json()
    expect(body.ok).toBe(true)
    expect(body.weekStart).toBeDefined()
    expect(body.weekEnd).toBeDefined()
  })

  it('returns 500 when CRON_SECRET env is missing', async () => {
    delete process.env.CRON_SECRET
    const response = await POST(makeRequest('any'))
    expect(response.status).toBe(500)

    const body = await response.json()
    expect(body.error).toBe('CRON_SECRET not configured')
  })

  it('reports no users gracefully', async () => {
    mockFrom.mockImplementationOnce((table: string) => {
      if (table === 'users') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({ data: [] }),
            }),
          }),
        }
      }
      return { select: vi.fn().mockReturnValue({ eq: vi.fn() }) }
    })

    // Re-import to get fresh module
    const { POST: freshPost } = await import('./route')
    const response = await freshPost(makeRequest('test-secret'))
    const body = await response.json()
    expect(body.ok).toBe(true)
    expect(body.reason).toBe('no users')
  })
})
