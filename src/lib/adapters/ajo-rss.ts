/**
 * AcademicJobsOnline (AJO) RSS adapter — free RSS feed for academic positions.
 *
 * AJO serves an RDF/RSS 1.0 feed of all recent postings. We fetch the full feed
 * and filter client-side for environmental science / remote sensing keywords.
 * No API key required. No WAF issues. Free.
 *
 * Feed URL: https://academicjobsonline.org/ajo?joblist-0-0-0-----rss--
 * Format: RDF/RSS 1.0 (items are <item rdf:about="..."> elements)
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

// ─── Configuration ──────────────────────────────────────────────────────────

const AJO_FEED_URL = 'https://academicjobsonline.org/ajo?joblist-0-0-0-----rss--'

// Keywords to match against title, description, and department path.
// A posting matches if ANY keyword appears (case-insensitive).
// Keywords checked against title + department + university (NOT description,
// because "research environment" in every posting creates false positives).
const RELEVANCE_KEYWORDS = [
  'ocean', 'oceanograph', 'marine science',
  'remote sensing', 'earth observation',
  'environmental science', 'ecology',
  'climate', 'atmospheric',
  'geospatial', 'geoscience',
  'hydrology', 'water resource',
  'biogeochem', 'coastal',
  'earth science', 'natural resource',
  'satellite', 'phytoplankton',
]

// ─── RDF/RSS 1.0 Parser ────────────────────────────────────────────────────

interface RdfItem {
  url: string
  title: string
  description: string
  department: string // extracted from URL path
  university: string // extracted from URL path
}

function parseRdfFeed(xml: string): RdfItem[] {
  const items: RdfItem[] = []

  // Match <item rdf:about="URL">...</item> blocks
  const itemRegex = /<item\s+rdf:about="([^"]+)">([\s\S]*?)<\/item>/g
  let match

  while ((match = itemRegex.exec(xml)) !== null) {
    const url = match[1].replace(/\?rss$/, '') // strip RSS tracking suffix
    const body = match[2]

    const title = extractTag(body, 'title')
    const description = extractTag(body, 'description')

    // Extract university and department from URL path
    // Pattern: /ajo/University/Department/ID
    const pathMatch = decodeURIComponent(url).match(/\/ajo\/([^/]+)\/([^/]+)\//)
    const university = pathMatch?.[1] ?? 'Unknown'
    const department = pathMatch?.[2] ?? ''

    items.push({ url, title, description, department, university })
  }

  return items
}

function extractTag(xml: string, tag: string): string {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`)
  const match = xml.match(regex)
  if (!match) return ''
  // Decode XML entities
  return match[1]
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x26;/g, '&')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2019;/g, '\u2019')
    .replace(/&#x201C;/g, '\u201C')
    .replace(/&#x201D;/g, '\u201D')
    .trim()
}

// ─── Relevance Filter ───────────────────────────────────────────────────────

function isRelevant(item: RdfItem): boolean {
  // Match against title + department + university only — NOT description,
  // because "collaborative research environment" in every posting causes
  // false positives with keywords like "environment".
  const searchable = `${item.title} ${item.department} ${item.university}`.toLowerCase()
  return RELEVANCE_KEYWORDS.some(kw => searchable.includes(kw))
}

// ─── Geographic Filter ─────────────────────────────────────────────────────

// AJO is a global board. Non-US/Canada postings waste Claude scoring budget.
// Blocklist approach: conservative — only filters when a clear non-US/Canada
// indicator is present. Ambiguous postings pass through for Claude to decide.
const INTERNATIONAL_COUNTRY_NAMES = [
  'australia', 'germany', 'united kingdom', 'france', 'china', 'japan',
  'india', 'netherlands', 'switzerland', 'sweden', 'norway', 'denmark',
  'new zealand', 'singapore', 'hong kong', 'korea', 'brazil',
  'south africa', 'ireland', 'israel', 'italy', 'spain', 'austria',
  'belgium', 'finland', 'portugal', 'czech republic', 'poland', 'taiwan',
  'saudi arabia', 'qatar', 'uae', 'chile', 'mexico', 'argentina',
]

const INTERNATIONAL_INSTITUTION_PATTERNS = [
  'max planck', 'cnrs', 'eth zurich', 'epfl',
  'university of oxford', 'university of cambridge',
  'imperial college', 'king\'s college london',
  'australian national university', 'university of melbourne',
  'university of sydney', 'university of queensland',
  'technion', 'weizmann institute', 'hebrew university',
  'tsinghua', 'peking university', 'chinese academy',
  'university of tokyo', 'kyoto university',
  'kaist', 'seoul national',
  'national university of singapore', 'nanyang technological',
]

function isInternational(item: RdfItem): boolean {
  const searchable = `${item.title} ${item.department} ${item.university}`.toLowerCase()

  if (INTERNATIONAL_COUNTRY_NAMES.some(country => searchable.includes(country))) {
    return true
  }

  if (INTERNATIONAL_INSTITUTION_PATTERNS.some(pattern => searchable.includes(pattern))) {
    return true
  }

  return false
}

// ─── Adapter Implementation ────────────────────────────────────────────────

function mapToDiscoveredJob(item: RdfItem): DiscoveredJob {
  return {
    source: 'ajo_rss',
    url: item.url,
    title: item.title || 'Untitled',
    company: item.university,
    raw_description: item.description || null,
    canonical_url: canonicalizeUrl(item.url),
    normalized_company: normalizeCompany(item.university),
    indexed_date: new Date().toISOString(),
    source_type: 'academic',
  }
}

export const ajoRssAdapter: JobSourceAdapter = {
  name: 'ajo_rss',

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async discover(_queries: DiscoveryQuery[]): Promise<AdapterResult> {
    const jobs: DiscoveredJob[] = []
    const errors: AdapterError[] = []
    const start = performance.now()

    try {
      const response = await fetch(AJO_FEED_URL, {
        headers: { 'Accept': 'application/rss+xml, application/xml, text/xml' },
      })

      if (!response.ok) {
        throw new Error(`AJO RSS fetch failed: ${response.status}`)
      }

      const xml = await response.text()
      const allItems = parseRdfFeed(xml)
      const relevant = allItems.filter(isRelevant)
      const filteredIntl = relevant.filter(item => isInternational(item))
      const domestic = relevant.filter(item => !isInternational(item))

      for (const item of domestic) {
        jobs.push(mapToDiscoveredJob(item))
      }

      console.log(
        `AJO RSS: ${domestic.length} domestic of ${relevant.length} relevant (${filteredIntl.length} filtered international) of ${allItems.length} total`,
      )
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      errors.push({ adapter: 'ajo_rss', message })
      console.error(`AJO RSS failed: ${message}`)
    }

    const latency = Math.round(performance.now() - start)

    return {
      jobs,
      errors,
      metadata: { request_count: 1, latency_ms: latency },
    }
  },

  async healthCheck(): Promise<HealthCheckResult> {
    const start = performance.now()
    try {
      const response = await fetch(AJO_FEED_URL, {
        headers: { 'Accept': 'application/rss+xml, application/xml, text/xml' },
      })
      const latency = Math.round(performance.now() - start)
      return { healthy: response.ok, latencyMs: latency }
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

// Exported for testing
export { parseRdfFeed, isRelevant, isInternational, RELEVANCE_KEYWORDS, INTERNATIONAL_COUNTRY_NAMES, INTERNATIONAL_INSTITUTION_PATTERNS, AJO_FEED_URL }
export type { RdfItem }
