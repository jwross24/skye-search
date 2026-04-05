import { timingSafeEqual } from 'crypto'
import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { careerPageMonitorAdapter } from '@/lib/adapters/career-page-monitor'

/**
 * POST /api/cron/career-page-monitor
 *
 * Scrapes career pages of cap-exempt H-1B employers (nonprofits, national labs,
 * cooperative institutes) that don't reliably cross-post to aggregators.
 * Runs synchronously — no task queue needed. Upserts directly into discovered_jobs.
 *
 * Secured with CRON_SECRET — triggered by GitHub Actions cron.
 * Idempotent: skips if career_page_monitor ran in the last 2 hours (prevents
 * re-scraping on GHA retry triggers).
 */
// Vercel / GHA can send GET or POST. Handle both.
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
      return NextResponse.json({ ok: true, jobs_found: 0, jobs_inserted: 0, reason: 'no users' })
    }
    const userId = users[0].id

    // ─── Idempotency check ─────────────────────────────────────────────
    // Skip if career_page_monitor already ran in the last 2 hours.
    // Prevents re-scraping employer pages on GHA retry triggers.
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
    const { count: recentCount } = await supabase
      .from('discovered_jobs')
      .select('*', { count: 'exact', head: true })
      .eq('source', 'career_page_monitor')
      .gte('created_at', twoHoursAgo)

    if (recentCount && recentCount > 0) {
      return NextResponse.json({
        ok: true,
        jobs_found: 0,
        jobs_inserted: 0,
        reason: `career_page_monitor already ran in the last 2 hours (${recentCount} recent records)`,
      })
    }

    // ─── Scrape all employer career pages ─────────────────────────────
    const result = await careerPageMonitorAdapter.discover([])

    let jobsInserted = 0
    if (result.jobs.length > 0) {
      const rows = result.jobs.map(job => ({
        user_id: userId,
        source: job.source,
        url: job.url,
        title: job.title,
        company: job.company,
        raw_description: job.raw_description,
        canonical_url: job.canonical_url,
        normalized_company: job.normalized_company,
        indexed_date: job.indexed_date,
        source_type: job.source_type,
        discovery_source_detail: job.discovery_source_detail,
        scored: false,
      }))

      const { error: upsertError } = await supabase
        .from('discovered_jobs')
        .upsert(rows, { onConflict: 'canonical_url', ignoreDuplicates: true })

      if (upsertError) {
        console.error('CareerPageMonitor upsert error:', upsertError.message)
        return NextResponse.json(
          { error: 'Failed to insert jobs', message: upsertError.message },
          { status: 500 },
        )
      }

      // rows.length = attempted upserts; actual new inserts may be fewer
      // due to ignoreDuplicates. Supabase doesn't return a count on upsert.
      jobsInserted = rows.length
    }

    return NextResponse.json({
      ok: true,
      jobs_found: result.jobs.length,
      jobs_inserted: jobsInserted, // attempted upserts, not net-new inserts
      errors: result.errors,
      latency_ms: result.metadata.latency_ms,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json(
      { error: 'Career page monitor failed', message },
      { status: 500 },
    )
  }
}
