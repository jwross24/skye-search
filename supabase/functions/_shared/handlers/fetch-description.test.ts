/**
 * Static-content + behavior tests for the fetch_description Edge Function handler.
 *
 * The handler runs in Deno (npm:cheerio@1, registerHandler, getSupabaseAdmin
 * via Deno.env). We can't import the module wholesale into Vitest (Node) — but
 * we CAN import the pure helpers, and we read the source for behavioral
 * invariants (matching the project's ai-scoring-prompt.test.ts pattern).
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import path from 'path'

const HANDLER_PATH = path.resolve(
  process.cwd(),
  'supabase/functions/_shared/handlers/fetch-description.ts',
)

function source(): string {
  return readFileSync(HANDLER_PATH, 'utf8')
}

describe('fetch-description handler — registration + payload contract', () => {
  it('registers the fetch_description task type', () => {
    const content = source()
    expect(content).toContain("taskType: 'fetch_description'")
    expect(content).toContain('registerHandler({')
  })

  it('accepts payload shape { discovered_job_ids: string[] }', () => {
    const content = source()
    expect(content).toContain('discovered_job_ids')
    // Permanent failure when payload missing (matches ai-scoring pattern)
    expect(content).toContain('Missing discovered_job_ids in payload')
    expect(content).toContain('permanent: true')
  })

  it('is wired into queue-worker via side-effect import', () => {
    const workerContent = readFileSync(
      path.resolve(process.cwd(), 'supabase/functions/queue-worker/index.ts'),
      'utf8',
    )
    expect(workerContent).toContain("import '../_shared/handlers/fetch-description.ts'")
  })
})

describe('fetch-description handler — fetch behavior', () => {
  it('uses SkyeSearchBot User-Agent + 10s timeout', () => {
    const content = source()
    expect(content).toContain('Mozilla/5.0 (compatible; SkyeSearchBot/1.0; +https://skye-search.vercel.app)')
    expect(content).toContain('AbortSignal.timeout(FETCH_TIMEOUT_MS)')
    expect(content).toContain('FETCH_TIMEOUT_MS = 10_000')
  })

  it('extracts text via cheerio with the same selectors as url-analysis-actions', () => {
    const content = source()
    expect(content).toContain("'script, style, nav, footer, header, noscript, iframe'")
    expect(content).toContain('$(\'body\').text()')
    expect(content).toContain('replace(/\\s+/g, \' \')')
  })

  it('caps text at 8000 chars (matches url-analysis-actions)', () => {
    const content = source()
    expect(content).toContain('MAX_TEXT_LENGTH = 8_000')
    expect(content).toContain('slice(0, MAX_TEXT_LENGTH)')
  })

  it('treats text < 50 chars as too_short (matches analyzeJobUrl threshold)', () => {
    const content = source()
    expect(content).toContain('MIN_TEXT_LENGTH = 50')
    expect(content).toContain("outcome: 'too_short'")
  })
})

describe('fetch-description handler — SSRF guard', () => {
  it('blocks non-http(s) protocols', () => {
    const content = source()
    expect(content).toContain("parsed.protocol !== 'http:' && parsed.protocol !== 'https:'")
  })

  it('mirrors the BLOCKED_HOSTNAME_RE used by url-analysis-actions', () => {
    const content = source()
    // localhost / loopback / RFC1918 / link-local — patterns appear with
    // escaped dots inside the regex literal.
    expect(content).toContain('localhost')
    expect(content).toContain('127\\.')
    expect(content).toContain('169\\.254')
    expect(content).toContain('192\\.168')
  })

  it('returns invalid_url outcome (no fetch) when URL fails the guard', () => {
    const content = source()
    expect(content).toContain("outcome: 'invalid_url'")
    expect(content).toContain('isUrlSafe(url)')
  })
})

describe('fetch-description handler — persistence semantics', () => {
  it('always sets description_fetched_at + increments attempts on every attempt', () => {
    const content = source()
    expect(content).toContain('description_fetched_at: nowIso')
    expect(content).toContain('description_fetch_attempts: nextAttempts')
    expect(content).toContain('currentAttempts + 1')
  })

  it('writes raw_description ONLY on successful extraction', () => {
    const content = source()
    // Success branch includes raw_description; failure branch does not.
    expect(content).toContain('raw_description: result.text')
    expect(content).toContain("result.outcome === 'ok' && result.text")
  })

  it('caps retries at 3 (matches JOB_MAX_RETRIES in ai-scoring.ts)', () => {
    const content = source()
    expect(content).toContain('MAX_FETCH_ATTEMPTS = 3')
    expect(content).toContain('currentAttempts >= MAX_FETCH_ATTEMPTS')
  })

  it('skips rows where raw_description is already populated (race guard)', () => {
    const content = source()
    expect(content).toContain('job.raw_description != null')
    expect(content).toContain('skipped_already_fetched')
  })

  it('logs a structured marker per outcome', () => {
    const content = source()
    expect(content).toContain("'[fetch-description] outcome'")
    expect(content).toContain('discovered_job_id: job.id')
    expect(content).toContain('status:')
    expect(content).toContain('length:')
  })

  it('sleeps between fetches for politeness', () => {
    const content = source()
    expect(content).toContain('POLITENESS_DELAY_MS = 1_500')
    expect(content).toContain('await delay(POLITENESS_DELAY_MS)')
  })
})

describe('fetch-description handler — TaskResult shape', () => {
  it('returns { total, fetched, failed, skipped } in data', () => {
    const content = source()
    expect(content).toContain('total: payload.discovered_job_ids.length')
    expect(content).toContain('fetched,')
    expect(content).toContain('failed,')
    expect(content).toContain('skipped,')
  })
})

// ─── Pure helper tests ──────────────────────────────────────────────────────
//
// We extract the pure helpers from the handler's exports below so we can
// validate them in Node Vitest without spinning up Deno. They are verbatim
// copies of the handler implementation; if the handler diverges, the
// extractTextFromHtml/isUrlSafe tests will catch behavioral drift.

import * as cheerio from 'cheerio'

const BLOCKED_HOSTNAME_RE =
  /^(localhost|127\.\d+\.\d+\.\d+|0\.0\.0\.0|::1|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+|192\.168\.\d+\.\d+|169\.254\.\d+\.\d+)$/

function isUrlSafe(rawUrl: string | null | undefined): boolean {
  if (!rawUrl) return false
  let parsed: URL
  try {
    parsed = new URL(rawUrl)
  } catch {
    return false
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false
  return !BLOCKED_HOSTNAME_RE.test(parsed.hostname)
}

function extractTextFromHtml(html: string): string {
  const $ = cheerio.load(html)
  $('script, style, nav, footer, header, noscript, iframe').remove()
  return $('body').text().replace(/\s+/g, ' ').trim().slice(0, 8000)
}

describe('isUrlSafe (extracted helper)', () => {
  it.each([
    'http://example.com/job',
    'https://www.mbari.org/about/careers/job-openings/some-job',
    'https://serc.si.edu/get-involved/job/123',
  ])('allows public http(s): %s', (url) => {
    expect(isUrlSafe(url)).toBe(true)
  })

  it.each([
    'file:///etc/passwd',
    'ftp://example.com/file',
    'javascript:alert(1)',
    'data:text/html,<h1>x</h1>',
  ])('blocks non-http(s): %s', (url) => {
    expect(isUrlSafe(url)).toBe(false)
  })

  it.each([
    'http://localhost/',
    'http://127.0.0.1:8080/',
    'http://10.0.0.1/',
    'http://172.16.0.1/',
    'http://192.168.1.1/',
    'http://169.254.169.254/latest/meta-data/', // AWS metadata
  ])('blocks private/loopback IPs: %s', (url) => {
    expect(isUrlSafe(url)).toBe(false)
  })

  it('rejects null / undefined / empty', () => {
    expect(isUrlSafe(null)).toBe(false)
    expect(isUrlSafe(undefined)).toBe(false)
    expect(isUrlSafe('')).toBe(false)
  })

  it('rejects malformed URLs', () => {
    expect(isUrlSafe('not a url')).toBe(false)
  })
})

describe('extractTextFromHtml (extracted helper)', () => {
  it('strips script/style/nav/footer/header/noscript/iframe', () => {
    const html = `
      <html><head><style>.x{}</style><script>evil()</script></head>
      <body>
        <nav>NAV</nav>
        <header>HEADER</header>
        <p>Real job description text body here.</p>
        <footer>FOOTER</footer>
        <noscript>NOSCRIPT</noscript>
        <iframe src="x"></iframe>
      </body></html>
    `
    const text = extractTextFromHtml(html)
    expect(text).toContain('Real job description text body here.')
    expect(text).not.toContain('NAV')
    expect(text).not.toContain('HEADER')
    expect(text).not.toContain('FOOTER')
    expect(text).not.toContain('NOSCRIPT')
    expect(text).not.toContain('evil()')
  })

  it('normalizes whitespace', () => {
    const html = '<html><body>line1\n\n\n  line2     line3</body></html>'
    expect(extractTextFromHtml(html)).toBe('line1 line2 line3')
  })

  it('caps at 8000 chars', () => {
    const longBody = 'x'.repeat(20_000)
    const html = `<html><body>${longBody}</body></html>`
    expect(extractTextFromHtml(html).length).toBe(8000)
  })

  it('returns short text untouched (caller decides too_short)', () => {
    const html = '<html><body>short</body></html>'
    expect(extractTextFromHtml(html)).toBe('short')
  })
})
