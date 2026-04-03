import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockSearch, mockFindSimilar } = vi.hoisted(() => ({
  mockSearch: vi.fn(),  // maps to searchAndContents
  mockFindSimilar: vi.fn(),  // maps to findSimilarAndContents
}))

vi.mock('exa-js', () => {
  return {
    default: class ExaMock {
      search = mockSearch
      searchAndContents = mockSearch
      findSimilar = mockFindSimilar
      findSimilarAndContents = mockFindSimilar
    },
  }
})

import {
  exaAdapter,
  ACADEMIC_QUERIES,
  INDUSTRY_QUERIES,
  FIND_SIMILAR_SEEDS,
  ACADEMIC_JOB_DOMAINS,
} from './exa'
import type { DiscoveryQuery } from '@/types/job-source'

const makeExaResult = (overrides: Record<string, unknown> = {}) => ({
  url: 'https://example.com/job-1',
  title: 'Research Scientist',
  author: null,
  publishedDate: '2026-03-15',
  text: 'A research position in ocean science.',
  score: 0.95,
  ...overrides,
})

const academicQuery: DiscoveryQuery = {
  keywords: ['ocean color remote sensing'],
  domains: ['academicjobsonline.org'],
  source_type: 'academic',
}

const industryQuery: DiscoveryQuery = {
  keywords: ['satellite data pipeline engineer'],
  source_type: 'industry',
}

describe('Exa adapter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.EXA_API_KEY = 'test-key-123'

    mockSearch.mockResolvedValue({ results: [makeExaResult()] })
    mockFindSimilar.mockResolvedValue({
      results: [
        makeExaResult({
          url: 'https://cires.colorado.edu/job-2',
          title: 'Postdoc in Earth Science',
        }),
      ],
    })
  })

  it('maps Exa search results to DiscoveredJob format', async () => {
    const result = await exaAdapter.discover([academicQuery])

    expect(result.jobs.length).toBeGreaterThan(0)
    const job = result.jobs[0]
    expect(job.source).toBe('exa')
    expect(job.url).toBe('https://example.com/job-1')
    expect(job.title).toBe('Research Scientist')
    expect(job.canonical_url).toBeTruthy()
    expect(job.normalized_company).toBeTruthy()
    expect(job.source_type).toBe('academic')
    expect(job.indexed_date).toBe('2026-03-15')
  })

  it('passes includeDomains from query to Exa search', async () => {
    await exaAdapter.discover([academicQuery])

    expect(mockSearch).toHaveBeenCalledWith('ocean color remote sensing', expect.objectContaining({
      includeDomains: ['academicjobsonline.org'],
      type: 'neural',
      numResults: 10,
    }))
  })

  it('omits includeDomains when query has none', async () => {
    await exaAdapter.discover([industryQuery])

    expect(mockSearch).toHaveBeenCalledWith(
      'satellite data pipeline engineer',
      expect.objectContaining({
        includeDomains: undefined,
      }),
    )
  })

  it('passes userLocation US to all searchAndContents calls', async () => {
    await exaAdapter.discover([academicQuery, industryQuery])

    for (const call of mockSearch.mock.calls) {
      expect(call[1]).toEqual(expect.objectContaining({ userLocation: 'US' }))
    }
  })

  it('passes filterEmptyResults to all searchAndContents calls', async () => {
    await exaAdapter.discover([academicQuery, industryQuery])

    for (const call of mockSearch.mock.calls) {
      expect(call[1]).toEqual(expect.objectContaining({ filterEmptyResults: true }))
    }
  })

  it('includes includeText for industry queries (no domains)', async () => {
    await exaAdapter.discover([industryQuery])

    expect(mockSearch).toHaveBeenCalledWith(
      'satellite data pipeline engineer',
      expect.objectContaining({ includeText: ['apply'] }),
    )
  })

  it('does NOT include includeText for academic queries (has domains)', async () => {
    await exaAdapter.discover([academicQuery])

    expect(mockSearch).toHaveBeenCalledWith(
      'ocean color remote sensing',
      expect.objectContaining({ includeText: undefined }),
    )
  })

  it('runs findSimilar on all seed URLs', async () => {
    await exaAdapter.discover([academicQuery])

    expect(mockFindSimilar).toHaveBeenCalledTimes(FIND_SIMILAR_SEEDS.length)
    for (const seed of FIND_SIMILAR_SEEDS) {
      expect(mockFindSimilar).toHaveBeenCalledWith(seed.url, expect.objectContaining({ numResults: 5 }))
    }
  })

  it('passes userLocation US to all findSimilarAndContents calls', async () => {
    await exaAdapter.discover([academicQuery])

    for (const call of mockFindSimilar.mock.calls) {
      expect(call[1]).toEqual(expect.objectContaining({ userLocation: 'US' }))
    }
  })

  it('passes filterEmptyResults to all findSimilarAndContents calls', async () => {
    await exaAdapter.discover([academicQuery])

    for (const call of mockFindSimilar.mock.calls) {
      expect(call[1]).toEqual(expect.objectContaining({ filterEmptyResults: true }))
    }
  })

  it('passes startPublishedDate to findSimilarAndContents calls', async () => {
    await exaAdapter.discover([academicQuery])

    for (const call of mockFindSimilar.mock.calls) {
      expect(call[1].startPublishedDate).toBeDefined()
      // Date format: YYYY-MM-DD
      expect(call[1].startPublishedDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
  })

  it('uses 90-day window for academic findSimilar seeds', async () => {
    await exaAdapter.discover([academicQuery])

    const ninetyDaysAgo = new Date()
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
    const expected90 = ninetyDaysAgo.toISOString().split('T')[0]

    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const expected30 = thirtyDaysAgo.toISOString().split('T')[0]

    for (let i = 0; i < FIND_SIMILAR_SEEDS.length; i++) {
      const seed = FIND_SIMILAR_SEEDS[i]
      const callOpts = mockFindSimilar.mock.calls[i][1]
      if (seed.source_type === 'academic') {
        expect(callOpts.startPublishedDate).toBe(expected90)
      } else {
        expect(callOpts.startPublishedDate).toBe(expected30)
      }
    }
  })

  it('maps findSimilar results as academic source_type', async () => {
    const result = await exaAdapter.discover([academicQuery])

    const similarJob = result.jobs.find(j => j.url?.includes('cires'))
    expect(similarJob).toBeDefined()
    expect(similarJob!.source_type).toBe('academic')
  })

  it('tracks request count in metadata', async () => {
    const result = await exaAdapter.discover([academicQuery, industryQuery])

    // 2 search queries + 8 findSimilar seeds
    expect(result.metadata.request_count).toBe(2 + FIND_SIMILAR_SEEDS.length)
  })

  it('isolates search errors without blocking findSimilar', async () => {
    mockSearch.mockRejectedValue(new Error('rate limited'))

    const result = await exaAdapter.discover([academicQuery])

    expect(result.errors).toHaveLength(1)
    expect(result.errors[0].message).toBe('rate limited')
    // findSimilar results should still be present
    expect(result.jobs.length).toBeGreaterThan(0)
  })

  it('isolates findSimilar errors without blocking search', async () => {
    mockFindSimilar.mockRejectedValue(new Error('timeout'))

    const result = await exaAdapter.discover([academicQuery])

    // search results should still be present
    const searchJobs = result.jobs.filter(j => j.url?.includes('example.com'))
    expect(searchJobs.length).toBeGreaterThan(0)
    // errors from all failed findSimilar calls
    expect(result.errors.length).toBe(FIND_SIMILAR_SEEDS.length)
  })

  it('throws when EXA_API_KEY is not configured', async () => {
    process.env.EXA_API_KEY = 'your_exa_api_key'

    await expect(exaAdapter.discover([academicQuery])).rejects.toThrow('EXA_API_KEY not configured')
  })

  it('handles missing fields in search results gracefully', async () => {
    mockSearch.mockResolvedValue({
      results: [{ url: 'https://example.com/sparse', title: null, publishedDate: null }],
    })

    const result = await exaAdapter.discover([academicQuery])

    const job = result.jobs[0]
    expect(job.title).toBe('Untitled')
    expect(job.raw_description).toBeNull()
  })

  it('healthCheck returns healthy on success', async () => {
    mockSearch.mockResolvedValue({ results: [makeExaResult()] })

    const health = await exaAdapter.healthCheck()
    expect(health.healthy).toBe(true)
    expect(health.latencyMs).toBeGreaterThanOrEqual(0)
  })

  it('healthCheck returns unhealthy on failure', async () => {
    mockSearch.mockRejectedValue(new Error('API down'))

    const health = await exaAdapter.healthCheck()
    expect(health.healthy).toBe(false)
    expect(health.error).toBe('API down')
  })
})

