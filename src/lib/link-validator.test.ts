import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { validateJobUrl, validateJobBatch } from './link-validator'

// ─── Fetch Mock ─────────────────────────────────────────────────────────────

const originalFetch = globalThis.fetch

beforeEach(() => {
  vi.restoreAllMocks()
})

afterEach(() => {
  globalThis.fetch = originalFetch
})

// ─── Helpers ────────────────────────────────────────────────────────────────

function mockFetch(impl: (url: string | URL | Request, init?: RequestInit) => Promise<Response>) {
  globalThis.fetch = vi.fn(impl) as typeof fetch
}

function makeReadableStream(text: string): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  const data = encoder.encode(text)
  return new ReadableStream({
    start(controller) {
      controller.enqueue(data)
      controller.close()
    },
  })
}

function htmlResponse(body: string, status = 200): Response {
  return new Response(makeReadableStream(body), {
    status,
    headers: { 'Content-Type': 'text/html' },
  })
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('validateJobUrl', () => {
  it('returns dead_link for 404 response', async () => {
    mockFetch(async () => new Response(null, { status: 404 }))

    const result = await validateJobUrl('https://example.com/job/123', 'job-1')

    expect(result.status).toBe('dead_link')
    expect(result.reason).toBe('HTTP 404')
    expect(result.discoveredJobId).toBe('job-1')
  })

  it('returns dead_link for 410 response', async () => {
    mockFetch(async () => new Response(null, { status: 410 }))

    const result = await validateJobUrl('https://example.com/job/456', 'job-2')

    expect(result.status).toBe('dead_link')
    expect(result.reason).toBe('HTTP 410')
  })

  it('returns closed for page with closure phrase "position has been filled"', async () => {
    mockFetch(async (_url, init) => {
      if (init?.method === 'HEAD') {
        return new Response(null, { status: 200 })
      }
      return htmlResponse('<html><body><p>This position has been filled. Thank you for your interest.</p></body></html>')
    })

    const result = await validateJobUrl('https://example.com/job/789', 'job-3')

    expect(result.status).toBe('closed')
    expect(result.reason).toBe('Closure phrase: position has been filled')
  })

  it('returns closed for page with "this job is no longer available"', async () => {
    mockFetch(async (_url, init) => {
      if (init?.method === 'HEAD') {
        return new Response(null, { status: 200 })
      }
      return htmlResponse('<html><body><h1>This Job Is No Longer Available</h1></body></html>')
    })

    const result = await validateJobUrl('https://example.com/job/closed', 'job-4')

    expect(result.status).toBe('closed')
    expect(result.reason).toBe('Closure phrase: this job is no longer available')
  })

  it('returns closed for JSON-LD validThrough in the past', async () => {
    const pastDate = new Date(Date.now() - 86400000).toISOString()
    mockFetch(async (_url, init) => {
      if (init?.method === 'HEAD') {
        return new Response(null, { status: 200 })
      }
      return htmlResponse(`<html><head>
        <script type="application/ld+json">
          {"@type": "JobPosting", "title": "Test", "validThrough": "${pastDate}"}
        </script>
      </head><body>Active content here</body></html>`)
    })

    const result = await validateJobUrl('https://example.com/job/expired', 'job-5')

    expect(result.status).toBe('closed')
    expect(result.reason).toBe('JSON-LD validThrough expired')
  })

  it('returns active for 200 with valid content', async () => {
    mockFetch(async (_url, init) => {
      if (init?.method === 'HEAD') {
        return new Response(null, { status: 200 })
      }
      return htmlResponse('<html><body><h1>Research Scientist Position</h1><p>We are looking for candidates...</p></body></html>')
    })

    const result = await validateJobUrl('https://example.com/job/active', 'job-6')

    expect(result.status).toBe('active')
    expect(result.reason).toBe('OK')
    expect(result.contentHash).toBeDefined()
    expect(result.contentHash).toHaveLength(64) // SHA-256 hex
  })

  it('returns closed for redirect to different domain', async () => {
    mockFetch(async () => {
      return new Response(null, {
        status: 301,
        headers: { 'Location': 'https://careers.different-domain.com/jobs' },
      })
    })

    const result = await validateJobUrl('https://example.com/job/redirected', 'job-7')

    expect(result.status).toBe('closed')
    expect(result.reason).toContain('Redirect to different location')
    expect(result.resolvedUrl).toContain('different-domain.com')
  })

  it('returns timeout when fetch times out', async () => {
    mockFetch(async (_url, init) => {
      // Simulate abort
      if (init?.signal) {
        return new Promise<Response>((_, reject) => {
          init.signal!.addEventListener('abort', () => {
            const err = new DOMException('The operation was aborted', 'AbortError')
            reject(err)
          })
          // Trigger abort immediately for test speed
          if (init.signal!.aborted) {
            reject(new DOMException('The operation was aborted', 'AbortError'))
          }
        })
      }
      return new Response(null, { status: 200 })
    })

    // Force abort by using a pre-aborted signal approach
    mockFetch(async () => {
      throw new DOMException('The operation was aborted', 'AbortError')
    })

    const result = await validateJobUrl('https://slow-server.example.com/job', 'job-8')

    expect(result.status).toBe('timeout')
    expect(result.reason).toBe('Request timed out')
  })

  it('returns timeout on network error', async () => {
    mockFetch(async () => {
      throw new Error('ECONNREFUSED')
    })

    const result = await validateJobUrl('https://unreachable.example.com/job', 'job-9')

    expect(result.status).toBe('timeout')
    expect(result.reason).toBe('Network error')
  })

  it('computes content hash and detects changes', async () => {
    const existingHash = 'aaaa0000bbbb1111cccc2222dddd3333eeee4444ffff5555aaaa0000bbbb1111'

    mockFetch(async (_url, init) => {
      if (init?.method === 'HEAD') {
        return new Response(null, { status: 200 })
      }
      return htmlResponse('<html><body><h1>Updated Job Posting</h1><p>New content here</p></body></html>')
    })

    const result = await validateJobUrl('https://example.com/job/changed', 'job-10', existingHash)

    expect(result.status).toBe('active')
    expect(result.reason).toBe('Content changed')
    expect(result.contentHash).toBeDefined()
    expect(result.contentHash).not.toBe(existingHash)
  })

  it('follows non-significant redirect and checks content', async () => {
    let callCount = 0
    mockFetch(async (_url, init) => {
      callCount++

      // First call: HEAD to original URL returns redirect
      if (callCount === 1 && init?.method === 'HEAD') {
        return new Response(null, {
          status: 301,
          headers: { 'Location': 'https://example.com/job/123-updated-slug' },
        })
      }

      // Subsequent calls: HEAD/GET to redirect target
      if (init?.method === 'HEAD') {
        return new Response(null, { status: 200 })
      }

      return htmlResponse('<html><body><h1>Active Job</h1></body></html>')
    })

    const result = await validateJobUrl('https://example.com/job/123', 'job-11')

    // Same domain, similar path = non-significant redirect, should check content
    expect(result.status).toBe('active')
  })
})

describe('validateJobBatch', () => {
  it('validates multiple jobs and returns mixed results', async () => {
    mockFetch(async (url, init) => {
      const urlStr = typeof url === 'string' ? url : url.toString()

      if (urlStr.includes('active-job')) {
        if (init?.method === 'HEAD') return new Response(null, { status: 200 })
        return htmlResponse('<html><body>Active posting</body></html>')
      }
      if (urlStr.includes('dead-job')) {
        return new Response(null, { status: 404 })
      }
      if (urlStr.includes('closed-job')) {
        if (init?.method === 'HEAD') return new Response(null, { status: 200 })
        return htmlResponse('<html><body>This position has been filled</body></html>')
      }
      return new Response(null, { status: 200 })
    })

    const jobs = [
      { id: 'j1', url: 'https://example.com/active-job', content_hash: null },
      { id: 'j2', url: 'https://example.com/dead-job', content_hash: null },
      { id: 'j3', url: 'https://example.com/closed-job', content_hash: null },
    ]

    const results = await validateJobBatch(jobs)

    expect(results).toHaveLength(3)
    expect(results[0].status).toBe('active')
    expect(results[0].discoveredJobId).toBe('j1')
    expect(results[1].status).toBe('dead_link')
    expect(results[1].discoveredJobId).toBe('j2')
    expect(results[2].status).toBe('closed')
    expect(results[2].discoveredJobId).toBe('j3')
  })

  it('processes in sub-batches when batchSize > 1', async () => {
    const fetchCalls: string[] = []
    mockFetch(async (url, init) => {
      const urlStr = typeof url === 'string' ? url : url.toString()
      fetchCalls.push(urlStr)
      if (init?.method === 'HEAD') return new Response(null, { status: 200 })
      return htmlResponse('<html><body>Active</body></html>')
    })

    const jobs = [
      { id: 'j1', url: 'https://example.com/1', content_hash: null },
      { id: 'j2', url: 'https://example.com/2', content_hash: null },
      { id: 'j3', url: 'https://example.com/3', content_hash: null },
    ]

    const results = await validateJobBatch(jobs, 2)

    expect(results).toHaveLength(3)
    expect(results.every((r) => r.status === 'active')).toBe(true)
  })

  it('returns empty array for empty input', async () => {
    const results = await validateJobBatch([])
    expect(results).toHaveLength(0)
  })
})
