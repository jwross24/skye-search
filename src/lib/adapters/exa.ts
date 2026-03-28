/**
 * Exa API adapter — neural search + findSimilar for job discovery.
 *
 * Two modes:
 * 1. Keyword search: academic + industry vocabulary queries against job board domains
 * 2. findSimilar: seed known cap-exempt employer career pages to discover similar postings
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

// ─── Cap-exempt employer seed URLs for findSimilar ──────────────────────────

export const FIND_SIMILAR_SEEDS: { url: string; source_type: SourceType }[] = [
  { url: 'https://careers.whoi.edu', source_type: 'academic' },
  { url: 'https://www.ssaihq.com/employment', source_type: 'government' },
  { url: 'https://www.gst.com/careers', source_type: 'government' },
  { url: 'https://cires.colorado.edu/about/opportunities', source_type: 'academic' },
  { url: 'https://jcet.umbc.edu/employment', source_type: 'academic' },
  { url: 'https://www.cira.colostate.edu/about/career-opportunities', source_type: 'academic' },
  { url: 'https://ioccg.org/resources/employment', source_type: 'academic' },
  { url: 'https://science.gsfc.nasa.gov/sed/index.cfm?fuseAction=people.openings', source_type: 'government' },
]

// ─── Academic job board domains for includeDomains filtering ─────────────────

export const ACADEMIC_JOB_DOMAINS = [
  'academicjobsonline.org',
  'sciencecareers.org',
  'nature.com',
  'postdocjobs.com',
  'higheredjobs.com',
  'chroniclevitae.com',
  'jobs.agu.org',
]

// ─── Query presets ──────────────────────────────────────────────────────────

export const ACADEMIC_QUERIES = [
  'ocean color remote sensing',
  'satellite oceanography',
  'coastal biogeochemistry',
  'Earth observation data science',
  'environmental remote sensing postdoc',
  'marine science research scientist',
  'phytoplankton remote sensing',
  'ocean optics researcher',
]

export const INDUSTRY_QUERIES = [
  'satellite data pipeline engineer',
  'geospatial ML engineer',
  'remote sensing ETL',
  'cloud-native geospatial computing',
  'environmental data scientist',
  'earth science software engineer',
  'climate data analyst',
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
    // Map known domains to org names
    const domainMap: Record<string, string> = {
      'careers.whoi.edu': 'Woods Hole Oceanographic Institution',
      'ssaihq.com': 'Science Systems and Applications Inc',
      'gst.com': 'Global Science & Technology',
      'cires.colorado.edu': 'CIRES, University of Colorado',
      'jcet.umbc.edu': 'JCET, University of Maryland Baltimore County',
      'cira.colostate.edu': 'CIRA, Colorado State University',
      'ioccg.org': 'IOCCG',
      'science.gsfc.nasa.gov': 'NASA Goddard Space Flight Center',
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
): DiscoveredJob {
  const url = result.url ?? ''
  const title = result.title ?? 'Untitled'
  const company = extractCompanyFromUrl(url)

  return {
    source: 'exa',
    url,
    title,
    company,
    raw_description: result.text ?? null,
    canonical_url: canonicalizeUrl(url),
    normalized_company: normalizeCompany(company),
    indexed_date: result.publishedDate ?? new Date().toISOString(), // fallback: treat undated as discovered-now
    source_type: sourceType,
  }
}

export const exaAdapter: JobSourceAdapter = {
  name: 'exa',

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
          includeDomains: query.domains?.length ? query.domains : undefined,
          startPublishedDate: thirtyDaysAgo(),
        })
        requestCount++

        for (const result of response.results) {
          jobs.push(mapToDiscoveredJob(result as ExaSearchResult, query.source_type))
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        errors.push({ adapter: 'exa', message, query })
      }
    }

    // Run findSimilar on seed URLs
    for (const seed of FIND_SIMILAR_SEEDS) {
      try {
        const response = await exa.findSimilarAndContents(seed.url, {
          text: { maxCharacters: 3000 },
          numResults: 5,
        })
        requestCount++

        for (const result of response.results) {
          jobs.push(mapToDiscoveredJob(result as ExaSearchResult, seed.source_type))
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        errors.push({ adapter: 'exa', message })
      }
    }

    const latency = Math.round(performance.now() - start)
    console.log(
      `Exa adapter: ${jobs.length} jobs from ${requestCount} requests (${errors.length} errors) in ${latency}ms`,
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
