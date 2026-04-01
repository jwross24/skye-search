import { timingSafeEqual } from 'crypto'
import { NextResponse, type NextRequest } from 'next/server'
import { sendEmail } from '@/lib/resend'
import { CronFailureAlert } from '@/lib/email-templates/templates/cron-failure'

/**
 * GET /api/cron/healthcheck
 *
 * Daily self-monitoring cron (6:00 UTC) — calls /api/health?ready=true internally.
 * If any check is degraded, sends an email alert via Resend.
 *
 * Alert rate: once per day per outage (the cron fires once daily). A sustained
 * outage produces one alert per day, which is intentional for a solo app.
 */
export const GET = handler
export const POST = handler

async function handler(req: NextRequest) {
  // ─── Auth ──────────────────────────────────────────────────────────────
  const secret = req.headers.get('authorization')?.replace('Bearer ', '')

  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 })
  }

  const expected = Buffer.from(process.env.CRON_SECRET)
  const received = Buffer.from(secret ?? '')
  if (
    !secret ||
    expected.length !== received.length ||
    !timingSafeEqual(received, expected)
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ─── Health check ─────────────────────────────────────────────────────
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL
      || process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`
      || 'http://localhost:3000'

    const res = await fetch(`${baseUrl}/api/health?ready=true`, {
      headers: { 'Cache-Control': 'no-cache' },
      signal: AbortSignal.timeout(10_000),
    })

    const body = await res.json()

    if (body.status === 'ready') {
      return NextResponse.json({ status: 'ok', health: 'ready' })
    }

    // ─── Degraded — build alert details ───────────────────────────────
    const failedChecks = Object.entries(body.checks ?? {})
      .filter(([, v]) => !(v as { healthy: boolean }).healthy)
      .map(([k, v]) => `${k}: ${(v as { detail?: string }).detail ?? 'unhealthy'}`)

    const errorMessage = failedChecks.length > 0
      ? failedChecks.join('\n')
      : `Health status: ${body.status} (HTTP ${res.status})`

    const sent = await sendAlert(errorMessage)

    return NextResponse.json({
      status: sent ? 'alerted' : 'degraded_no_recipient',
      health: body.status,
      failedChecks,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    const sent = await sendAlert(`Health endpoint unreachable: ${message}`)

    return NextResponse.json({
      status: sent ? 'alerted' : 'degraded_no_recipient',
      health: 'unreachable',
      error: message,
    })
  }
}

async function sendAlert(errorMessage: string): Promise<boolean> {
  const recipientEmail = process.env.DEVELOPER_ALERT_EMAIL ?? process.env.RESEND_FROM_EMAIL
  if (!recipientEmail) return false

  await sendEmail({
    to: recipientEmail,
    subject: '⚠️ SkyeSearch health check failed',
    react: CronFailureAlert({
      executionDate: new Date().toISOString().split('T')[0],
      errorMessage,
      triggerSource: 'healthcheck-cron',
    }),
  }).catch(() => {
    // If email fails too, there's nothing we can do from inside the app.
    // The Vercel function logs will capture this.
  })
  return true
}
