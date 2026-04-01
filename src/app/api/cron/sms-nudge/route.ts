import { timingSafeEqual } from 'crypto'
import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendSms } from '@/lib/twilio'
import { buildMessage, type NudgeContext } from '@/lib/sms-templates'

/**
 * POST /api/cron/sms-nudge
 *
 * Daily SMS nudge — sends Skye a warm text with her top pick + clock status.
 * Runs at 12:30 UTC (8:30 AM ET) via Vercel Cron.
 *
 * Skips if: no phone number configured, break mode active (<15 days overrides).
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

  // ─── Check phone number ────────────────────────────────────────────────
  const phoneNumber = process.env.SKYE_PHONE_NUMBER
  if (!phoneNumber) {
    return NextResponse.json({ ok: true, sent: false, reason: 'no_phone_number' })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
  )

  // ─── Get the primary user ─────────────────────────────────────────────
  const { data: users } = await supabase
    .from('users')
    .select('id, break_mode_until')
    .eq('is_admin', false)
    .limit(1)

  const user = users?.[0]
  if (!user) {
    return NextResponse.json({ ok: true, sent: false, reason: 'no_user' })
  }

  // ─── Break mode check ────────────────────────────────────────────────
  // Skip if on break, UNLESS <15 days remaining (urgent override)
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

  if (user.break_mode_until) {
    const breakEnd = new Date(user.break_mode_until)
    if (breakEnd > new Date() && daysRemaining > 15) {
      return NextResponse.json({ ok: true, sent: false, reason: 'break_mode' })
    }
  }

  // ─── Get top pick ─────────────────────────────────────────────────────
  const { data: votedRows } = await supabase
    .from('votes')
    .select('job_id')
    .eq('user_id', user.id)

  const { data: appRows } = await supabase
    .from('applications')
    .select('job_id')
    .eq('user_id', user.id)

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

  // Exclude already-voted/applied jobs
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

  // ─── Build and send ───────────────────────────────────────────────────
  const ctx: NudgeContext = {
    daysRemaining,
    topPick,
  }

  const body = buildMessage(ctx)

  try {
    const { sid, status } = await sendSms({ to: phoneNumber, body })

    return NextResponse.json({
      ok: true,
      sent: true,
      messageSid: sid,
      messageStatus: status,
      daysRemaining,
      hasTopPick: !!topPick,
    })
  } catch (err) {
    return NextResponse.json({
      ok: false,
      sent: false,
      reason: 'twilio_error',
      error: err instanceof Error ? err.message : String(err),
    }, { status: 500 })
  }
}
