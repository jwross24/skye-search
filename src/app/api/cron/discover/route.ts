import { timingSafeEqual } from 'crypto'
import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  ACADEMIC_QUERIES,
  INDUSTRY_QUERIES,
  FIND_SIMILAR_SEEDS,
  ACADEMIC_JOB_DOMAINS,
} from '@/lib/adapters/exa'
import { USAJOBS_QUERIES } from '@/lib/adapters/usajobs'

/**
 * POST /api/cron/discover
 *
 * Generates Exa search tasks in the task_queue. The queue-worker Edge Function
 * picks them up and executes them (one per minute via pg_cron).
 *
 * Secured with CRON_SECRET — triggered by Vercel Cron (bi-weekly Tue/Fri).
 * Idempotent: skips if pending exa tasks already exist from the last 24 hours.
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

    // Budget check — skip task generation if daily cap reached
    const { checkBudget } = await import('@/lib/budget-guard')
    const budgetVerdict = await checkBudget({ userId, taskType: 'discover_cron' })
    if (budgetVerdict.action === 'pause') {
      return NextResponse.json({
        ok: true,
        tasks_created: 0,
        reason: `Budget paused: ${budgetVerdict.reason}`,
      })
    }

    // Check for existing pending discovery tasks (idempotency — skip if already queued)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { count: pendingCount } = await supabase
      .from('task_queue')
      .select('*', { count: 'exact', head: true })
      .in('task_type', ['exa_search_query', 'exa_find_similar', 'usajobs_search'])
      .in('status', ['pending', 'processing'])
      .gte('created_at', twentyFourHoursAgo)

    if (pendingCount && pendingCount > 0) {
      return NextResponse.json({
        ok: true,
        tasks_created: 0,
        reason: `${pendingCount} discovery tasks still pending from last 24h`,
      })
    }

    // ─── Generate search tasks ─────────────────────────────────────────
    const tasks: Array<{
      user_id: string
      task_type: string
      payload_json: Record<string, unknown>
      max_retries: number
    }> = []

    // Academic queries (with domain filtering)
    for (const query of ACADEMIC_QUERIES) {
      tasks.push({
        user_id: userId,
        task_type: 'exa_search_query',
        payload_json: {
          query,
          domains: ACADEMIC_JOB_DOMAINS,
          source_type: 'academic',
        },
        max_retries: 3,
      })
    }

    // Industry queries (no domain filtering — broader net)
    for (const query of INDUSTRY_QUERIES) {
      tasks.push({
        user_id: userId,
        task_type: 'exa_search_query',
        payload_json: {
          query,
          source_type: 'industry',
        },
        max_retries: 3,
      })
    }

    // findSimilar seeds
    for (const seed of FIND_SIMILAR_SEEDS) {
      tasks.push({
        user_id: userId,
        task_type: 'exa_find_similar',
        payload_json: {
          seed_url: seed.url,
          source_type: seed.source_type,
        },
        max_retries: 3,
      })
    }

    // USAJobs queries (government/contractor positions)
    for (const query of USAJOBS_QUERIES) {
      tasks.push({
        user_id: userId,
        task_type: 'usajobs_search',
        payload_json: {
          query,
        },
        max_retries: 3,
      })
    }

    // Bulk insert
    const { error: insertError } = await supabase.from('task_queue').insert(tasks)
    if (insertError) {
      return NextResponse.json(
        { error: 'Failed to create tasks', message: insertError.message },
        { status: 500 },
      )
    }

    return NextResponse.json({
      ok: true,
      tasks_created: tasks.length,
      breakdown: {
        academic_search: ACADEMIC_QUERIES.length,
        industry_search: INDUSTRY_QUERIES.length,
        find_similar: FIND_SIMILAR_SEEDS.length,
        usajobs_search: USAJOBS_QUERIES.length,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: 'Discovery task generation failed', message }, { status: 500 })
  }
}
