import { NextResponse } from 'next/server'
import { createClient } from '@/db/supabase-server'
import { sendPushNotification, type PushSubscription } from '@/lib/web-push'
import { buildMessage, type NudgeContext } from '@/lib/nudge-templates'

/**
 * POST /api/push/test-nudge
 *
 * Sends a test push notification to the currently authenticated user.
 * Session-authenticated (cookie) — safe to call from the browser.
 *
 * Used by the "Send a test notification" button in Settings.
 * Distinct from /api/cron/push-nudge which is CRON_SECRET gated and fan-outs to all users.
 */
export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  // Fetch the user's stored push subscription
  const { data: userData } = await supabase
    .from('users')
    .select('push_subscription, break_mode_until')
    .eq('id', user.id)
    .single()

  const subscription = userData?.push_subscription as PushSubscription | null
  if (!subscription?.endpoint) {
    return NextResponse.json({ error: 'No push subscription found' }, { status: 400 })
  }

  // Fetch clock status for a realistic test message
  const { data: clockData } = await supabase
    .from('immigration_clock')
    .select('days_remaining')
    .eq('user_id', user.id)
    .maybeSingle()

  const { data: immData } = await supabase
    .from('immigration_status')
    .select('initial_days_used')
    .eq('user_id', user.id)
    .maybeSingle()

  const daysRemaining = clockData?.days_remaining
    ?? (immData ? 150 - (immData.initial_days_used ?? 0) : 150)

  // Fetch top pick for a realistic test message
  const { data: topJobs } = await supabase
    .from('jobs')
    .select('title, company, match_score, visa_path, url')
    .eq('user_id', user.id)
    .not('match_score', 'is', null)
    .or('requires_citizenship.is.null,requires_citizenship.neq.true')
    .or('requires_security_clearance.is.null,requires_security_clearance.neq.true')
    .order('match_score', { ascending: false })
    .limit(1)

  const topPick = topJobs?.[0] ? {
    title: topJobs[0].title,
    company: topJobs[0].company,
    matchScore: topJobs[0].match_score,
    visaPath: topJobs[0].visa_path,
    url: topJobs[0].url ?? undefined,
  } : null

  const ctx: NudgeContext = { daysRemaining, topPick }
  const body = buildMessage(ctx)
  const title = topPick
    ? `${topPick.title} at ${topPick.company}`
    : 'Your daily check-in (test)'

  const result = await sendPushNotification(subscription, {
    title,
    body,
    url: topPick?.url ?? '/immigration',
  })

  if (result.error === 'subscription_expired') {
    // Clean up the stale subscription
    await supabase
      .from('users')
      .update({ push_subscription: null })
      .eq('id', user.id)
    return NextResponse.json(
      { error: 'Your notification subscription has expired. Please re-enable notifications.' },
      { status: 410 },
    )
  }

  if (!result.success) {
    return NextResponse.json(
      { error: result.error ?? 'Failed to send notification' },
      { status: 500 },
    )
  }

  return NextResponse.json({ ok: true })
}
