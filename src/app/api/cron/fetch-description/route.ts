import { timingSafeEqual } from 'crypto'
import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * POST /api/cron/fetch-description
 *
 * Queries discovered_jobs with raw_description IS NULL AND attempts < 3
 * (typically rows from career_page_monitor that captured title+url only)
 * and enqueues a single fetch_description task.
 *
 * The queue-worker Edge Function picks it up, fetches each detail page,
 * extracts text via Cheerio, and updates raw_description so the score cron
 * can pick up the row on the next run.
 *
 * Secured with CRON_SECRET — triggered daily before the score cron via GHA.
 * Idempotent: skips if a pending fetch_description task exists from last 30 min
 * (shorter than score cron's 24h because we want to retry quickly when
 * career_page_monitor lands new discoveries).
 */
export const GET = handler
export const POST = handler

const FETCH_BATCH_LIMIT = 20
const PENDING_WINDOW_MINUTES = 30

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

    // Get the primary (non-admin) user — admin accounts don't own job data
    const { data: users } = await supabase.from('users').select('id').eq('is_admin', false).limit(1)
    if (!users || users.length === 0) {
      return NextResponse.json({ ok: true, tasks_created: 0, reason: 'no users' })
    }
    const userId = users[0].id

    // Idempotency: skip if pending fetch_description task exists from last 30 min
    const thirtyMinutesAgo = new Date(Date.now() - PENDING_WINDOW_MINUTES * 60 * 1000).toISOString()
    const { count: pendingCount } = await supabase
      .from('task_queue')
      .select('*', { count: 'exact', head: true })
      .eq('task_type', 'fetch_description')
      .in('status', ['pending', 'processing'])
      .gte('created_at', thirtyMinutesAgo)

    if (pendingCount && pendingCount > 0) {
      return NextResponse.json({
        ok: true,
        tasks_created: 0,
        reason: `${pendingCount} fetch_description task(s) still pending from last ${PENDING_WINDOW_MINUTES}min`,
      })
    }

    // Query rows pending description fetch (raw_description IS NULL AND attempts < 3)
    const { data: pendingJobs, error: queryError } = await supabase
      .from('discovered_jobs')
      .select('id')
      .eq('user_id', userId)
      .is('raw_description', null)
      .lt('description_fetch_attempts', 3)
      .order('created_at', { ascending: true })
      .limit(FETCH_BATCH_LIMIT)

    if (queryError) {
      return NextResponse.json(
        { error: 'Failed to query pending jobs', message: queryError.message },
        { status: 500 },
      )
    }

    if (!pendingJobs || pendingJobs.length === 0) {
      return NextResponse.json({ ok: true, tasks_created: 0, reason: 'no rows pending fetch' })
    }

    // Total backlog count (for visibility — separate from this batch)
    const { count: totalPending } = await supabase
      .from('discovered_jobs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .is('raw_description', null)
      .lt('description_fetch_attempts', 3)

    const jobIds = pendingJobs.map(j => j.id)

    // Enqueue single fetch_description task
    const { error: insertError } = await supabase.from('task_queue').insert({
      user_id: userId,
      task_type: 'fetch_description',
      payload_json: { discovered_job_ids: jobIds },
      max_retries: 2,
    })

    if (insertError) {
      return NextResponse.json(
        { error: 'Failed to enqueue fetch task', message: insertError.message },
        { status: 500 },
      )
    }

    return NextResponse.json({
      ok: true,
      tasks_created: 1,
      jobs_to_fetch: jobIds.length,
      total_pending: totalPending ?? jobIds.length,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json(
      { error: 'Fetch-description task generation failed', message },
      { status: 500 },
    )
  }
}
