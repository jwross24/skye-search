import { timingSafeEqual } from 'crypto'
import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendPushNotification, type PushSubscription } from '@/lib/web-push'
import { buildMessage, type NudgeContext } from '@/lib/nudge-templates'

/**
 * POST /api/cron/push-nudge
 *
 * Daily push notification — sends a warm nudge with top pick + clock status.
 * Runs at 12:30 UTC (8:30 AM ET) via Vercel Cron.
 *
 * For each user with a push subscription:
 * 1. Query top pick + clock status
 * 2. Build warm message using nudge-templates
 * 3. Send via Web Push (free, no vendor)
 *
 * Skips if: no push subscription, break mode active (<15 days overrides).
 * Removes expired subscriptions (410/404 from push service).
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

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
  )

  // ─── Get users with push subscriptions ─────────────────────────────────
  const { data: users } = await supabase
    .from('users')
    .select('id, push_subscription, break_mode_until')
    .not('push_subscription', 'is', null)

  if (!users || users.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, reason: 'no_subscribed_users' })
  }

  const results = []

  for (const user of users) {
    const subscription = user.push_subscription as PushSubscription
    if (!subscription?.endpoint) continue

    // ─── Clock status ──────────────────────────────────────────────────
    const { data: clockData } = await supabase
      .from('immigration_clock')
      .select('days_remaining')
      .eq('user_id', user.id)
      .maybeSingle()

    const { data: immData } = await supabase
      .from('immigration_status')
      .select('initial_days_used')
      .eq('user_id', user.id)
      .single()

    const daysRemaining = clockData?.days_remaining
      ?? (immData ? 150 - (immData.initial_days_used ?? 0) : 150)

    // ─── Break mode ────────────────────────────────────────────────────
    if (user.break_mode_until) {
      const breakEnd = new Date(user.break_mode_until)
      if (breakEnd > new Date() && daysRemaining > 15) {
        results.push({ userId: user.id, sent: false, reason: 'break_mode' })
        continue
      }
    }

    // ─── Top pick ──────────────────────────────────────────────────────
    const { data: votedRows } = await supabase
      .from('votes').select('job_id').eq('user_id', user.id)
    const { data: appRows } = await supabase
      .from('applications').select('job_id').eq('user_id', user.id)

    const excludeIds = [
      ...(votedRows ?? []).map(v => v.job_id),
      ...(appRows ?? []).map(a => a.job_id).filter(Boolean),
    ]

    let jobQuery = supabase
      .from('jobs')
      .select('title, company, match_score, visa_path, url')
      .eq('user_id', user.id)
      .not('match_score', 'is', null)
      .or('requires_citizenship.is.null,requires_citizenship.neq.true')
      .or('requires_security_clearance.is.null,requires_security_clearance.neq.true')
      .order('match_score', { ascending: false })
      .limit(1)

    if (excludeIds.length > 0) {
      jobQuery = jobQuery.not('id', 'in', `(${excludeIds.join(',')})`)
    }

    const { data: topJobs } = await jobQuery

    const topPick = topJobs?.[0] ? {
      title: topJobs[0].title,
      company: topJobs[0].company,
      matchScore: topJobs[0].match_score,
      visaPath: topJobs[0].visa_path,
      url: topJobs[0].url ?? undefined,
    } : null

    // ─── Build and send ────────────────────────────────────────────────
    const ctx: NudgeContext = { daysRemaining, topPick }
    const body = buildMessage(ctx)
    const title = topPick
      ? `${topPick.title} at ${topPick.company}`
      : 'Your daily check-in'

    const result = await sendPushNotification(subscription, {
      title,
      body,
      url: topPick?.url ?? '/immigration',
    })

    // Remove expired subscriptions
    if (result.error === 'subscription_expired') {
      await supabase
        .from('users')
        .update({ push_subscription: null })
        .eq('id', user.id)
    }

    results.push({
      sent: result.success,
      reason: result.error,
    })
  }

  const sent = results.filter(r => r.sent).length
  return NextResponse.json({ ok: true, sent, total: results.length })
}
