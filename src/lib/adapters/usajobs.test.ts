import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { DiscoveryQuery } from '@/types/job-source'
import {
  usajobsAdapter,
  mapUSAJobsItem,
  formatSalary,
  formatLocation,
  USAJOBS_QUERIES,
  type USAJobsItem,
} from './usajobs'

// ─── Fixture factory ────────────────────────────────────────────────────────

function makeUSAJobsItem(overrides: Partial<USAJobsItem['MatchedObjectDescriptor']> = {}): USAJobsItem {
  return {
    MatchedObjectId: '123456',
    MatchedObjectDescriptor: {
      PositionID: 'POS-123',
      PositionTitle: 'Environmental Scientist',
      PositionURI: 'https://www.usajobs.gov/job/123456',
      ApplyURI: ['https://www.usajobs.gov/apply/123456'],
      PositionLocationDisplay: 'Washington, DC',
      PositionLocation: [
        {
          LocationName: 'Washington, District of Columbia',
          CountryCode: 'US',
          CountrySubDivisionCode: 'DC',
          CityName: 'Washington',
          Longitude: -77.03,
          Latitude: 38.89,
        },
      ],
      OrganizationName: 'National Oceanic and Atmospheric Administration',
      DepartmentName: 'Department of Commerce',
      JobCategory: [{ Name: 'Environmental Science', Code: '0401' }],
      JobGrade: [{ Code: 'GS' }],
      PositionSchedule: [{ Name: 'Full-Time', Code: '1' }],
      PositionOfferingType: [{ Name: 'Permanent', Code: '15317' }],
      QualificationSummary: 'Must have PhD in environmental science or related field.',
      PositionRemuneration: [
        { MinimumRange: '90000', MaximumRange: '120000', RateIntervalCode: 'PA' },
      ],
      PositionStartDate: '2026-03-01T00:00:00Z',
      PositionEndDate: '2026-04-30T00:00:00Z',
      ApplicationCloseDate: '2026-04-15T00:00:00Z',
      PublicationStartDate: '2026-03-01T00:00:00Z',
      UserArea: {
        Details: {
          MajorDuties: [
            'Conduct ocean remote sensing research',
            'Analyze satellite imagery data',
          ],
          Education: 'PhD required',
          Requirements: 'US Citizenship',
          KeyRequirements: ['PhD in Environmental Science'],
          TeleworkEligible: 'True',
          SecurityClearance: 'Not Required',
        },
      },
      ...overrides,
    },
  }
}

