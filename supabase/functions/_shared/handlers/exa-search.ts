/**
 * Exa search task handler — processes exa_search_query and exa_find_similar tasks.
 * Calls Exa API, maps results, inserts into discovered_jobs.
 */

import { registerHandler } from '../handler-registry.ts'
import { getSupabaseAdmin } from '../supabase-admin.ts'
import { checkBudget } from '../budget-guard.ts'
import type { TaskRow, TaskResult } from '../task-types.ts'
import Exa from 'npm:exa-js@2'

function getExa(): Exa {
  const key = Deno.env.get('EXA_API_KEY')
  if (!key) throw new Error('EXA_API_KEY not configured')
  return new Exa(key)
}

async function logExaCost(userId: string, taskType: string, resultCount: number): Promise<void> {
  const supabase = getSupabaseAdmin()
  const costCents = Math.ceil(0.5 + resultCount * 0.1)
  const { error } = await supabase.from('api_usage_log').insert({
    user_id: userId,
    model: 'exa-search',
    input_tokens: 0,
    output_tokens: 0,
    estimated_cost_cents: costCents,
    task_type: taskType,
  })
  if (error) console.error('Failed to log Exa API cost:', error.message)
}

interface DiscoveredJobRow {
  user_id: string
  source: string
  url: string
  title: string
  company: string
  raw_description: string | null
  canonical_url: string
  normalized_company: string
  indexed_date: string
  source_type: string
  discovery_source_detail: string | null
}

function canonicalizeUrl(url: string): string {
  try {
    const parsed = new URL(url.replace(/^http:\/\//i, 'https://'))
    if (parsed.hostname.startsWith('www.')) {
      parsed.hostname = parsed.hostname.slice(4)
    }
    parsed.hash = ''
    let result = parsed.origin + parsed.pathname
    if (result.length > 1 && result.endsWith('/')) result = result.slice(0, -1)
    const search = parsed.searchParams.toString()
    if (search) result += '?' + search
    return result
  } catch {
    return url
  }
}

function normalizeCompany(name: string): string {
  return name.trim().replace(/,?\s+(inc|llc|ltd|corp|co|company)\.?$/i, '').toLowerCase().replace(/\s+/g, ' ').trim()
}

function extractCompany(url: string): string {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '')
    const knownDomains: Record<string, string> = {
      'careers.whoi.edu': 'Woods Hole Oceanographic Institution',
      'ssaihq.com': 'Science Systems and Applications Inc',
      'gst.com': 'Global Science & Technology',
      'cires.colorado.edu': 'CIRES, University of Colorado',
      'jcet.umbc.edu': 'JCET, University of Maryland Baltimore County',
      'cira.colostate.edu': 'CIRA, Colorado State University',
      'ioccg.org': 'IOCCG',
      'science.gsfc.nasa.gov': 'NASA Goddard Space Flight Center',
    }
    return knownDomains[hostname] ?? hostname
  } catch {
    return 'Unknown'
  }
}

interface ExaResult {
  url: string
  title?: string | null
  text?: string | null
  publishedDate?: string | null
}

function mapToRow(result: ExaResult, userId: string, sourceType: string, sourceDetail: string | null = null): DiscoveredJobRow {
  const url = result.url ?? ''
  const company = extractCompany(url)
  return {
    user_id: userId,
    source: 'exa',
    url,
    title: result.title ?? 'Untitled',
    company,
    raw_description: result.text ?? null,
    canonical_url: canonicalizeUrl(url),
    normalized_company: normalizeCompany(company),
    indexed_date: result.publishedDate ?? new Date().toISOString(),
    source_type: sourceType,
    discovery_source_detail: sourceDetail,
  }
}

// ─── exa_search_query handler ────────────────────────────────────────────────

registerHandler({
  taskType: 'exa_search_query',
  async execute(task: TaskRow): Promise<TaskResult> {
    const payload = task.payload_json as { query?: string; domains?: string[]; source_type?: string } | null
    if (!payload?.query) {
      return { success: false, error: 'Missing query in payload', permanent: true }
    }

    // Budget check before API call — distinguish pause (permanent) from DB error (retryable)
    let verdict: Awaited<ReturnType<typeof checkBudget>>
    try {
      verdict = await checkBudget({ userId: task.user_id, taskType: task.task_type })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      return { success: false, error: `Budget check failed: ${msg}` } // retryable
    }
    if (verdict.action === 'pause') {
      return { success: false, error: verdict.reason, permanent: true }
    }

    const numResults = verdict.action === 'reduce_batch' ? verdict.maxBatchSize : 10
    const exa = getExa()
    const response = await exa.searchAndContents(payload.query, {
      text: { maxCharacters: 3000 },
      numResults,
      type: 'neural',
      includeDomains: payload.domains?.length ? payload.domains : undefined,
      startPublishedDate: thirtyDaysAgo(),
    })

    await logExaCost(task.user_id, task.task_type, response.results.length)

    const rows = response.results.map((r: ExaResult) =>
      mapToRow(r, task.user_id, payload.source_type ?? 'academic', `query:${payload.query}`),
    )

    const inserted = await upsertJobs(rows)

    return {
      success: true,
      data: { query: payload.query, jobs_found: rows.length, jobs_inserted: inserted },
    }
  },
})

// ─── exa_find_similar handler ────────────────────────────────────────────────

registerHandler({
  taskType: 'exa_find_similar',
  async execute(task: TaskRow): Promise<TaskResult> {
    const payload = task.payload_json as { seed_url?: string; source_type?: string } | null
    if (!payload?.seed_url) {
      return { success: false, error: 'Missing seed_url in payload', permanent: true }
    }

    // Budget check before API call — distinguish pause (permanent) from DB error (retryable)
    let verdict: Awaited<ReturnType<typeof checkBudget>>
    try {
      verdict = await checkBudget({ userId: task.user_id, taskType: task.task_type })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      return { success: false, error: `Budget check failed: ${msg}` } // retryable
    }
    if (verdict.action === 'pause') {
      return { success: false, error: verdict.reason, permanent: true }
    }

    const numResults = verdict.action === 'reduce_batch' ? verdict.maxBatchSize : 5
    const exa = getExa()
    const response = await exa.findSimilarAndContents(payload.seed_url, {
      text: { maxCharacters: 3000 },
      numResults,
    })

    await logExaCost(task.user_id, task.task_type, response.results.length)

    const rows = response.results.map((r: ExaResult) =>
      mapToRow(r, task.user_id, payload.source_type ?? 'academic', `seed:${payload.seed_url}`),
    )

    const inserted = await upsertJobs(rows)

    return {
      success: true,
      data: { seed_url: payload.seed_url, jobs_found: rows.length, jobs_inserted: inserted },
    }
  },
})

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function upsertJobs(rows: DiscoveredJobRow[]): Promise<number> {
  if (rows.length === 0) return 0
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('discovered_jobs')
    .upsert(rows, { onConflict: 'canonical_url', ignoreDuplicates: true })
    .select('id')

  if (error) {
    console.error('Failed to upsert discovered_jobs:', error.message)
    throw new Error(`DB upsert failed: ${error.message}`)
  }
  return data?.length ?? 0
}

function thirtyDaysAgo(): string {
  const d = new Date()
  d.setDate(d.getDate() - 30)
  return d.toISOString().split('T')[0]
}
