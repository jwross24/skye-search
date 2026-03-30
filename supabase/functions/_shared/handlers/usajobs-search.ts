/**
 * USAJobs search task handler — processes usajobs_search tasks.
 * Calls USAJobs API, maps results, inserts into discovered_jobs.
 */

import { registerHandler } from '../handler-registry.ts'
import { getSupabaseAdmin } from '../supabase-admin.ts'
import { checkBudget } from '../budget-guard.ts'
import type { TaskRow, TaskResult } from '../task-types.ts'

// ─── API constants ──────────────────────────────────────────────────────────

const USAJOBS_BASE_URL = 'https://data.usajobs.gov/api/search'

function getApiCredentials(): { apiKey: string; userAgent: string } {
  const apiKey = Deno.env.get('USAJOBS_API_KEY')
  const userAgent = Deno.env.get('USAJOBS_USER_AGENT')
  if (!apiKey) throw new Error('USAJOBS_API_KEY not configured')
  if (!userAgent) throw new Error('USAJOBS_USER_AGENT not configured')
  return { apiKey, userAgent }
}

// ─── USAJobs response types ────────────────────────────────────────────────

interface USAJobsItem {
  MatchedObjectId: string
  MatchedObjectDescriptor: {
    PositionTitle: string
    PositionURI: string
    PositionLocationDisplay: string
    PositionLocation: Array<{ LocationName: string }>
    OrganizationName: string
    DepartmentName: string
    QualificationSummary: string
    PositionRemuneration: Array<{
      MinimumRange: string
      MaximumRange: string
      RateIntervalCode: string
    }>
    ApplicationCloseDate: string
    PositionEndDate: string
    PublicationStartDate: string
    UserArea: {
      Details: {
        MajorDuties?: string[]
      }
    }
  }
}

interface USAJobsSearchResponse {
  SearchResult: {
    SearchResultCount: number
    SearchResultCountAll: number
    SearchResultItems: USAJobsItem[]
  }
}

// ─── Mapping helpers ────────────────────────────────────────────────────────

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
  return name
    .trim()
    .replace(/,?\s+(inc|llc|ltd|corp|co|company)\.?$/i, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

function formatSalary(
  remuneration: USAJobsItem['MatchedObjectDescriptor']['PositionRemuneration'],
): string | null {
  if (!remuneration?.length) return null
  const r = remuneration[0]
  const min = r.MinimumRange ? `$${Number(r.MinimumRange).toLocaleString('en-US')}` : ''
  const max = r.MaximumRange ? `$${Number(r.MaximumRange).toLocaleString('en-US')}` : ''
  const interval =
    r.RateIntervalCode === 'PA' ? '/yr' : r.RateIntervalCode === 'PH' ? '/hr' : ''
  if (min && max) return `${min} - ${max}${interval}`
  if (min) return `${min}+${interval}`
  return null
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
  structured_deadline: string | null
  structured_salary: string | null
  structured_location: string | null
}

function mapToRow(item: USAJobsItem, userId: string): DiscoveredJobRow {
  const desc = item.MatchedObjectDescriptor
  const company = desc.OrganizationName || desc.DepartmentName || 'Unknown'
  const duties = desc.UserArea?.Details?.MajorDuties?.join('\n') ?? ''
  const qualification = desc.QualificationSummary ?? ''
  const rawDescription = [qualification, duties].filter(Boolean).join('\n\n')
  const locations = desc.PositionLocation?.map((l) => l.LocationName).filter(Boolean).join('; ')

  return {
    user_id: userId,
    source: 'usajobs',
    url: desc.PositionURI,
    title: desc.PositionTitle,
    company,
    raw_description: rawDescription || null,
    canonical_url: canonicalizeUrl(desc.PositionURI),
    normalized_company: normalizeCompany(company),
    indexed_date: desc.PublicationStartDate || new Date().toISOString(),
    source_type: 'government',
    structured_deadline: desc.ApplicationCloseDate || desc.PositionEndDate || null,
    structured_salary: formatSalary(desc.PositionRemuneration),
    structured_location: desc.PositionLocationDisplay || locations || null,
  }
}

// ─── API call ───────────────────────────────────────────────────────────────

async function searchUSAJobs(
  keyword: string,
  options: {
    apiKey: string
    userAgent: string
    locationName?: string
    resultsPerPage?: number
  },
): Promise<USAJobsSearchResponse> {
  const params = new URLSearchParams({
    Keyword: keyword,
    ResultsPerPage: String(options.resultsPerPage ?? 50),
    DatePosted: '30',
  })
  if (options.locationName) {
    params.set('LocationName', options.locationName)
  }

  const url = `${USAJOBS_BASE_URL}?${params.toString()}`

  const response = await fetch(url, {
    headers: {
      Host: 'data.usajobs.gov',
      'User-Agent': options.userAgent,
      'Authorization-Key': options.apiKey,
    },
  })

  if (response.status === 429) {
    throw new Error('USAJobs API rate limited (429)')
  }

  if (!response.ok) {
    throw new Error(`USAJobs API error: ${response.status} ${response.statusText}`)
  }

  return response.json() as Promise<USAJobsSearchResponse>
}

// ─── Cost logging (USAJobs API is free, but log for observability) ──────────

async function logUSAJobsCost(
  userId: string,
  taskType: string,
  resultCount: number,
): Promise<void> {
  const supabase = getSupabaseAdmin()
  const { error } = await supabase.from('api_usage_log').insert({
    user_id: userId,
    model: 'usajobs-search',
    input_tokens: 0,
    output_tokens: 0,
    estimated_cost_cents: 0, // USAJobs API is free
    task_type: taskType,
  })
  if (error) console.error('Failed to log USAJobs API usage:', error.message)
}

// ─── Upsert helper ─────────────────────────────────────────────────────────

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

// ─── Handler registration ───────────────────────────────────────────────────

registerHandler({
  taskType: 'usajobs_search',
  async execute(task: TaskRow): Promise<TaskResult> {
    const payload = task.payload_json as {
      query?: string
      location?: string
      results_per_page?: number
    } | null
    if (!payload?.query) {
      return { success: false, error: 'Missing query in payload', permanent: true }
    }

    // Budget check (USAJobs is free, but respect global pause signals)
    let verdict: Awaited<ReturnType<typeof checkBudget>>
    try {
      verdict = await checkBudget({ userId: task.user_id, taskType: task.task_type })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      return { success: false, error: `Budget check failed: ${msg}` }
    }
    if (verdict.action === 'pause') {
      return { success: false, error: verdict.reason, permanent: true }
    }

    const { apiKey, userAgent } = getApiCredentials()
    const resultsPerPage =
      verdict.action === 'reduce_batch'
        ? verdict.maxBatchSize
        : (payload.results_per_page ?? 50)

    const response = await searchUSAJobs(payload.query, {
      apiKey,
      userAgent,
      locationName: payload.location,
      resultsPerPage,
    })

    const items = response.SearchResult?.SearchResultItems ?? []
    await logUSAJobsCost(task.user_id, task.task_type, items.length)

    const rows = items.map((item) => mapToRow(item, task.user_id))
    const inserted = await upsertJobs(rows)

    console.log(
      `USAJobs search "${payload.query}": ${items.length} found, ${inserted} inserted`,
    )

    return {
      success: true,
      data: {
        query: payload.query,
        jobs_found: items.length,
        jobs_inserted: inserted,
        total_available: response.SearchResult?.SearchResultCountAll ?? 0,
      },
    }
  },
})
