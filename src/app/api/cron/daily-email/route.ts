import { timingSafeEqual } from 'crypto'
import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendEmail } from '@/lib/resend'
import { prepareDailyPicks } from '@/lib/daily-picks'
import { DailyPicksEmail } from '@/lib/email-templates/templates/daily-picks'

/**
 * POST /api/cron/daily-email
 *
 * Sends the daily picks email to all users (or a specific user).
 * Secured with CRON_SECRET — triggered by Vercel Cron at 8:00am ET.
 *
 * The 8am arrival is sacrosanct — stale-but-on-time beats fresh-but-late.
 * If scoring hasn't finished, we send yesterday's top picks with a notice.
 *
 * Body (optional JSON):
 *   { userId?: string }
 */
export const GET = handler
export const POST = handler

async function handler(req: NextRequest) {
  // ─── Auth ──────────────────────────────────────────────────────────────
  const secret = req.headers.get('authorization')?.replace('Bearer ', '')

  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 })
  }

  const a = Buffer.from(secret ?? '')
  const b = Buffer.from(process.env.CRON_SECRET)
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ─── Parse optional params ─────────────────────────────────────────────
  const body = await req.json().catch(() => ({}))
  const targetUserId: string | undefined = body.userId

  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]
  const dayOfWeek = today.toLocaleDateString('en-US', {
    weekday: 'long',
    timeZone: 'America/New_York',
  })

  // ─── Get users + emails ────────────────────────────────────────────────
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SECRET_KEY!,
    )

    let userQuery = supabase.from('users').select('id')
    if (targetUserId) {
      userQuery = userQuery.eq('id', targetUserId)
    }

    const { data: users } = await userQuery

    if (!users || users.length === 0) {
      return NextResponse.json({
        ok: true,
        summary: { processed: 0, sent: 0, skipped: 0, failed: 0 },
        results: [],
      })
    }

    // Get emails from auth.users via admin API
    const emailMap = new Map<string, string>()
    let page = 1
    const perPage = 50
    let hasMore = true
    while (hasMore) {
      const { data: authData, error: authError } = await supabase.auth.admin.listUsers({ page, perPage })
      if (authError) {
        return NextResponse.json(
          { error: 'Failed to fetch user emails', message: authError.message },
          { status: 500 },
        )
      }
      const batch = authData?.users ?? []
      for (const u of batch) {
        if (u.email) emailMap.set(u.id, u.email)
      }
      hasMore = batch.length === perPage
      page++
    }

    // ─── Process each user ──────────────────────────────────────────────
    const results: Array<{
      userId: string
      sent: boolean
      reason?: string
      messageId?: string
    }> = []

    for (const user of users) {
      const email = emailMap.get(user.id)
      if (!email) {
        results.push({ userId: user.id, sent: false, reason: 'no_email' })
        continue
      }

      const prepResult = await prepareDailyPicks(user.id)

      if (!prepResult.sent || !prepResult.data) {
        results.push({ userId: user.id, sent: false, reason: prepResult.reason })
        continue
      }

      const { picks, daysUsed, daysRemaining, capExemptCount, bridgeCount, scoringStatus } = prepResult.data

      const subject = `Your ${picks.length} pick${picks.length === 1 ? '' : 's'} for ${dayOfWeek} — Day ${daysUsed} of 150 (${daysRemaining} remaining)`
      const idempotencyKey = `daily-picks/${user.id}/${todayStr}`

      try {
        const { id: messageId } = await sendEmail({
          to: email,
          subject,
          react: DailyPicksEmail({
            daysUsed,
            daysRemaining,
            dayOfWeek,
            picks,
            capExemptCount,
            bridgeCount,
            scoringStatus,
          }),
          idempotencyKey,
        })

        results.push({ userId: user.id, sent: true, messageId })
      } catch (err) {
        results.push({
          userId: user.id,
          sent: false,
          reason: err instanceof Error ? err.message : String(err),
        })
      }
    }

    const SKIP_REASONS = new Set(['break_mode', 'no_picks', 'no_email'])
    const summary = {
      processed: users.length,
      sent: results.filter((r) => r.sent).length,
      skipped: results.filter((r) => !r.sent && SKIP_REASONS.has(r.reason ?? '')).length,
      failed: results.filter((r) => !r.sent && !SKIP_REASONS.has(r.reason ?? '')).length,
    }

    return NextResponse.json({ ok: true, summary, results })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json(
      { error: 'Daily email processing failed', message },
      { status: 500 },
    )
  }
}
