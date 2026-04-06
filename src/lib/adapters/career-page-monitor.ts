/**
 * Career Page Monitor adapter — scrapes static-HTML career pages of cap-exempt
 * employers (universities, nonprofits, national labs) that don't reliably cross-post
 * to aggregators.
 *
 * For Skye: these employers are high-priority H-1B cap-exempt sponsors — discovering
 * their postings via direct scrape cuts latency from ~7-14 days (Exa crawl) to ~24 hours.
 *
 * Only static-HTML employers are included. JS-rendered pages (Workday, Lever, Greenhouse
 * SPA shells) were tested and excluded — Cheerio cannot parse them.
 *
 * Tested and EXCLUDED:
 *   - WHOI (careers.whoi.edu)          → Workday SPA (32 lines, JS-rendered)
 *   - CIRES (cires.colorado.edu)        → Next.js SPA (empty HTML body)
 *   - JCET (jcet.umbc.edu)              → 404 on all tested paths
 *   - CIRA (cira.colostate.edu)         → WordPress but listings on different UW HR site
 *   - SSAI (ssaihq.com)                 → Next.js SPA
 *   - Battelle (battelle.org)           → 403 Forbidden
 *   - NEAQ (neaq.org)                   → WordPress but no static listings found
 *   - IBSS (ibsscorp.com)               → Divi/WordPress with no parseable job list
 */

import * as cheerio from 'cheerio'
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

// ─── Configuration ─────────────────────────────────────────────────────────

export interface CareerPageConfig {
  /** Short slug for discovery_source_detail, e.g. "woodwell" */
  key: string
  /** Display name for normalized_company */
  employer_name: string
  /** Career page URL to scrape */
  url: string
  /** CSS selector for repeating job listing containers */
  css_selector: string
  /** Optional child selector for title (default: first heading or the element text) */
  title_selector?: string
  /** Optional child selector for link href (default: first a[href]) */
  link_selector?: string
  source_type: 'academic' | 'industry' | 'government'
}

export const CAREER_PAGES: CareerPageConfig[] = [
  {
    // WordPress page listing jobs as <li> elements with ADP links.
    // Selector targets li elements inside the content div that contain anchor links.
    // Only li elements directly wrapping an <a> (no children aside from the link) match.
    key: 'woodwell',
    employer_name: 'Woodwell Climate Research Center',
    url: 'https://www.woodwellclimate.org/careers/',
    // The job list is a <ul> containing <li><a href="...">Title</a></li>
    // located inside div.text-content. Nav menu li's have deeper children — exclude with :has(>a).
    css_selector: 'div.text-content ul li:has(> a)',
    title_selector: 'a',
    link_selector: 'a',
    source_type: 'academic',
  },
  {
    // MBARI WordPress site with article.list-item--job-opening blocks.
    // Each article has an a.list-item__link wrapping the full card.
    // Title is in h1.list-item__title (or falls back to h2 inside the article).
    key: 'mbari',
    employer_name: 'Monterey Bay Aquarium Research Institute (MBARI)',
    url: 'https://www.mbari.org/about/careers/job-openings/',
    css_selector: 'article.list-item--job-opening',
    title_selector: 'h1.list-item__title',
    link_selector: 'a.list-item__link',
    source_type: 'academic',
  },
  {
    // Smithsonian SERC Drupal site. Job listings are in a.views-row > span > a wrappers.
    // The job title is in h3.opportunity-title inside the anchor.
    key: 'serc',
    employer_name: 'Smithsonian Environmental Research Center',
    url: 'https://serc.si.edu/get-involved/job-opportunities',
    css_selector: 'div.item-list li',
    title_selector: 'h3.opportunity-title',
    link_selector: 'a',
    source_type: 'academic',
  },
  {
    // GMRI WordPress-like site. Jobs are in ul.list-unstyled > li.border-top blocks.
    // Title is h2 inside the li. Link is a.btn.btn-outline-secondary.
    key: 'gmri',
    employer_name: 'Gulf of Maine Research Institute',
    url: 'https://www.gmri.org/join-community/jobs-internships/',
    css_selector: 'ul.list-unstyled li.border-top',
    title_selector: 'h2',
    link_selector: 'a.btn',
    source_type: 'academic',
  },
]

