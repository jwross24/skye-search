/**
 * jobs.gc.ca adapter — discovers Canadian government and academic job postings
 * via Exa API (neural search + findSimilar).
 *
 * No public API exists for jobs.gc.ca, so we use Exa to search across Canadian
 * government and academic job board domains. Canadian positions are Plan C for
 * the primary user (environmental scientist on OPT).
 */

import Exa from 'exa-js'
import type {
  JobSourceAdapter,
  SourceType,
  DiscoveryQuery,
  AdapterResult,
  DiscoveredJob,
  AdapterError,
  HealthCheckResult,
} from '@/types/job-source'
import { canonicalizeUrl } from './canonicalize'
import { normalizeCompany } from './normalize-company'

// ─── Canadian government job domains for Exa includeDomains ─────────────────

export const CANADA_GOV_DOMAINS = [
  'emploisfp-psjobs.cfp-psc.gc.ca', // GC Jobs (PSC) — federal public service
  'jobbank.gc.ca',                    // Job Bank (ESDC) — broader Canadian jobs
  'canada.ca',                        // Canada.ca job pages
  'nrc-cnrc.gc.ca',                   // National Research Council
  'science.gc.ca',                    // Science.gc.ca
]

// ─── Canadian academic institution domains ──────────────────────────────────

export const CANADA_ACADEMIC_DOMAINS = [
  'ubc.ca',           // University of British Columbia
  'dal.ca',            // Dalhousie (ocean science hub)
  'uvic.ca',           // University of Victoria
  'mcgill.ca',         // McGill University
  'mun.ca',            // Memorial University (ocean science)
  'uottawa.ca',        // University of Ottawa
  'utoronto.ca',       // University of Toronto
  'ualberta.ca',       // University of Alberta
  'usask.ca',          // University of Saskatchewan
]

// ─── Canadian-specific search queries ───────────────────────────────────────

export const CANADA_QUERIES = [
  'environmental scientist research position Canada',
  'ocean science researcher Canada hiring',
  'remote sensing scientist Canada government',
  'marine biogeochemistry postdoc Canada',
  'geospatial data scientist Canada',
  'climate science researcher Canada',
  'satellite oceanography Canada position',
  'earth observation scientist Canada',
]

// ─── findSimilar seeds — known Canadian cap-exempt employer career pages ────

export const CANADA_FIND_SIMILAR_SEEDS: { url: string; source_type: SourceType }[] = [
  { url: 'https://www.dfo-mpo.gc.ca/career-carriere/index-eng.html', source_type: 'government' },  // DFO careers
  { url: 'https://www.canada.ca/en/environment-climate-change/corporate/careers.html', source_type: 'government' },  // ECCC careers
  { url: 'https://nrc.canada.ca/en/corporate/careers', source_type: 'government' },  // NRC careers
  { url: 'https://hakai.org/careers/', source_type: 'academic' },  // Hakai Institute
  { url: 'https://www.ocean.dal.ca/', source_type: 'academic' },  // Dalhousie Oceanography
  { url: 'https://www.uvic.ca/science/seos/', source_type: 'academic' },  // UVic SEOS
]

// ─── Adapter implementation ─────────────────────────────────────────────────

function getExaClient(): Exa {
  const apiKey = process.env.EXA_API_KEY
  if (!apiKey || apiKey === 'your_exa_api_key') {
    throw new Error('EXA_API_KEY not configured')
  }
  return new Exa(apiKey)
}

function extractCompanyFromUrl(url: string): string {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '')
    // Map known Canadian domains to org names
    const domainMap: Record<string, string> = {
      'emploisfp-psjobs.cfp-psc.gc.ca': 'Government of Canada (PSC)',
      'jobbank.gc.ca': 'Job Bank Canada',
      'nrc-cnrc.gc.ca': 'National Research Council Canada',
      'science.gc.ca': 'Science.gc.ca',
      'dfo-mpo.gc.ca': 'Fisheries and Oceans Canada',
      'nrc.canada.ca': 'National Research Council Canada',
      'ocean.dal.ca': 'Dalhousie University',
      'hakai.org': 'Hakai Institute',
    }
    return domainMap[hostname] ?? hostname
  } catch {
    return 'Unknown'
  }
}

interface ExaSearchResult {
  url: string
  title: string | null
  author?: string | null
  publishedDate?: string | null
  text?: string | null
  score?: number
}

function mapToDiscoveredJob(
  result: ExaSearchResult,
  sourceType: SourceType,
  discoverySourceDetail?: string,
): DiscoveredJob {
  const url = result.url || null
  const title = result.title ?? 'Untitled'
  const company = url ? extractCompanyFromUrl(url) : 'Unknown'

  return {
    source: 'jobsgcca',
    url,
    title,
    company,
    raw_description: result.text ?? null,
    canonical_url: url ? canonicalizeUrl(url) : null,
    normalized_company: normalizeCompany(company),
    indexed_date: result.publishedDate ?? new Date().toISOString(),
    source_type: sourceType,
    discovery_source_detail: discoverySourceDetail ?? null,
  }
}

export const jobsgccaAdapter: JobSourceAdapter = {
  name: 'jobsgcca',

  async discover(queries: DiscoveryQuery[]): Promise<AdapterResult> {
    const exa = getExaClient()
    const jobs: DiscoveredJob[] = []
    const errors: AdapterError[] = []
    let requestCount = 0
    const start = performance.now()

    // Run keyword searches from discovery queries
    for (const query of queries) {
      const searchText = query.keywords.join(' ')

      try {
        const response = await exa.searchAndContents(searchText, {
          text: { maxCharacters: 3000 },
          numResults: 10,
          type: 'neural',
          userLocation: 'CA',
          filterEmptyResults: true,
          includeDomains: query.domains?.length ? query.domains : undefined,
          startPublishedDate: thirtyDaysAgo(),
        })
        requestCount++

        for (const result of response.results) {
          jobs.push(mapToDiscoveredJob(result as ExaSearchResult, query.source_type, `query:${searchText}`))
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        errors.push({ adapter: 'jobsgcca', message, query })
      }
    }

    // Run findSimilar on Canadian seed URLs
    for (const seed of CANADA_FIND_SIMILAR_SEEDS) {
      try {
        const response = await exa.findSimilarAndContents(seed.url, {
          text: { maxCharacters: 3000 },
          numResults: 5,
          userLocation: 'CA',
          filterEmptyResults: true,
          startPublishedDate: seed.source_type === 'academic' ? ninetyDaysAgo() : thirtyDaysAgo(),
        })
        requestCount++

        for (const result of response.results) {
          jobs.push(mapToDiscoveredJob(result as ExaSearchResult, seed.source_type, `seed:${seed.url}`))
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        errors.push({ adapter: 'jobsgcca', message })
      }
    }

    const latency = Math.round(performance.now() - start)
    console.log(
      `jobsgcca adapter: ${jobs.length} jobs from ${requestCount} requests (${errors.length} errors) in ${latency}ms`,
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
      const exa = getExaClient()
      const response = await exa.search('test', { numResults: 1 })
      const latency = Math.round(performance.now() - start)
      return {
        healthy: response.results.length > 0,
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

function thirtyDaysAgo(): string {
  const d = new Date()
  d.setDate(d.getDate() - 30)
  return d.toISOString().split('T')[0]
}

function ninetyDaysAgo(): string {
  const d = new Date()
  d.setDate(d.getDate() - 90)
  return d.toISOString().split('T')[0]
}
