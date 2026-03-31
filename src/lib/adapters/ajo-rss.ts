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
const RELEVANCE_KEYWORDS = [
  'ocean', 'oceanograph', 'marine',
  'remote sensing', 'satellite', 'earth observation',
  'environment', 'ecology', 'climate',
  'geospatial', 'gis', 'atmospheric',
  'hydrology', 'water resource', 'biogeochem',
  'coastal', 'phytoplankton', 'sea',
  'earth science', 'natural resource',
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
  const searchable = `${item.title} ${item.description} ${item.department} ${item.university}`.toLowerCase()
  return RELEVANCE_KEYWORDS.some(kw => searchable.includes(kw))
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

      for (const item of relevant) {
        jobs.push(mapToDiscoveredJob(item))
      }

      console.log(
        `AJO RSS: ${relevant.length} relevant of ${allItems.length} total items`,
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
export { parseRdfFeed, isRelevant, RELEVANCE_KEYWORDS, AJO_FEED_URL }
export type { RdfItem }
