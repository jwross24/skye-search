import { timingSafeEqual } from 'crypto'
import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validateJobBatch } from '@/lib/link-validator'

/**
 * POST /api/cron/link-validation
 *
 * Validates discovered job URLs to detect dead links, closed postings,
 * and expired listings. Updates validation_status in discovered_jobs.
 *
 * Secured with CRON_SECRET — triggered by GitHub Actions cron.
 * Idempotent: skips if link-validation ran in the last 6 hours.
 */
export const GET = handler
export const POST = handler

const BATCH_SIZE = 10
const MAX_JOBS = 50
const IDEMPOTENCY_HOURS = 6
const EXEMPTED_SOURCES = ['usajobs', 'higheredjobs']

async function handler(req: NextRequest) {
  const start = Date.now()

  // ─── Auth ──────────────────────────────────────────────────────────────
  const secret = req.headers.get('authorization')?.replace('Bearer ', '')

  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 })
  }

  const b = Buffer.from(process.env.CRON_SECRET)
  const a = Buffer.from(secret ?? '')
  if (!secret || a.length !== b.length || !timingSafeEqual(a, b)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SECRET_KEY!,
    )

    // Get the primary (non-admin) user
    const { data: users } = await supabase.from('users').select('id').eq('is_admin', false).limit(1)
    if (!users || users.length === 0) {
      return NextResponse.json({ ok: true, validated: 0, reason: 'no users' })
    }
    const userId = users[0].id

    // ─── Idempotency check ─────────────────────────────────────────────
    const cutoff = new Date(Date.now() - IDEMPOTENCY_HOURS * 60 * 60 * 1000).toISOString()
    const { count: recentCount } = await supabase
      .from('discovered_jobs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('last_validated_at', cutoff)

    if (recentCount && recentCount > 0) {
      return NextResponse.json({
        ok: true,
        validated: 0,
        reason: `link-validation already ran in the last ${IDEMPOTENCY_HOURS} hours (${recentCount} recently validated)`,
      })
    }

    // ─── Query jobs to validate ────────────────────────────────────────
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const { data: jobsToValidate, error: queryError } = await supabase
      .from('discovered_jobs')
      .select('id, url, content_hash')
      .eq('user_id', userId)
      .not('source', 'in', `(${EXEMPTED_SOURCES.join(',')})`)
      .not('url', 'is', null)
      .or(`last_validated_at.is.null,last_validated_at.lt.${sevenDaysAgo}`)
      .order('last_validated_at', { ascending: true, nullsFirst: true })
      .order('created_at', { ascending: false })
      .limit(MAX_JOBS)

    if (queryError) {
      return NextResponse.json(
        { error: 'Failed to query jobs', message: queryError.message },
        { status: 500 },
      )
    }

    if (!jobsToValidate || jobsToValidate.length === 0) {
      return NextResponse.json({
        ok: true,
        validated: 0,
        results: { active: 0, dead_link: 0, closed: 0, timeout: 0 },
        duration_ms: Date.now() - start,
      })
    }

    // ─── Validate in batches of BATCH_SIZE ─────────────────────────────
    const summary = { active: 0, dead_link: 0, closed: 0, timeout: 0 }

    for (let i = 0; i < jobsToValidate.length; i += BATCH_SIZE) {
      const batch = jobsToValidate.slice(i, i + BATCH_SIZE).filter(
        (j): j is { id: string; url: string; content_hash: string | null } => j.url !== null,
      )

      const results = await validateJobBatch(batch, BATCH_SIZE)

      // Update each result in the database
      for (const result of results) {
        summary[result.status]++

        const updateData: Record<string, unknown> = {
          validation_status: result.status,
          last_validated_at: new Date().toISOString(),
        }
        if (result.contentHash) {
          updateData.content_hash = result.contentHash
        }

        await supabase
          .from('discovered_jobs')
          .update(updateData)
          .eq('id', result.discoveredJobId)
          .eq('user_id', userId)
      }
    }

    return NextResponse.json({
      ok: true,
      validated: jobsToValidate.length,
      results: summary,
      duration_ms: Date.now() - start,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json(
      { error: 'Link validation failed', message },
      { status: 500 },
    )
  }
}