function makeUSAJobsResponse(items: USAJobsItem[] = [makeUSAJobsItem()]) {
  return {
    SearchResult: {
      SearchResultCount: items.length,
      SearchResultCountAll: items.length + 5,
      SearchResultItems: items,
    },
  }
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('mapUSAJobsItem', () => {
  it('maps all DiscoveredJob fields correctly', () => {
    const item = makeUSAJobsItem()
    const job = mapUSAJobsItem(item)

    expect(job.source).toBe('usajobs')
    expect(job.url).toBe('https://www.usajobs.gov/job/123456')
    expect(job.title).toBe('Environmental Scientist')
    expect(job.company).toBe('National Oceanic and Atmospheric Administration')
    expect(job.source_type).toBe('government')
    expect(job.indexed_date).toBe('2026-03-01T00:00:00Z')
  })

  it('sets source_type to government', () => {
    const job = mapUSAJobsItem(makeUSAJobsItem())
    expect(job.source_type).toBe('government')
  })

  it('maps structured_deadline from ApplicationCloseDate', () => {
    const job = mapUSAJobsItem(makeUSAJobsItem())
    expect(job.structured_deadline).toBe('2026-04-15T00:00:00Z')
  })

  it('falls back to PositionEndDate when ApplicationCloseDate missing', () => {
    const job = mapUSAJobsItem(
      makeUSAJobsItem({ ApplicationCloseDate: '', PositionEndDate: '2026-05-01' }),
    )
    expect(job.structured_deadline).toBe('2026-05-01')
  })

  it('maps structured_salary from PositionRemuneration', () => {
    const job = mapUSAJobsItem(makeUSAJobsItem())
    expect(job.structured_salary).toBe('$90,000 - $120,000/yr')
  })

  it('maps structured_location from PositionLocationDisplay', () => {
    const job = mapUSAJobsItem(makeUSAJobsItem())
    expect(job.structured_location).toBe('Washington, DC')
  })

  it('builds raw_description from QualificationSummary + MajorDuties', () => {
    const job = mapUSAJobsItem(makeUSAJobsItem())
    expect(job.raw_description).toContain('Must have PhD in environmental science')
    expect(job.raw_description).toContain('Conduct ocean remote sensing research')
    expect(job.raw_description).toContain('Analyze satellite imagery data')
  })

  it('canonicalizes URL', () => {
    const job = mapUSAJobsItem(
      makeUSAJobsItem({
        PositionURI: 'http://www.usajobs.gov/job/123456?utm_source=test',
      }),
    )
    expect(job.canonical_url).toBe('https://usajobs.gov/job/123456')
  })

  it('normalizes company name', () => {
    const job = mapUSAJobsItem(makeUSAJobsItem())
    expect(job.normalized_company).toBe('national oceanic and atmospheric administration')
  })

  it('falls back to DepartmentName when OrganizationName empty', () => {
    const job = mapUSAJobsItem(
      makeUSAJobsItem({ OrganizationName: '', DepartmentName: 'Department of Interior' }),
    )
    expect(job.company).toBe('Department of Interior')
  })

  it('handles missing MajorDuties gracefully', () => {
    const job = mapUSAJobsItem(
      makeUSAJobsItem({
        UserArea: { Details: {} },
      }),
    )
    expect(job.raw_description).toBe('Must have PhD in environmental science or related field.')
  })

  it('handles completely empty UserArea', () => {
    const item = makeUSAJobsItem()
    // @ts-expect-error - testing runtime edge case
    item.MatchedObjectDescriptor.UserArea = undefined
    const job = mapUSAJobsItem(item)
    expect(job.raw_description).toBeTruthy()
  })
})

describe('formatSalary', () => {
  it('formats annual salary range', () => {
    const result = formatSalary([
      { MinimumRange: '90000', MaximumRange: '120000', RateIntervalCode: 'PA' },
    ])
    expect(result).toBe('$90,000 - $120,000/yr')
  })

  it('formats hourly salary range', () => {
    const result = formatSalary([
      { MinimumRange: '35', MaximumRange: '55', RateIntervalCode: 'PH' },
    ])
    expect(result).toBe('$35 - $55/hr')
  })

  it('formats min-only salary', () => {
    const result = formatSalary([
      { MinimumRange: '80000', MaximumRange: '', RateIntervalCode: 'PA' },
    ])
    expect(result).toBe('$80,000+/yr')
  })

  it('returns null for empty remuneration', () => {
    expect(formatSalary([])).toBeNull()
  })

  it('returns null for undefined remuneration', () => {
    expect(formatSalary(undefined as unknown as USAJobsItem['MatchedObjectDescriptor']['PositionRemuneration'])).toBeNull()
  })
})

describe('formatLocation', () => {
  it('joins multiple locations with semicolons', () => {
    const result = formatLocation([
      { LocationName: 'Washington, DC' },
      { LocationName: 'Silver Spring, MD' },
    ])
    expect(result).toBe('Washington, DC; Silver Spring, MD')
  })

  it('returns single location', () => {
    const result = formatLocation([{ LocationName: 'Boulder, CO' }])
    expect(result).toBe('Boulder, CO')
  })

  it('returns null for empty array', () => {
    expect(formatLocation([])).toBeNull()
  })

  it('returns null for undefined', () => {
    expect(formatLocation(undefined as unknown as USAJobsItem['MatchedObjectDescriptor']['PositionLocation'])).toBeNull()
  })
})

describe('usajobsAdapter.discover', () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    process.env.USAJOBS_API_KEY = 'test-api-key'
    process.env.USAJOBS_USER_AGENT = 'test@example.com'
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    delete process.env.USAJOBS_API_KEY
    delete process.env.USAJOBS_USER_AGENT
  })

  const govQuery: DiscoveryQuery = {
    keywords: ['environmental scientist'],
    source_type: 'government',
  }

  it('calls USAJobs API with correct headers', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(makeUSAJobsResponse()),
    })
    globalThis.fetch = mockFetch

    await usajobsAdapter.discover([govQuery])

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('data.usajobs.gov/api/search'),
      expect.objectContaining({
        headers: {
          Host: 'data.usajobs.gov',
          'User-Agent': 'test@example.com',
          'Authorization-Key': 'test-api-key',
        },
      }),
    )
  })

  it('passes Keyword and DatePosted parameters', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(makeUSAJobsResponse()),
    })
    globalThis.fetch = mockFetch

    await usajobsAdapter.discover([govQuery])

    const calledUrl = mockFetch.mock.calls[0][0] as string
    expect(calledUrl).toContain('Keyword=environmental+scientist')
    expect(calledUrl).toContain('DatePosted=30')
    expect(calledUrl).toContain('ResultsPerPage=50')
  })

  it('passes LocationName when specified in query', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(makeUSAJobsResponse()),
    })
    globalThis.fetch = mockFetch

    const locationQuery: DiscoveryQuery = {
      keywords: ['scientist'],
      location: 'Boulder, CO',
      source_type: 'government',
    }
    await usajobsAdapter.discover([locationQuery])

    const calledUrl = mockFetch.mock.calls[0][0] as string
    expect(calledUrl).toContain('LocationName=Boulder')
  })

  it('returns mapped DiscoveredJob results', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(makeUSAJobsResponse([makeUSAJobsItem(), makeUSAJobsItem({
        PositionTitle: 'Geospatial Analyst',
        PositionURI: 'https://www.usajobs.gov/job/789',
      })])),
    })

    const result = await usajobsAdapter.discover([govQuery])

    expect(result.jobs).toHaveLength(2)
    expect(result.jobs[0].source).toBe('usajobs')
    expect(result.jobs[0].title).toBe('Environmental Scientist')
    expect(result.jobs[1].title).toBe('Geospatial Analyst')
    expect(result.metadata.request_count).toBe(1)
  })

  it('handles API rate limit (429) as retryable error', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      statusText: 'Too Many Requests',
    })

    const result = await usajobsAdapter.discover([govQuery])

    expect(result.errors).toHaveLength(1)
    expect(result.errors[0].message).toContain('rate limited')
    expect(result.jobs).toHaveLength(0)
  })

  it('handles API server error (500) gracefully', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    })

    const result = await usajobsAdapter.discover([govQuery])

    expect(result.errors).toHaveLength(1)
    expect(result.errors[0].message).toContain('500')
    expect(result.jobs).toHaveLength(0)
  })

  it('isolates per-query errors', async () => {
    let callCount = 0
    globalThis.fetch = vi.fn().mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        return Promise.resolve({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
        })
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(makeUSAJobsResponse()),
      })
    })

    const result = await usajobsAdapter.discover([
      { keywords: ['failing query'], source_type: 'government' },
      { keywords: ['working query'], source_type: 'government' },
    ])

    expect(result.errors).toHaveLength(1)
    expect(result.jobs.length).toBeGreaterThan(0)
  })

  it('throws when USAJOBS_API_KEY not configured', async () => {
    delete process.env.USAJOBS_API_KEY

    await expect(usajobsAdapter.discover([govQuery])).rejects.toThrow('USAJOBS_API_KEY not configured')
  })

  it('throws when USAJOBS_USER_AGENT not configured', async () => {
    delete process.env.USAJOBS_USER_AGENT

    await expect(usajobsAdapter.discover([govQuery])).rejects.toThrow('USAJOBS_USER_AGENT not configured')
  })

  it('returns max 50 results per query', async () => {
    const items = Array.from({ length: 50 }, (_, i) =>
      makeUSAJobsItem({
        PositionTitle: `Job ${i}`,
        PositionURI: `https://www.usajobs.gov/job/${i}`,
      }),
    )
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(makeUSAJobsResponse(items)),
    })

    const result = await usajobsAdapter.discover([govQuery])

    expect(result.jobs).toHaveLength(50)
  })
})

describe('usajobsAdapter.healthCheck', () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    process.env.USAJOBS_API_KEY = 'test-key'
    process.env.USAJOBS_USER_AGENT = 'test@example.com'
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    delete process.env.USAJOBS_API_KEY
    delete process.env.USAJOBS_USER_AGENT
  })

  it('returns healthy when API responds', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(makeUSAJobsResponse()),
    })

    const health = await usajobsAdapter.healthCheck()

    expect(health.healthy).toBe(true)
    expect(health.latencyMs).toBeGreaterThanOrEqual(0)
  })

  it('returns unhealthy on API failure', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

    const health = await usajobsAdapter.healthCheck()

    expect(health.healthy).toBe(false)
    expect(health.error).toBe('Network error')
  })
})

describe('USAJOBS_QUERIES', () => {
  it('has 8 search queries targeting environmental science', () => {
    expect(USAJOBS_QUERIES).toHaveLength(8)
  })

  it('covers key environmental science domains', () => {
    const all = USAJOBS_QUERIES.join(' ').toLowerCase()
    expect(all).toContain('remote sensing')
    expect(all).toContain('environmental')
    expect(all).toContain('geospatial')
    expect(all).toContain('satellite')
    expect(all).toContain('oceanography')
  })
})