// ─── Scraper ───────────────────────────────────────────────────────────────

export async function scrapeEmployer(config: CareerPageConfig): Promise<DiscoveredJob[]> {
  const response = await fetch(config.url, {
    headers: {
      'User-Agent': 'SkyeSearchBot/1.0 (+https://skye-search.vercel.app)',
      'Accept': 'text/html,application/xhtml+xml',
    },
    signal: AbortSignal.timeout(10000),
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} fetching ${config.url}`)
  }

  const html = await response.text()
  return parseHtml(html, config)
}

export function parseHtml(html: string, config: CareerPageConfig): DiscoveredJob[] {
  const $ = cheerio.load(html)
  const jobs: DiscoveredJob[] = []
  const seenUrls = new Set<string>()

  const elements = $(config.css_selector)

  if (elements.length === 0) {
    console.warn(
      `CareerPageMonitor: CSS selector may have changed for ${config.key} (0 matches on "${config.css_selector}")`,
    )
    return []
  }

  elements.each((_, el) => {
    const $el = $(el)

    // Extract title
    let title = ''
    if (config.title_selector) {
      title = $el.find(config.title_selector).first().text().trim()
    }
    if (!title) {
      title = $el.find('a').first().text().trim()
    }
    if (!title) {
      title = $el.text().trim().split('\n')[0].trim()
    }
    if (!title) return

    // Extract link
    let href = ''
    if (config.link_selector) {
      href = $el.find(config.link_selector).first().attr('href') ?? ''
      // Also check if the element itself is the link selector
      if (!href) {
        href = $el.filter(config.link_selector).attr('href') ?? ''
      }
    }
    if (!href) {
      href = $el.find('a[href]').first().attr('href') ?? ''
    }
    if (!href) return

    // Resolve relative URLs
    const absoluteUrl = new URL(href, config.url).href

    // Deduplicate within this run
    const canonical = canonicalizeUrl(absoluteUrl)
    if (!canonical) return
    if (seenUrls.has(canonical)) return
    seenUrls.add(canonical)

    jobs.push({
      source: 'career_page_monitor',
      url: absoluteUrl,
      title,
      company: config.employer_name,
      raw_description: null,
      canonical_url: canonical,
      normalized_company: normalizeCompany(config.employer_name),
      indexed_date: new Date().toISOString(),
      source_type: config.source_type,
      discovery_source_detail: `career_page:${config.key}`,
    })
  })

  return jobs
}

// ─── Adapter Implementation ────────────────────────────────────────────────

export const careerPageMonitorAdapter: JobSourceAdapter = {
  name: 'career_page_monitor',

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async discover(_queries: DiscoveryQuery[]): Promise<AdapterResult> {
    const jobs: DiscoveredJob[] = []
    const errors: AdapterError[] = []
    const start = performance.now()

    for (const config of CAREER_PAGES) {
      try {
        const employerJobs = await scrapeEmployer(config)
        jobs.push(...employerJobs)
        console.log(`CareerPageMonitor: ${config.employer_name} → ${employerJobs.length} listings`)
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        errors.push({ adapter: `career_page:${config.key}`, message })
        console.error(`CareerPageMonitor ${config.key} failed: ${message}`)
        // Continue to next employer — per-employer isolation
      }

      // Politeness: 1s delay between employers
      await new Promise(r => setTimeout(r, 1000))
    }

    return {
      jobs,
      errors,
      metadata: {
        request_count: CAREER_PAGES.length,
        latency_ms: Math.round(performance.now() - start),
      },
    }
  },

  async healthCheck(): Promise<HealthCheckResult> {
    // Use GMRI as canary — lightweight page, reliable uptime
    const canary = CAREER_PAGES.find(p => p.key === 'gmri') ?? CAREER_PAGES[0]
    const start = performance.now()
    try {
      const response = await fetch(canary.url, {
        headers: { 'User-Agent': 'SkyeSearchBot/1.0 (+https://skye-search.vercel.app)' },
        signal: AbortSignal.timeout(5000),
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

export { parseHtml as parseCareerPage }
