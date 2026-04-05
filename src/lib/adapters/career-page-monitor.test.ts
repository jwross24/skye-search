import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import { readFileSync } from 'fs'
import path from 'path'
import { parseHtml, CAREER_PAGES } from './career-page-monitor'
import type { CareerPageConfig } from './career-page-monitor'

// ─── Fixture loader ────────────────────────────────────────────────────────

const fixturesDir = path.resolve(__dirname, '__fixtures__/career-pages')

function loadFixture(key: string): string {
  return readFileSync(path.join(fixturesDir, `${key}.html`), 'utf8')
}

// ─── Per-employer fixture tests ────────────────────────────────────────────

describe('parseHtml: woodwell fixture', () => {
  let html: string
  const config = CAREER_PAGES.find(p => p.key === 'woodwell')!

  beforeAll(() => { html = loadFixture('woodwell') })

  it('extracts at least 10 job listings (4 full-time + 6 interns; 1 commented-out in fixture)', () => {
    const jobs = parseHtml(html, config)
    expect(jobs.length).toBeGreaterThanOrEqual(10)
  })

  it('returns non-empty title for every job', () => {
    const jobs = parseHtml(html, config)
    for (const job of jobs) {
      expect(job.title.length).toBeGreaterThan(0)
    }
  })

  it('resolves absolute URLs from ADP base URLs', () => {
    const jobs = parseHtml(html, config)
    for (const job of jobs) {
      expect(job.url).toMatch(/^https?:\/\//)
    }
  })

  it('sets discovery_source_detail to career_page:woodwell', () => {
    const jobs = parseHtml(html, config)
    expect(jobs.every(j => j.discovery_source_detail === 'career_page:woodwell')).toBe(true)
  })

  it('sets source to career_page_monitor', () => {
    const jobs = parseHtml(html, config)
    expect(jobs.every(j => j.source === 'career_page_monitor')).toBe(true)
  })
})

describe('parseHtml: mbari fixture', () => {
  let html: string
  const config = CAREER_PAGES.find(p => p.key === 'mbari')!

  beforeAll(() => { html = loadFixture('mbari') })

  it('extracts at least 15 job listings (15 articles in fixture)', () => {
    const jobs = parseHtml(html, config)
    expect(jobs.length).toBeGreaterThanOrEqual(15)
  })

  it('returns non-empty title for every job', () => {
    const jobs = parseHtml(html, config)
    for (const job of jobs) {
      expect(job.title.length).toBeGreaterThan(0)
    }
  })

  it('returns absolute MBARI URLs', () => {
    const jobs = parseHtml(html, config)
    for (const job of jobs) {
      expect(job.url).toMatch(/^https:\/\/www\.mbari\.org/)
    }
  })

  it('sets discovery_source_detail to career_page:mbari', () => {
    const jobs = parseHtml(html, config)
    expect(jobs.every(j => j.discovery_source_detail === 'career_page:mbari')).toBe(true)
  })
})

describe('parseHtml: serc fixture', () => {
  let html: string
  const config = CAREER_PAGES.find(p => p.key === 'serc')!

  beforeAll(() => { html = loadFixture('serc') })

  it('extracts at least 1 job listing (1 listing in fixture snapshot)', () => {
    const jobs = parseHtml(html, config)
    expect(jobs.length).toBeGreaterThanOrEqual(1)
  })

  it('returns non-empty title for every job', () => {
    const jobs = parseHtml(html, config)
    for (const job of jobs) {
      expect(job.title.length).toBeGreaterThan(0)
    }
  })

  it('returns absolute SERC URLs', () => {
    const jobs = parseHtml(html, config)
    for (const job of jobs) {
      expect(job.url).toMatch(/^https?:\/\/serc\.si\.edu/)
    }
  })

  it('sets discovery_source_detail to career_page:serc', () => {
    const jobs = parseHtml(html, config)
    expect(jobs.every(j => j.discovery_source_detail === 'career_page:serc')).toBe(true)
  })
})

describe('parseHtml: gmri fixture', () => {
  let html: string
  const config = CAREER_PAGES.find(p => p.key === 'gmri')!

  beforeAll(() => { html = loadFixture('gmri') })

  it('extracts at least 2 job listings (2 li.border-top in fixture)', () => {
    const jobs = parseHtml(html, config)
    expect(jobs.length).toBeGreaterThanOrEqual(2)
  })

  it('returns non-empty title for every job', () => {
    const jobs = parseHtml(html, config)
    for (const job of jobs) {
      expect(job.title.length).toBeGreaterThan(0)
    }
  })

  it('returns absolute URLs', () => {
    const jobs = parseHtml(html, config)
    for (const job of jobs) {
      expect(job.url).toMatch(/^https?:\/\//)
    }
  })

  it('sets discovery_source_detail to career_page:gmri', () => {
    const jobs = parseHtml(html, config)
    expect(jobs.every(j => j.discovery_source_detail === 'career_page:gmri')).toBe(true)
  })
})

// ─── Shared adapter tests ──────────────────────────────────────────────────

describe('parseHtml: error handling', () => {
  const mockConfig: CareerPageConfig = {
    key: 'test',
    employer_name: 'Test Org',
    url: 'https://example.org/careers/',
    css_selector: '.job-listing',
    title_selector: 'h2',
    link_selector: 'a',
    source_type: 'academic',
  }

  it('returns empty array when CSS selector matches 0 elements', () => {
    const html = '<html><body><div class="other">No jobs here</div></body></html>'
    const jobs = parseHtml(html, mockConfig)
    expect(jobs).toEqual([])
  })

  it('handles malformed HTML without throwing', () => {
    const html = '<broken<html><head></hEAD><body><div class="job-listing"><h2>Job</h2><a href="/job/1">Apply</a></div>'
    expect(() => parseHtml(html, mockConfig)).not.toThrow()
  })

  it('deduplicates jobs with the same canonical URL within a single parse', () => {
    const html = `
      <html><body>
        <div class="job-listing"><h2>Research Scientist</h2><a href="https://example.org/job/1">Apply</a></div>
        <div class="job-listing"><h2>Research Scientist</h2><a href="https://example.org/job/1">Apply</a></div>
      </body></html>
    `
    const jobs = parseHtml(html, mockConfig)
    expect(jobs).toHaveLength(1)
  })

  it('resolves relative URLs against employer base URL', () => {
    const html = `
      <html><body>
        <div class="job-listing"><h2>Research Scientist</h2><a href="/jobs/123">Apply</a></div>
      </body></html>
    `
    const jobs = parseHtml(html, mockConfig)
    expect(jobs[0].url).toBe('https://example.org/jobs/123')
  })

  it('skips elements without a valid href', () => {
    const html = `
      <html><body>
        <div class="job-listing"><h2>Ghost Job</h2></div>
        <div class="job-listing"><h2>Real Job</h2><a href="https://example.org/real">Apply</a></div>
      </body></html>
    `
    const jobs = parseHtml(html, mockConfig)
    expect(jobs).toHaveLength(1)
    expect(jobs[0].title).toBe('Real Job')
  })

  it('sets source_type from config', () => {
    const html = `
      <html><body>
        <div class="job-listing"><h2>Researcher</h2><a href="https://example.org/r1">Apply</a></div>
      </body></html>
    `
    const govConfig = { ...mockConfig, source_type: 'government' as const }
    const jobs = parseHtml(html, govConfig)
    expect(jobs[0].source_type).toBe('government')
  })
})

// ─── Adapter discover: per-employer error isolation ──────────────────────

describe('careerPageMonitorAdapter.discover: error isolation', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('collects successful employers even when one employer throws', async () => {
    // First employer (woodwell) throws; remaining employers succeed.
    // Verifies the try/catch in the for-loop isolates per-employer failures.
    let callCount = 0
    vi.spyOn(global, 'fetch').mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        // Woodwell fails
        return Promise.reject(new Error('ECONNREFUSED'))
      }
      // All others succeed with a minimal job listing
      const html = `<html><body>
        <article class="list-item list-item--job-opening">
          <a class="list-item__link" href="https://www.mbari.org/job-opening/test-job/">
            <h1 class="list-item__title">Test Job</h1>
          </a>
        </article>
      </body></html>`
      return Promise.resolve(new Response(html, { status: 200 }))
    })

    const { careerPageMonitorAdapter } = await import('./career-page-monitor')
    const result = await careerPageMonitorAdapter.discover([])

    // Should have exactly 1 error (woodwell)
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0].adapter).toBe('career_page:woodwell')

    // Should still have jobs from the other 3 employers
    expect(result.jobs.length).toBeGreaterThan(0)
  })
})

