import { timingSafeEqual } from 'crypto'
import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendEmail } from '@/lib/resend'
import { CronFailureAlert } from '@/lib/email-templates/templates/cron-failure'
import { runHealthChecks } from '@/lib/health'

/**
 * GET /api/cron/healthcheck
 *
 * Daily self-monitoring cron (6:00 UTC) — runs the health checks IN-PROCESS
 * via `runHealthChecks` from `@/lib/health`. If any check is degraded, sends
 * an email alert via Resend.
 *
 * Why in-process and not an outbound fetch to /api/health?
 * Vercel sets VERCEL_URL to the deployment-specific URL, which sits behind
 * Deployment Protection and returns an HTML challenge page. A `res.json()`
 * on that HTML throws "Unexpected token '<'". Calling the lib function
 * directly removes the network hop and the env-var dependency.
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

  // ─── Reaper: clear zombie tasks stuck in 'processing' >30 min ────────
  // Edge Functions can crash/timeout without updating task status.
  // This watchdog auto-clears them so the queue stays healthy.
  let reaped = 0
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SECRET_KEY!,
    )
    const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString()
    const { data: zombies } = await supabase
      .from('task_queue')
      .update({
        status: 'failed_validation' as const,
        error_log: 'Reaped by healthcheck: stuck in processing >30min',
        dead_lettered_at: new Date().toISOString(),
      })
      .eq('status', 'processing')
      .lt('updated_at', thirtyMinAgo)
      .select('id')

    reaped = zombies?.length ?? 0
  } catch {
    // Reaper failure is non-fatal — health check proceeds
  }

  // ─── Health check (in-process) ────────────────────────────────────────
  try {
    const report = await runHealthChecks({ ready: true })

    if (report.status === 'ready') {
      return NextResponse.json({ status: 'ok', health: 'ready', reaped })
    }

    // ─── Degraded — build alert details ───────────────────────────────
    const failedChecks = Object.entries(report.checks ?? {})
      .filter(([, v]) => !v.healthy)
      .map(([k, v]) => `${k}: ${v.detail ?? 'unhealthy'}`)

    const errorMessage = failedChecks.length > 0
      ? failedChecks.join('\n')
      : `Health status: ${report.status}`

    const sent = await sendAlert(errorMessage)

    return NextResponse.json({
      status: sent ? 'alerted' : 'degraded_no_recipient',
      health: report.status,
      failedChecks,
      reaped,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    const sent = await sendAlert(`Health check threw: ${message}`)

    return NextResponse.json({
      status: sent ? 'alerted' : 'degraded_no_recipient',
      health: 'unreachable',
      error: message,
      reaped,
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
