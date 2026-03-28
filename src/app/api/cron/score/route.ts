import { timingSafeEqual } from 'crypto'
import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * POST /api/cron/score
 *
 * Queries unscored discovered_jobs and enqueues a single ai_score_batch task.
 * The queue-worker Edge Function picks it up and scores via Claude Haiku.
 *
 * Secured with CRON_SECRET — triggered daily at 4:15am via Vercel Cron.
 * Idempotent: skips if a pending ai_score_batch task already exists from last 24h.
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

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SECRET_KEY!,
    )

    // Single-user app: get the user
    const { data: users } = await supabase.from('users').select('id').limit(1)
    if (!users || users.length === 0) {
      return NextResponse.json({ ok: true, tasks_created: 0, reason: 'no users' })
    }
    const userId = users[0].id

    // Budget check — skip if daily cap reached
    const { checkBudget } = await import('@/lib/budget-guard')
    const budgetVerdict = await checkBudget({ userId, taskType: 'ai_score_batch' })
    if (budgetVerdict.action === 'pause') {
      return NextResponse.json({
        ok: true,
        tasks_created: 0,
        reason: `Budget paused: ${budgetVerdict.reason}`,
      })
    }

    // Idempotency: skip if pending ai_score_batch task exists from last 24h
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { count: pendingCount } = await supabase
      .from('task_queue')
      .select('*', { count: 'exact', head: true })
      .eq('task_type', 'ai_score_batch')
      .in('status', ['pending', 'processing'])
      .gte('created_at', twentyFourHoursAgo)

    if (pendingCount && pendingCount > 0) {
      return NextResponse.json({
        ok: true,
        tasks_created: 0,
        reason: `${pendingCount} ai_score_batch task(s) still pending from last 24h`,
      })
    }

    // Query unscored discovered_jobs with priority ordering
    const { data: unscoredJobs, error: queryError } = await supabase
      .from('discovered_jobs')
      .select('id')
      .eq('user_id', userId)
      .eq('scored', false)
      .not('raw_description', 'is', null)
      .order('structured_deadline', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true })
      .limit(50)

    if (queryError) {
      return NextResponse.json(
        { error: 'Failed to query unscored jobs', message: queryError.message },
        { status: 500 },
      )
    }

    if (!unscoredJobs || unscoredJobs.length === 0) {
      return NextResponse.json({ ok: true, tasks_created: 0, reason: 'no unscored jobs' })
    }

    // Backlog check: warn if >200 unscored (don't fire extra batches)
    const { count: totalUnscored } = await supabase
      .from('discovered_jobs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('scored', false)
      .not('raw_description', 'is', null)

    const jobIds = unscoredJobs.map(j => j.id)

    // Enqueue single ai_score_batch task
    const { error: insertError } = await supabase.from('task_queue').insert({
      user_id: userId,
      task_type: 'ai_score_batch',
      payload_json: { job_ids: jobIds },
      max_retries: 2,
    })

    if (insertError) {
      return NextResponse.json(
        { error: 'Failed to enqueue scoring task', message: insertError.message },
        { status: 500 },
      )
    }

    return NextResponse.json({
      ok: true,
      tasks_created: 1,
      jobs_to_score: jobIds.length,
      total_unscored: totalUnscored ?? jobIds.length,
      backlog_warning: (totalUnscored ?? 0) > 200
        ? `${totalUnscored} unscored jobs in backlog — scoring across multiple days`
        : null,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: 'Score task generation failed', message }, { status: 500 })
  }
}
