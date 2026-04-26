import { NextResponse } from 'next/server'
import { authenticateAdmin } from '../../auth'

/**
 * GET /api/admin/health/anthropic
 *
 * Probes the Anthropic API with a tiny `messages.countTokens` call to verify
 * that the configured API key is valid and the service is reachable.
 *
 * Created in response to a 32-day silent failure window where ANTHROPIC_API_KEY
 * was set to the literal placeholder string `your_anthropic_api_key_here`.
 * The existing presence check (`if (!process.env.ANTHROPIC_API_KEY)`) passed,
 * so URL analysis and weekly-recap commentary failed silently for a month.
 *
 * Response shape:
 *   { ok: true, latency_ms: number, checked_at: string }
 *   { ok: false, error: 'invalid_key' | 'rate_limited' | 'network' | 'unknown',
 *     latency_ms: number, checked_at: string }
 */
export async function GET(req: Request) {
  const auth = await authenticateAdmin(req)
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const checked_at = new Date().toISOString()

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ ok: false, error: 'invalid_key', latency_ms: 0, checked_at })
  }

  const Anthropic = (await import('@anthropic-ai/sdk')).default
  const client = new Anthropic()

  const started = Date.now()
  try {
    await client.messages.countTokens({
      model: 'claude-haiku-4-5-20251001',
      messages: [{ role: 'user', content: 'ping' }],
    })
    return NextResponse.json({ ok: true, latency_ms: Date.now() - started, checked_at })
  } catch (err) {
    const latency_ms = Date.now() - started
    if (err instanceof Anthropic.AuthenticationError) {
      return NextResponse.json({ ok: false, error: 'invalid_key', latency_ms, checked_at })
    }
    if (err instanceof Anthropic.RateLimitError) {
      return NextResponse.json({ ok: false, error: 'rate_limited', latency_ms, checked_at })
    }
    if (err instanceof Anthropic.APIConnectionError) {
      return NextResponse.json({ ok: false, error: 'network', latency_ms, checked_at })
    }
    return NextResponse.json({ ok: false, error: 'unknown', latency_ms, checked_at })
  }
}