describe('Query presets', () => {
  it('has ~8 academic and ~7 industry queries', () => {
    expect(ACADEMIC_QUERIES.length).toBeGreaterThanOrEqual(7)
    expect(ACADEMIC_QUERIES.length).toBeLessThanOrEqual(10)
    expect(INDUSTRY_QUERIES.length).toBeGreaterThanOrEqual(6)
    expect(INDUSTRY_QUERIES.length).toBeLessThanOrEqual(8)
  })

  it('academic queries cover ocean/remote sensing/bio domains', () => {
    const all = ACADEMIC_QUERIES.join(' ').toLowerCase()
    expect(all).toContain('ocean')
    expect(all).toContain('remote sensing')
  })

  it('industry queries cover geospatial/satellite/data domains', () => {
    const all = INDUSTRY_QUERIES.join(' ').toLowerCase()
    expect(all).toContain('satellite')
    expect(all).toContain('geospatial')
  })

  it('findSimilar seeds include key cap-exempt employers', () => {
    const all = FIND_SIMILAR_SEEDS.map(s => s.url).join(' ').toLowerCase()
    expect(all).toContain('whoi')
    expect(all).toContain('nasa')
    expect(all).toContain('cires')
    expect(all).toContain('noaa')
    expect(all).toContain('ucar')
    expect(all).toContain('pnnl')
  })

  it('findSimilar seeds do not contain specific job posting URLs', () => {
    for (const seed of FIND_SIMILAR_SEEDS) {
      expect(seed.url, `${seed.url} looks like a specific posting`).not.toContain('JobCode=')
      expect(seed.url, `${seed.url} looks like a specific posting`).not.toContain('details.cfm')
    }
  })

  it('academic job domains include major boards', () => {
    expect(ACADEMIC_JOB_DOMAINS).toContain('academicjobsonline.org')
    expect(ACADEMIC_JOB_DOMAINS).toContain('sciencecareers.org')
  })
})
