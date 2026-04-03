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
  // High performers from eval (precision >= 0.8)
  { url: 'https://ioccg.org/resources/employment', source_type: 'academic' },
  { url: 'https://science.gsfc.nasa.gov/610/research.html', source_type: 'government' },  // NASA GSFC Earth Science research opportunities
  // HigherEdJobs seeds — Exa crawls through their WAF via findSimilar
  // Environmental science / oceanography / remote sensing postings
  { url: 'https://www.higheredjobs.com/faculty/details.cfm?JobCode=179396510', source_type: 'academic' },  // UTA Postdoc Remote Sensing
  { url: 'https://www.higheredjobs.com/faculty/details.cfm?JobCode=179209603', source_type: 'academic' },  // Water Resources & Hydrology
  { url: 'https://www.higheredjobs.com/details.cfm?JobCode=178814456', source_type: 'academic' },          // UT Natural Resources
  // Specific postdoc program pages (not career homepages — findSimilar on index pages returns index pages)
  { url: 'https://www.whoi.edu/what-we-do/educate/postdoctoral/postdocs-scholar-fellowship-appointments/postdoctoral-fellowships/special-postdoctoral-fellowships/', source_type: 'academic' },  // WHOI Postdoc Fellowships
  { url: 'https://cires.colorado.edu/award-programs/visiting-fellows-program', source_type: 'academic' },  // CIRES Visiting Fellows
]

// ─── Academic job board domains for includeDomains filtering ─────────────────

export const ACADEMIC_JOB_DOMAINS = [
  'academicjobsonline.org',
  'sciencecareers.org',
  'naturecareers.com',
  'postdocjobs.com',
  'higheredjobs.com',
  'chroniclevitae.com',
  'jobs.agu.org',
  'careers.whoi.edu',
  'apply.interfolio.com',
]

// Industry queries search the open web but exclude known non-job domains
export const INDUSTRY_EXCLUDE_DOMAINS = [
  'nature.com',
  'go.nature.com',
  'wikipedia.org',
  'reddit.com',
  'youtube.com',
  'researchgate.net',
  'scholar.google.com',
  'linkedin.com', // login walls prevent description extraction
]

// ─── Query presets ──────────────────────────────────────────────────────────

export const ACADEMIC_QUERIES = [
  'postdoc ocean color remote sensing',
  'postdoc satellite oceanography researcher',
  'research scientist coastal biogeochemistry',
  'postdoctoral fellow Earth observation',
  'environmental remote sensing research position',
  'marine science research scientist hiring',
  'remote sensing scientist position university',
  'oceanography research position PhD',
]

export const INDUSTRY_QUERIES = [
  'satellite data scientist position hiring',
  'geospatial data engineer remote sensing job',
  'environmental data scientist position',
  'earth observation scientist job opening',
  'climate scientist position hiring',
  'remote sensing analyst job',
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
  const url = result.url || null
  const title = result.title ?? 'Untitled'
  const company = url ? extractCompanyFromUrl(url) : 'Unknown'

  return {
    source: 'exa',
    url,
    title,
    company,
    raw_description: result.text ?? null,
    canonical_url: url ? canonicalizeUrl(url) : null,
    normalized_company: normalizeCompany(company),
    indexed_date: result.publishedDate ?? new Date().toISOString(),
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
          excludeDomains: query.domains?.length ? undefined : INDUSTRY_EXCLUDE_DOMAINS,
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