// ─── Scraper error handling (mock fetch) ──────────────────────────────────

describe('scrapeEmployer: network error handling', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('throws on HTTP 404 response', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response('Not Found', { status: 404 }),
    )
    const { scrapeEmployer } = await import('./career-page-monitor')
    const config = CAREER_PAGES[0]
    await expect(scrapeEmployer(config)).rejects.toThrow('HTTP 404')
  })

  it('throws on network timeout (AbortError)', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValueOnce(
      Object.assign(new Error('The operation was aborted'), { name: 'AbortError' }),
    )
    const { scrapeEmployer } = await import('./career-page-monitor')
    const config = CAREER_PAGES[0]
    await expect(scrapeEmployer(config)).rejects.toThrow()
  })
})

// ─── Config integrity ─────────────────────────────────────────────────────

describe('CAREER_PAGES config', () => {
  it('has at least 4 employers', () => {
    expect(CAREER_PAGES.length).toBeGreaterThanOrEqual(4)
  })

  it('all keys are unique', () => {
    const keys = CAREER_PAGES.map(p => p.key)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('all URLs are https', () => {
    for (const config of CAREER_PAGES) {
      expect(config.url).toMatch(/^https:\/\//)
    }
  })

  it('all source_types are valid', () => {
    const valid = ['academic', 'industry', 'government']
    for (const config of CAREER_PAGES) {
      expect(valid).toContain(config.source_type)
    }
  })
})
