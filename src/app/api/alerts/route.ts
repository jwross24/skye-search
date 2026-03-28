import { timingSafeEqual } from 'crypto'
import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { checkAndSendAlerts } from '@/lib/email-alerts'

/**
 * POST /api/alerts
 *
 * Checks alert conditions and sends emails for all users (or a specific user).
 * Secured with CRON_SECRET — triggered by Vercel Cron, GitHub Actions, or manual.
 *
 * Body (optional JSON):
 *   { userId?: string }
 */
// Vercel Cron sends GET; manual triggers use POST. Handle both.
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
  let targetUserId: string | undefined
  try {
    const body = await req.json().catch(() => ({}))
    targetUserId = body.userId
  } catch {
    // Empty body is fine
  }

  const today = new Date().toISOString().split('T')[0]

  // ─── Get users + emails ────────────────────────────────────────────────
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SECRET_KEY!,
    )

    let userQuery = supabase
      .from('users')
      .select('id')

    if (targetUserId) {
      userQuery = userQuery.eq('id', targetUserId)
    }

    const { data: users } = await userQuery

    if (!users || users.length === 0) {
      return NextResponse.json({ ok: true, summary: { processed: 0, sent: 0, suppressed: 0, failed: 0 }, results: [] })
    }

    // Get emails from auth.users via admin API (paginated to handle >50 users)
    const emailMap = new Map<string, string>()
    let page = 1
    const perPage = 50
    let hasMore = true
    while (hasMore) {
      const { data: authData, error: authError } = await supabase.auth.admin.listUsers({ page, perPage })
      if (authError) {
        return NextResponse.json({ error: 'Failed to fetch user emails', message: authError.message }, { status: 500 })
      }
      const batch = authData?.users ?? []
      for (const u of batch) {
        if (u.email) emailMap.set(u.id, u.email)
      }
      hasMore = batch.length === perPage
      page++
    }

    const allResults = []
    for (const user of users) {
      const email = emailMap.get(user.id)
      if (!email) continue
      const results = await checkAndSendAlerts(user.id, email, today)
      allResults.push(...results)
    }

    const summary = {
      processed: users.length,
      sent: allResults.filter((r) => r.sent).length,
      suppressed: allResults.filter((r) => !r.sent && r.reason === 'break_mode').length,
      failed: allResults.filter((r) => !r.sent && r.reason !== 'break_mode').length,
    }

    return NextResponse.json({ ok: true, summary, results: allResults })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: 'Alert processing failed', message }, { status: 500 })
  }
}
