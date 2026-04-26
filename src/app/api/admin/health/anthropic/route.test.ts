import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─── Mocks ────────────────────────────────────────────────────────────────────

// Admin auth — default authorized; individual tests can override.
const mockAuth = vi.fn().mockResolvedValue({
  supabase: {} as never,
  userId: 'user-123',
})
vi.mock('../../auth', () => ({
  authenticateAdmin: (req: Request) => mockAuth(req),
}))

// Anthropic SDK — countTokens is rebound per test. The mock CLASS EXTENDS the
// real Anthropic so static error classes (AuthenticationError, RateLimitError,
// APIConnectionError) survive on the prototype chain. These statics actually
// live on the parent `BaseAnthropic`, so plain Object.assign would drop them.
const mockCountTokens = vi.fn()
vi.mock('@anthropic-ai/sdk', async () => {
  const actual = await vi.importActual<typeof import('@anthropic-ai/sdk')>('@anthropic-ai/sdk')
  class FakeAnthropic extends actual.default {
    constructor() {
      // dangerouslyAllowBrowser is required because vitest runs in jsdom by
      // default for some specs — the SDK refuses to construct otherwise.
      // No real network calls happen because we override `messages` below.
      super({ apiKey: 'test-key-xyz', dangerouslyAllowBrowser: true })
      this.messages = { countTokens: mockCountTokens } as unknown as typeof this.messages
    }
  }
  return { default: FakeAnthropic }
})

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function makeAuthError() {
  const Anthropic = (await import('@anthropic-ai/sdk')).default
  return new Anthropic.AuthenticationError(
    401,
    { type: 'error', error: { type: 'authentication_error', message: 'invalid x-api-key' } },
    'invalid x-api-key',
    new Headers(),
  )
}

async function makeRateLimitError() {
  const Anthropic = (await import('@anthropic-ai/sdk')).default
  return new Anthropic.RateLimitError(
    429,
    { type: 'error', error: { type: 'rate_limit_error', message: 'rate limit exceeded' } },
    'rate limit exceeded',
    new Headers(),
  )
}

async function makeConnectionError() {
  const Anthropic = (await import('@anthropic-ai/sdk')).default
  return new Anthropic.APIConnectionError({ message: 'ECONNREFUSED' })
}

const { GET } = await import('./route')

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('GET /api/admin/health/anthropic', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth.mockResolvedValue({ supabase: {} as never, userId: 'user-123' })
    mockCountTokens.mockReset()
    process.env.ANTHROPIC_API_KEY = 'test-key-xyz'
  })

  it('returns 401 when not admin', async () => {
    mockAuth.mockResolvedValueOnce(null)

    const res = await GET(new Request('http://localhost/api/admin/health/anthropic'))

    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBe('Unauthorized')
  })

  it('returns ok=true with latency on successful countTokens', async () => {
    mockCountTokens.mockResolvedValueOnce({ input_tokens: 5 })

    const res = await GET(new Request('http://localhost/api/admin/health/anthropic'))

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(typeof body.latency_ms).toBe('number')
    expect(body.latency_ms).toBeGreaterThanOrEqual(0)
    expect(typeof body.checked_at).toBe('string')
  })

  it('returns ok=false error=invalid_key on AuthenticationError', async () => {
    mockCountTokens.mockRejectedValueOnce(await makeAuthError())

    const res = await GET(new Request('http://localhost/api/admin/health/anthropic'))

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(false)
    expect(body.error).toBe('invalid_key')
    expect(typeof body.latency_ms).toBe('number')
    expect(typeof body.checked_at).toBe('string')
  })

  it('returns ok=false error=rate_limited on RateLimitError', async () => {
    mockCountTokens.mockRejectedValueOnce(await makeRateLimitError())

    const res = await GET(new Request('http://localhost/api/admin/health/anthropic'))

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(false)
    expect(body.error).toBe('rate_limited')
  })

  it('returns ok=false error=network on APIConnectionError', async () => {
    mockCountTokens.mockRejectedValueOnce(await makeConnectionError())

    const res = await GET(new Request('http://localhost/api/admin/health/anthropic'))

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(false)
    expect(body.error).toBe('network')
  })

  it('returns ok=false error=unknown on unexpected errors', async () => {
    mockCountTokens.mockRejectedValueOnce(new Error('something weird'))

    const res = await GET(new Request('http://localhost/api/admin/health/anthropic'))

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(false)
    expect(body.error).toBe('unknown')
  })

  it('returns invalid_key without calling SDK when ANTHROPIC_API_KEY is missing', async () => {
    delete process.env.ANTHROPIC_API_KEY

    const res = await GET(new Request('http://localhost/api/admin/health/anthropic'))

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(false)
    expect(body.error).toBe('invalid_key')
    expect(body.latency_ms).toBe(0)
    expect(mockCountTokens).not.toHaveBeenCalled()
  })
})
