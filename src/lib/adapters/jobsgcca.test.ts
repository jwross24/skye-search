import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockSearch, mockFindSimilar } = vi.hoisted(() => ({
  mockSearch: vi.fn(),
  mockFindSimilar: vi.fn(),
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
  jobsgccaAdapter,
  CANADA_QUERIES,
  CANADA_FIND_SIMILAR_SEEDS,
  CANADA_GOV_DOMAINS,
  CANADA_ACADEMIC_DOMAINS,
} from './jobsgcca'
import type { DiscoveryQuery } from '@/types/job-source'

const makeExaResult = (overrides: Record<string, unknown> = {}) => ({
  url: 'https://emploisfp-psjobs.cfp-psc.gc.ca/job-1',
  title: 'Environmental Scientist',
  author: null,
  publishedDate: '2026-03-20',
  text: 'A research position in environmental science with the Government of Canada.',
  score: 0.92,
  ...overrides,
})

const govQuery: DiscoveryQuery = {
  keywords: ['environmental scientist research position Canada'],
  domains: CANADA_GOV_DOMAINS,
  source_type: 'government',
}

const academicQuery: DiscoveryQuery = {
  keywords: ['marine biogeochemistry postdoc Canada'],
  domains: CANADA_ACADEMIC_DOMAINS,
  source_type: 'academic',
}

describe('jobsgcca adapter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.EXA_API_KEY = 'test-key-123'

    mockSearch.mockResolvedValue({ results: [makeExaResult()] })
    mockFindSimilar.mockResolvedValue({
      results: [
        makeExaResult({
          url: 'https://www.ocean.dal.ca/postdoc-2',
          title: 'Postdoc in Ocean Science',
        }),
      ],
    })
  })

  it('queries Exa with Canadian government domains', async () => {
    await jobsgccaAdapter.discover([govQuery])

    expect(mockSearch).toHaveBeenCalledWith(
      'environmental scientist research position Canada',
      expect.objectContaining({
        includeDomains: CANADA_GOV_DOMAINS,
        type: 'neural',
        numResults: 10,
      }),
    )
  })

  it('queries Exa with Canadian academic domains', async () => {
    await jobsgccaAdapter.discover([academicQuery])

    expect(mockSearch).toHaveBeenCalledWith(
      'marine biogeochemistry postdoc Canada',
      expect.objectContaining({
        includeDomains: CANADA_ACADEMIC_DOMAINS,
        type: 'neural',
        numResults: 10,
      }),
    )
  })

  it('uses source=jobsgcca for all results', async () => {
    const result = await jobsgccaAdapter.discover([govQuery, academicQuery])

    for (const job of result.jobs) {
      expect(job.source).toBe('jobsgcca')
    }
  })

  it('runs findSimilar on Canadian seed URLs', async () => {
    await jobsgccaAdapter.discover([govQuery])

    expect(mockFindSimilar).toHaveBeenCalledTimes(CANADA_FIND_SIMILAR_SEEDS.length)
    for (const seed of CANADA_FIND_SIMILAR_SEEDS) {
      expect(mockFindSimilar).toHaveBeenCalledWith(seed.url, expect.objectContaining({ numResults: 5 }))
    }
  })

  it('uses userLocation=CA for all search calls', async () => {
    await jobsgccaAdapter.discover([govQuery, academicQuery])

    for (const call of mockSearch.mock.calls) {
      expect(call[1]).toEqual(expect.objectContaining({ userLocation: 'CA' }))
    }
  })

  it('uses userLocation=CA for all findSimilar calls', async () => {
    await jobsgccaAdapter.discover([govQuery])

    for (const call of mockFindSimilar.mock.calls) {
      expect(call[1]).toEqual(expect.objectContaining({ userLocation: 'CA' }))
    }
  })

  it('maps results to DiscoveredJob correctly', async () => {
    const result = await jobsgccaAdapter.discover([govQuery])

    expect(result.jobs.length).toBeGreaterThan(0)
    const job = result.jobs[0]
    expect(job.source).toBe('jobsgcca')
    expect(job.url).toBe('https://emploisfp-psjobs.cfp-psc.gc.ca/job-1')
    expect(job.title).toBe('Environmental Scientist')
    expect(job.canonical_url).toBeTruthy()
    expect(job.normalized_company).toBeTruthy()
    expect(job.source_type).toBe('government')
    expect(job.indexed_date).toBe('2026-03-20')
    expect(job.raw_description).toContain('Government of Canada')
    expect(job.discovery_source_detail).toBe('query:environmental scientist research position Canada')
  })

  it('handles API errors gracefully', async () => {
    mockSearch.mockRejectedValue(new Error('rate limited'))

    const result = await jobsgccaAdapter.discover([govQuery])

    expect(result.errors).toHaveLength(1)
    expect(result.errors[0].adapter).toBe('jobsgcca')
    expect(result.errors[0].message).toBe('rate limited')
    // findSimilar results should still be present
    expect(result.jobs.length).toBeGreaterThan(0)
  })

  it('isolates findSimilar errors without blocking search', async () => {
    mockFindSimilar.mockRejectedValue(new Error('timeout'))

    const result = await jobsgccaAdapter.discover([govQuery])

    // search results should still be present
    expect(result.jobs.filter(j => j.url?.includes('cfp-psc')).length).toBeGreaterThan(0)
    // errors from all failed findSimilar calls
    expect(result.errors.length).toBe(CANADA_FIND_SIMILAR_SEEDS.length)
  })

  it('logs request count and latency', async () => {
    const result = await jobsgccaAdapter.discover([govQuery])

    // 1 search query + 6 findSimilar seeds
    expect(result.metadata.request_count).toBe(1 + CANADA_FIND_SIMILAR_SEEDS.length)
    expect(result.metadata.latency_ms).toBeGreaterThanOrEqual(0)
  })

  it('passes filterEmptyResults to all calls', async () => {
    await jobsgccaAdapter.discover([govQuery])

    for (const call of mockSearch.mock.calls) {
      expect(call[1]).toEqual(expect.objectContaining({ filterEmptyResults: true }))
    }
    for (const call of mockFindSimilar.mock.calls) {
      expect(call[1]).toEqual(expect.objectContaining({ filterEmptyResults: true }))
    }
  })

  it('passes startPublishedDate to search calls', async () => {
    await jobsgccaAdapter.discover([govQuery])

    for (const call of mockSearch.mock.calls) {
      expect(call[1].startPublishedDate).toBeDefined()
      expect(call[1].startPublishedDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
  })

  it('uses 90-day window for academic findSimilar seeds', async () => {
    await jobsgccaAdapter.discover([govQuery])

    const ninetyDaysAgo = new Date()
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
    const expected90 = ninetyDaysAgo.toISOString().split('T')[0]

    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const expected30 = thirtyDaysAgo.toISOString().split('T')[0]

    for (let i = 0; i < CANADA_FIND_SIMILAR_SEEDS.length; i++) {
      const seed = CANADA_FIND_SIMILAR_SEEDS[i]
      const callOpts = mockFindSimilar.mock.calls[i][1]
      if (seed.source_type === 'academic') {
        expect(callOpts.startPublishedDate).toBe(expected90)
      } else {
        expect(callOpts.startPublishedDate).toBe(expected30)
      }
    }
  })

  it('handles missing fields in search results gracefully', async () => {
    mockSearch.mockResolvedValue({
      results: [{ url: 'https://canada.ca/sparse', title: null, publishedDate: null }],
    })

    const result = await jobsgccaAdapter.discover([govQuery])

    const job = result.jobs[0]
    expect(job.title).toBe('Untitled')
    expect(job.raw_description).toBeNull()
  })

  it('throws when EXA_API_KEY is not configured', async () => {
    process.env.EXA_API_KEY = 'your_exa_api_key'

    await expect(jobsgccaAdapter.discover([govQuery])).rejects.toThrow('EXA_API_KEY not configured')
  })

  it('healthCheck returns healthy on success', async () => {
    mockSearch.mockResolvedValue({ results: [makeExaResult()] })

    const health = await jobsgccaAdapter.healthCheck()
    expect(health.healthy).toBe(true)
    expect(health.latencyMs).toBeGreaterThanOrEqual(0)
  })

  it('healthCheck returns unhealthy on failure', async () => {
    mockSearch.mockRejectedValue(new Error('API down'))

    const health = await jobsgccaAdapter.healthCheck()
    expect(health.healthy).toBe(false)
    expect(health.error).toBe('API down')
  })
})

describe('Canadian query presets', () => {
  it('has 8 search queries', () => {
    expect(CANADA_QUERIES.length).toBe(8)
  })

  it('queries cover environmental/ocean/remote sensing/climate domains', () => {
    const all = CANADA_QUERIES.join(' ').toLowerCase()
    expect(all).toContain('environmental')
    expect(all).toContain('ocean')
    expect(all).toContain('remote sensing')
    expect(all).toContain('climate')
    expect(all).toContain('canada')
  })

  it('government domains include key Canadian job sites', () => {
    expect(CANADA_GOV_DOMAINS).toContain('emploisfp-psjobs.cfp-psc.gc.ca')
    expect(CANADA_GOV_DOMAINS).toContain('jobbank.gc.ca')
    expect(CANADA_GOV_DOMAINS).toContain('canada.ca')
    expect(CANADA_GOV_DOMAINS).toContain('nrc-cnrc.gc.ca')
  })

  it('academic domains include major Canadian universities', () => {
    expect(CANADA_ACADEMIC_DOMAINS).toContain('ubc.ca')
    expect(CANADA_ACADEMIC_DOMAINS).toContain('dal.ca')
    expect(CANADA_ACADEMIC_DOMAINS).toContain('uvic.ca')
    expect(CANADA_ACADEMIC_DOMAINS).toContain('mcgill.ca')
    expect(CANADA_ACADEMIC_DOMAINS).toContain('mun.ca')
  })

  it('findSimilar seeds include Canadian cap-exempt employers', () => {
    const all = CANADA_FIND_SIMILAR_SEEDS.map(s => s.url).join(' ').toLowerCase()
    expect(all).toContain('dfo-mpo.gc.ca')
    expect(all).toContain('environment-climate-change')
    expect(all).toContain('nrc.canada.ca')
    expect(all).toContain('hakai.org')
    expect(all).toContain('dal.ca')
    expect(all).toContain('uvic.ca')
  })

  it('findSimilar seeds have correct source_type', () => {
    const govSeeds = CANADA_FIND_SIMILAR_SEEDS.filter(s => s.source_type === 'government')
    const academicSeeds = CANADA_FIND_SIMILAR_SEEDS.filter(s => s.source_type === 'academic')
    expect(govSeeds.length).toBe(3)
    expect(academicSeeds.length).toBe(3)
  })
})
