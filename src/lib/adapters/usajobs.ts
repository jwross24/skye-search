/**
 * USAJobs API adapter — federal government job discovery.
 *
 * Uses the USAJobs Search API (data.usajobs.gov/api/search) to find
 * government and contractor positions for environmental science roles.
 * Source type: 'government' with 30-day freshness window.
 *
 * API docs: https://developer.usajobs.gov/api-reference/get-api-search
 */

import type {
  JobSourceAdapter,
  DiscoveryQuery,
  AdapterResult,
  DiscoveredJob,
  AdapterError,
  HealthCheckResult,
} from '@/types/job-source'
import { canonicalizeUrl } from './canonicalize'
import { normalizeCompany } from './normalize-company'

// ─── API constants ──────────────────────────────────────────────────────────

const USAJOBS_BASE_URL = 'https://data.usajobs.gov/api/search'
const RESULTS_PER_PAGE = 50

// ─── Environmental science queries for Skye's domain ────────────────────────

export const USAJOBS_QUERIES = [
  'ocean remote sensing',
  'environmental scientist',
  'geospatial',
  'satellite data',
  'remote sensing',
  'oceanography',
  'earth observation',
  'marine science',
]

// ─── USAJobs API response types ─────────────────────────────────────────────

export interface USAJobsSearchResponse {
  SearchResult: {
    SearchResultCount: number
    SearchResultCountAll: number
    SearchResultItems: USAJobsItem[]
  }
}

export interface USAJobsItem {
  MatchedObjectId: string
  MatchedObjectDescriptor: {
    PositionID: string
    PositionTitle: string
    PositionURI: string
    ApplyURI: string[]
    PositionLocationDisplay: string
    PositionLocation: Array<{
      LocationName: string
      CountryCode?: string
      CountrySubDivisionCode?: string
      CityName?: string
      Longitude?: number
      Latitude?: number
    }>
    OrganizationName: string
    DepartmentName: string
    JobCategory: Array<{ Name: string; Code: string }>
    JobGrade: Array<{ Code: string }>
    PositionSchedule: Array<{ Name: string; Code: string }>
    PositionOfferingType: Array<{ Name: string; Code: string }>
    QualificationSummary: string
    PositionRemuneration: Array<{
      MinimumRange: string
      MaximumRange: string
      RateIntervalCode: string // PA = Per Annum, PH = Per Hour
    }>
    PositionStartDate: string
    PositionEndDate: string
    ApplicationCloseDate: string
    PublicationStartDate: string
    UserArea: {
      Details: {
        MajorDuties?: string[]
        Education?: string
        Requirements?: string
        KeyRequirements?: string[]
        TeleworkEligible?: string
        SecurityClearance?: string
      }
    }
  }
}

// ─── Adapter implementation ─────────────────────────────────────────────────

function getApiCredentials(): { apiKey: string; userAgent: string } {
  const apiKey = process.env.USAJOBS_API_KEY
  const userAgent = process.env.USAJOBS_USER_AGENT // email registered with USAJobs
  if (!apiKey) throw new Error('USAJOBS_API_KEY not configured')
  if (!userAgent) throw new Error('USAJOBS_USER_AGENT not configured')
  return { apiKey, userAgent }
}

export async function fetchUSAJobsSearch(
  keyword: string,
  options: { apiKey: string; userAgent: string; locationName?: string; resultsPerPage?: number },
): Promise<USAJobsSearchResponse> {
  const params = new URLSearchParams({
    Keyword: keyword,
    ResultsPerPage: String(options.resultsPerPage ?? RESULTS_PER_PAGE),
    DatePosted: '30', // last 30 days
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

export function formatSalary(remuneration: USAJobsItem['MatchedObjectDescriptor']['PositionRemuneration']): string | null {
  if (!remuneration?.length) return null
  const r = remuneration[0]
  const min = r.MinimumRange ? `$${Number(r.MinimumRange).toLocaleString('en-US')}` : ''
  const max = r.MaximumRange ? `$${Number(r.MaximumRange).toLocaleString('en-US')}` : ''
  const interval = r.RateIntervalCode === 'PA' ? '/yr' : r.RateIntervalCode === 'PH' ? '/hr' : ''
  if (min && max) return `${min} - ${max}${interval}`
  if (min) return `${min}+${interval}`
  return null
}

export function formatLocation(locations: USAJobsItem['MatchedObjectDescriptor']['PositionLocation']): string | null {
  if (!locations?.length) return null
  return locations.map((loc) => loc.LocationName).filter(Boolean).join('; ')
}

export function mapUSAJobsItem(item: USAJobsItem): DiscoveredJob {
  const desc = item.MatchedObjectDescriptor
  const company = desc.OrganizationName || desc.DepartmentName || 'Unknown'
  const duties = desc.UserArea?.Details?.MajorDuties?.join('\n') ?? ''
  const qualification = desc.QualificationSummary ?? ''
  const rawDescription = [qualification, duties].filter(Boolean).join('\n\n')

  return {
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
    structured_location: desc.PositionLocationDisplay || formatLocation(desc.PositionLocation),
  }
}

export const usajobsAdapter: JobSourceAdapter = {
  name: 'usajobs',

  async discover(queries: DiscoveryQuery[]): Promise<AdapterResult> {
    const { apiKey, userAgent } = getApiCredentials()
    const jobs: DiscoveredJob[] = []
    const errors: AdapterError[] = []
    let requestCount = 0
    const start = performance.now()

    for (const query of queries) {
      const keyword = query.keywords.join(' ')

      try {
        const response = await fetchUSAJobsSearch(keyword, {
          apiKey,
          userAgent,
          locationName: query.location,
          resultsPerPage: RESULTS_PER_PAGE,
        })
        requestCount++

        const items = response.SearchResult?.SearchResultItems ?? []
        for (const item of items) {
          jobs.push(mapUSAJobsItem(item))
        }

        console.log(
          `USAJobs search "${keyword}": ${items.length} results (${response.SearchResult?.SearchResultCountAll ?? 0} total)`,
        )
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        errors.push({ adapter: 'usajobs', message, query })
        console.error(`USAJobs search "${keyword}" failed: ${message}`)
      }
    }

    const latency = Math.round(performance.now() - start)
    console.log(
      `USAJobs adapter: ${jobs.length} jobs from ${requestCount} requests (${errors.length} errors) in ${latency}ms`,
    )

    return {
      jobs,
      errors,
      metadata: { request_count: requestCount, latency_ms: latency },
    }
  },

  async healthCheck(): Promise<HealthCheckResult> {
    const start = performance.now()
    try {
      const { apiKey, userAgent } = getApiCredentials()
      const response = await fetchUSAJobsSearch('test', {
        apiKey,
        userAgent,
        resultsPerPage: 1,
      })
      const latency = Math.round(performance.now() - start)
      return {
        healthy: (response.SearchResult?.SearchResultCount ?? 0) > 0,
        latencyMs: latency,
      }
    } catch (error) {
      const latency = Math.round(performance.now() - start)
      return {
        healthy: false,
        latencyMs: latency,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  },
}
