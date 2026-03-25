import { describe, it, expect, beforeEach } from 'vitest'
import {
  registerAdapter,
  getAdapter,
  getAllAdapters,
  discoverAll,
  clearRegistry,
} from './registry'
import type {
  JobSourceAdapter,
  DiscoveryQuery,
  AdapterResult,
  DiscoveredJob,
} from '@/types/job-source'

// ─── Mock Adapter Factory ────────────────────────────────────────────────────

function makeMockAdapter(
  name: string,
  jobs: DiscoveredJob[] = [],
  shouldFail = false,
): JobSourceAdapter {
  return {
    name,
    async discover(): Promise<AdapterResult> {
      if (shouldFail) throw new Error(`${name} adapter crashed`)
      return {
        jobs,
        errors: [],
        metadata: { request_count: 1, latency_ms: 10 },
      }
    },
    async healthCheck() {
      return { healthy: !shouldFail, latencyMs: 5 }
    },
  }
}

function makeMockJob(overrides: Partial<DiscoveredJob> = {}): DiscoveredJob {
  return {
    source: 'test',
    url: 'https://example.com/job/1',
    title: 'Test Postdoc',
    company: 'Test University',
    raw_description: 'A test job',
    canonical_url: 'https://example.com/job/1',
    normalized_company: 'test university',
    indexed_date: new Date().toISOString(),
    source_type: 'academic',
    ...overrides,
  }
}

const testQueries: DiscoveryQuery[] = [
  { keywords: ['remote sensing', 'postdoc'], source_type: 'academic' },
]

// ─── Tests ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  clearRegistry()
})

describe('Adapter registration', () => {
  it('registers and retrieves adapter by name', () => {
    const adapter = makeMockAdapter('usajobs')
    registerAdapter(adapter)
    const retrieved = getAdapter('usajobs')
    console.log(`[Registry] Retrieved adapter: ${retrieved.name}`)
    expect(retrieved.name).toBe('usajobs')
  })

  it('throws on duplicate adapter registration', () => {
    registerAdapter(makeMockAdapter('exa'))
    expect(() => registerAdapter(makeMockAdapter('exa'))).toThrow(
      'Adapter "exa" is already registered',
    )
  })

  it('throws when getting unregistered adapter', () => {
    expect(() => getAdapter('nonexistent')).toThrow('not found')
  })

  it('getAllAdapters returns all registered', () => {
    registerAdapter(makeMockAdapter('a'))
    registerAdapter(makeMockAdapter('b'))
    registerAdapter(makeMockAdapter('c'))
    expect(getAllAdapters()).toHaveLength(3)
  })
})

describe('discoverAll', () => {
  it('runs all adapters in parallel', async () => {
    const jobs1 = [makeMockJob({ title: 'Job 1' })]
    const jobs2 = [makeMockJob({ title: 'Job 2' }), makeMockJob({ title: 'Job 3' })]
    const jobs3 = [makeMockJob({ title: 'Job 4' })]

    registerAdapter(makeMockAdapter('adapter1', jobs1))
    registerAdapter(makeMockAdapter('adapter2', jobs2))
    registerAdapter(makeMockAdapter('adapter3', jobs3))

    const { results, failures } = await discoverAll(testQueries)

    console.log(
      `[Registry] Results: ${results.size} adapters, ` +
        `${Array.from(results.values()).reduce((s, r) => s + r.jobs.length, 0)} total jobs`,
    )

    expect(results.size).toBe(3)
    expect(failures).toHaveLength(0)
    expect(results.get('adapter1')!.jobs).toHaveLength(1)
    expect(results.get('adapter2')!.jobs).toHaveLength(2)
    expect(results.get('adapter3')!.jobs).toHaveLength(1)
  })

  it('isolates adapter failures', async () => {
    registerAdapter(makeMockAdapter('good1', [makeMockJob()]))
    registerAdapter(makeMockAdapter('bad', [], true)) // will throw
    registerAdapter(makeMockAdapter('good2', [makeMockJob()]))

    const { results, failures } = await discoverAll(testQueries)

    console.log(`[Registry] Success: ${results.size}, Failures: ${failures.length} (${failures.join(', ')})`)

    expect(results.size).toBe(2)
    expect(failures).toEqual(['bad'])
    expect(results.has('good1')).toBe(true)
    expect(results.has('good2')).toBe(true)
    expect(results.has('bad')).toBe(false)
  })

  it('returns empty results when no adapters registered', async () => {
    const { results, failures } = await discoverAll(testQueries)
    expect(results.size).toBe(0)
    expect(failures).toHaveLength(0)
  })
})

describe('Integration', () => {
  it('mock adapter round-trip: query → DiscoveredJob[] with all required fields', async () => {
    const job = makeMockJob({
      source: 'usajobs',
      title: 'Environmental Scientist',
      company: 'NOAA',
      source_type: 'government',
      structured_deadline: '2026-05-01',
    })
    registerAdapter(makeMockAdapter('usajobs', [job]))

    const { results } = await discoverAll(testQueries)
    const discovered = results.get('usajobs')!.jobs[0]

    expect(discovered.source).toBe('usajobs')
    expect(discovered.title).toBe('Environmental Scientist')
    expect(discovered.company).toBe('NOAA')
    expect(discovered.canonical_url).toBeTruthy()
    expect(discovered.normalized_company).toBeTruthy()
    expect(discovered.indexed_date).toBeTruthy()
    expect(discovered.source_type).toBe('government')
  })

  it('adapter healthCheck returns latency and status', async () => {
    const adapter = makeMockAdapter('test')
    const health = await adapter.healthCheck()

    console.log(`[Health] ${adapter.name}: healthy=${health.healthy}, latency=${health.latencyMs}ms`)
    expect(health.healthy).toBe(true)
    expect(health.latencyMs).toBeGreaterThanOrEqual(0)
  })
})
