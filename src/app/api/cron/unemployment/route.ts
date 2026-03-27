import { timingSafeEqual } from 'crypto'
import { type NextRequest, NextResponse } from 'next/server'
import { createCheckpointDbSupabase } from '@/db/checkpoint-db-supabase'
import { runDailyCheckpoint, type TriggerSource } from '@/db/unemployment-cron'

/**
 * POST /api/cron/unemployment
 *
 * Triggers the daily unemployment checkpoint for all users (or a specific user).
 * Secured with CRON_SECRET — used by Vercel Cron, GitHub Actions, or manual trigger.
 *
 * Body (optional JSON):
 *   { userId?: string, targetDate?: "YYYY-MM-DD", triggerSource?: TriggerSource }
 */
export async function POST(req: NextRequest) {
  // ─── Auth ──────────────────────────────────────────────────────────────
  const secret = req.headers.get('authorization')?.replace('Bearer ', '')

  if (!process.env.CRON_SECRET) {
    return NextResponse.json(
      { error: 'CRON_SECRET not configured' },
      { status: 500 },
    )
  }

  const a = Buffer.from(secret ?? '')
  const b = Buffer.from(process.env.CRON_SECRET)
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 },
    )
  }

  // ─── Parse optional params ─────────────────────────────────────────────
  let userId: string | undefined
  let targetDate: string | undefined
  let triggerSource: TriggerSource = 'keepalive_gha'

  try {
    const body = await req.json().catch(() => ({}))
    userId = body.userId
    targetDate = body.targetDate
    if (body.triggerSource) triggerSource = body.triggerSource
  } catch {
    // Empty body is fine — all params are optional
  }

  // ─── Run checkpoint ────────────────────────────────────────────────────
  try {
    const db = createCheckpointDbSupabase()
    const results = await runDailyCheckpoint(db, {
      userId,
      targetDate,
      triggerSource,
    })

    const summary = {
      processed: results.length,
      created: results.filter((r) => r.action === 'checkpoint_created').length,
      skipped: results.filter((r) => r.action === 'skip_idempotent').length,
      errors: results.filter((r) => r.action === 'error').length,
      alerts: results.filter((r) => r.alert).map((r) => ({
        userId: r.userId,
        alert: r.alert,
      })),
    }

    return NextResponse.json({ ok: true, summary, results })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json(
      { error: 'Checkpoint execution failed', message },
      { status: 500 },
    )
  }
}
