/**
 * fetch_description handler — fetches detail-page descriptions for discovered
 * jobs whose adapter (e.g. career_page_monitor) only captures titles + URLs.
 *
 * Task type: fetch_description
 * Payload: { discovered_job_ids: string[] }
 *
 * For each id:
 *  - Skip if attempts >= 3 (idempotency cap)
 *  - Skip if raw_description IS NOT NULL (race guard)
 *  - SSRF-guard the URL (only http/https; no private/loopback IPs)
 *  - Fetch URL with 10s timeout + SkyeSearchBot UA
 *  - Cheerio-extract body text (strip script/style/nav/footer/header/noscript/iframe)
 *  - On success (>=50 chars): UPDATE raw_description + description_fetched_at + attempts++
 *  - On failure: UPDATE description_fetched_at + attempts++ (raw_description stays null)
 *  - 1.5s delay between fetches (politeness)
 *
 * The score cron filters on description_fetched_at IS NOT NULL so that:
 *  - Rows we never tried to fetch don't get scored prematurely
 *  - Rows where we tried + failed don't loop forever (still excluded by raw_description NULL)
 */

import { registerHandler } from '../handler-registry.ts'
import { getSupabaseAdmin } from '../supabase-admin.ts'
import type { TaskRow, TaskResult } from '../task-types.ts'
import * as cheerio from 'npm:cheerio@1'

// ─── Constants ──────────────────────────────────────────────────────────────

const MAX_FETCH_ATTEMPTS = 3
const FETCH_TIMEOUT_MS = 10_000
const MIN_TEXT_LENGTH = 50
const MAX_TEXT_LENGTH = 8_000
const POLITENESS_DELAY_MS = 1_500
const USER_AGENT =
  'Mozilla/5.0 (compatible; SkyeSearchBot/1.0; +https://skye-search.vercel.app)'

// SSRF guard — must mirror src/app/jobs/url-analysis-actions.ts
const BLOCKED_HOSTNAME_RE =
  /^(localhost|127\.\d+\.\d+\.\d+|0\.0\.0\.0|::1|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+|192\.168\.\d+\.\d+|169\.254\.\d+\.\d+)$/

// ─── Types ──────────────────────────────────────────────────────────────────

export type FetchOutcome = 'ok' | 'fetch_failed' | 'too_short' | 'invalid_url' | 'http_error'

export interface FetchResultPerJob {
  outcome: FetchOutcome
  text: string | null
  length: number
}

interface DiscoveredJobRow {
  id: string
  url: string | null
  raw_description: string | null
  description_fetch_attempts: number | null
}

// ─── Helpers ────────────────────────────────────────────────────────────────

export function isUrlSafe(rawUrl: string | null | undefined): boolean {
  if (!rawUrl) return false
  let parsed: URL
  try {
    parsed = new URL(rawUrl)
  } catch {
    return false
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false
  return !BLOCKED_HOSTNAME_RE.test(parsed.hostname)
}

export function extractTextFromHtml(html: string): string {
  const $ = cheerio.load(html)
  $('script, style, nav, footer, header, noscript, iframe').remove()
  return $('body').text().replace(/\s+/g, ' ').trim().slice(0, MAX_TEXT_LENGTH)
}

function delay(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms))
}

// ─── Per-job fetch ──────────────────────────────────────────────────────────

export async function fetchOneDescription(url: string | null): Promise<FetchResultPerJob> {
  if (!isUrlSafe(url)) {
    return { outcome: 'invalid_url', text: null, length: 0 }
  }

  let html: string
  try {
    const response = await fetch(url!, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    })
    if (!response.ok) {
      return { outcome: 'http_error', text: null, length: 0 }
    }
    html = await response.text()
  } catch {
    return { outcome: 'fetch_failed', text: null, length: 0 }
  }

  const text = extractTextFromHtml(html)
  if (text.length < MIN_TEXT_LENGTH) {
    return { outcome: 'too_short', text: null, length: text.length }
  }

  return { outcome: 'ok', text, length: text.length }
}

// ─── Handler Registration ───────────────────────────────────────────────────

registerHandler({
  taskType: 'fetch_description',
  async execute(task: TaskRow): Promise<TaskResult> {
    const payload = task.payload_json as { discovered_job_ids?: string[] } | null
    if (!payload?.discovered_job_ids?.length) {
      return { success: false, error: 'Missing discovered_job_ids in payload', permanent: true }
    }

    const supabase = getSupabaseAdmin()

    const { data: jobs, error: fetchError } = await supabase
      .from('discovered_jobs')
      .select('id, url, raw_description, description_fetch_attempts')
      .in('id', payload.discovered_job_ids)

    if (fetchError) {
      return { success: false, error: `Failed to fetch jobs: ${fetchError.message}` }
    }

    if (!jobs || jobs.length === 0) {
      return {
        success: true,
        data: { total: payload.discovered_job_ids.length, fetched: 0, failed: 0, skipped: 0 },
      }
    }

    let fetched = 0
    let failed = 0
    let skipped = 0
    let processedAtLeastOne = false

    for (let i = 0; i < jobs.length; i++) {
      const job = jobs[i] as DiscoveredJobRow
      const currentAttempts = job.description_fetch_attempts ?? 0

      // Idempotency: skip if already at retry cap
      if (currentAttempts >= MAX_FETCH_ATTEMPTS) {
        skipped++
        console.log('[fetch-description] outcome', {
          discovered_job_id: job.id,
          status: 'skipped_max_attempts',
          length: 0,
        })
        continue
      }

      // Race guard: skip if another worker already populated raw_description
      if (job.raw_description != null) {
        skipped++
        console.log('[fetch-description] outcome', {
          discovered_job_id: job.id,
          status: 'skipped_already_fetched',
          length: 0,
        })
        continue
      }

      // Politeness delay BEFORE network call (except the very first attempt)
      if (processedAtLeastOne) {
        await delay(POLITENESS_DELAY_MS)
      }
      processedAtLeastOne = true

      const result = await fetchOneDescription(job.url)
      const nowIso = new Date().toISOString()
      const nextAttempts = currentAttempts + 1

      const updateRow: Record<string, unknown> =
        result.outcome === 'ok' && result.text
          ? {
              raw_description: result.text,
              description_fetched_at: nowIso,
              description_fetch_attempts: nextAttempts,
            }
          : {
              description_fetched_at: nowIso,
              description_fetch_attempts: nextAttempts,
            }

      const { error: updateError } = await supabase
        .from('discovered_jobs')
        .update(updateRow)
        .eq('id', job.id)

      if (updateError) {
        console.error('[fetch-description] update failed', {
          discovered_job_id: job.id,
          error: updateError.message,
        })
        failed++
      } else if (result.outcome === 'ok') {
        fetched++
      } else {
        failed++
      }

      console.log('[fetch-description] outcome', {
        discovered_job_id: job.id,
        status: result.outcome,
        length: result.length,
      })
    }

    return {
      success: true,
      data: {
        total: payload.discovered_job_ids.length,
        fetched,
        failed,
        skipped,
      },
    }
  },
})
