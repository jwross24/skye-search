import { createHash } from 'crypto'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ValidationResult {
  discoveredJobId: string
  status: 'active' | 'dead_link' | 'timeout' | 'closed'
  reason: string
  contentHash?: string
  resolvedUrl?: string
}

// ─── Constants ──────────────────────────────────────────────────────────────

const REQUEST_TIMEOUT_MS = 5_000

/** Case-insensitive phrases that indicate a posting has been closed or filled */
const CLOSURE_PHRASES = [
  'position has been filled',
  'this posting has expired',
  'no longer accepting',
  'position closed',
  'job has been removed',
  'this position is no longer available',
  'this job is no longer available',
] as const

// ─── Helpers ────────────────────────────────────────────────────────────────

/** SHA-256 hash of the first 500 characters of text content */
function computeContentHash(text: string): string {
  return createHash('sha256').update(text.slice(0, 500)).digest('hex')
}

/** Check if a redirect goes to a significantly different location (different domain or path) */
function isSignificantRedirect(originalUrl: string, redirectUrl: string): boolean {
  try {
    const original = new URL(originalUrl)
    const redirect = new URL(redirectUrl)

    // Different domain = likely a generic careers redirect
    if (original.hostname !== redirect.hostname) return true

    // Same domain but very different path (e.g., /jobs/12345 -> /careers)
    // Check if the redirect path is a prefix that drops specificity
    const originalParts = original.pathname.split('/').filter(Boolean)
    const redirectParts = redirect.pathname.split('/').filter(Boolean)

    // If redirect path is shorter and doesn't share the same structure, it's significant
    if (redirectParts.length < originalParts.length && originalParts.length >= 2) {
      return true
    }

    return false
  } catch {
    return false
  }
}

/**
 * Extract text content from HTML, stripping tags.
 * Lightweight: no DOM parser needed.
 */
function extractTextContent(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Search for JSON-LD JobPosting schema with expired validThrough */
function checkJsonLdExpired(html: string): string | null {
  const ldJsonRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  let match: RegExpExecArray | null

  while ((match = ldJsonRegex.exec(html)) !== null) {
    try {
      const data = JSON.parse(match[1])
      const items = Array.isArray(data) ? data : [data]

      for (const item of items) {
        if (item['@type'] === 'JobPosting' && item.validThrough) {
          const validThrough = new Date(item.validThrough)
          if (validThrough < new Date()) {
            return 'JSON-LD validThrough expired'
          }
        }
      }
    } catch {
      // Malformed JSON-LD — skip
    }
  }

  return null
}

// ─── Core Validation ────────────────────────────────────────────────────────

/**
 * Validate a single job URL.
 *
 * 1. HEAD request with manual redirect handling
 * 2. If 200: GET first 5KB, check for closure phrases and JSON-LD expiry
 * 3. Compute content hash for change detection
 */
export async function validateJobUrl(
  url: string,
  discoveredJobId: string,
  existingHash?: string | null,
): Promise<ValidationResult> {
  const base: Pick<ValidationResult, 'discoveredJobId'> = { discoveredJobId }

  try {
    // Step 1: HEAD request
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

    let headResponse: Response
    try {
      headResponse = await fetch(url, {
        method: 'HEAD',
        redirect: 'manual',
        signal: controller.signal,
        headers: {
          'User-Agent': 'SkyeSearch-LinkValidator/1.0',
        },
      })
    } finally {
      clearTimeout(timeout)
    }

    const status = headResponse.status

    // Dead link responses
    if (status === 404 || status === 410) {
      return { ...base, status: 'dead_link', reason: `HTTP ${status}` }
    }

    // Redirects — follow manually and check destination
    if (status >= 301 && status <= 308) {
      const location = headResponse.headers.get('location')
      if (location) {
        const resolvedUrl = new URL(location, url).toString()
        if (isSignificantRedirect(url, resolvedUrl)) {
          return { ...base, status: 'closed', reason: `Redirect to different location: ${resolvedUrl}`, resolvedUrl }
        }
        // Non-significant redirect — treat as if 200, continue to content check
        // Re-fetch the redirect target
        return validateJobUrlContent(resolvedUrl, discoveredJobId, existingHash)
      }
    }

    // Non-200 responses (5xx, 403, etc.) — treat as timeout/transient
    if (status !== 200) {
      return { ...base, status: 'timeout', reason: `HTTP ${status}` }
    }

    // Step 2: GET request for content analysis
    return validateJobUrlContent(url, discoveredJobId, existingHash)
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      return { ...base, status: 'timeout', reason: 'Request timed out' }
    }
    return { ...base, status: 'timeout', reason: 'Network error' }
  }
}

/** Fetch page content and check for closure signals */
async function validateJobUrlContent(
  url: string,
  discoveredJobId: string,
  existingHash?: string | null,
): Promise<ValidationResult> {
  const base: Pick<ValidationResult, 'discoveredJobId'> = { discoveredJobId }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const getResponse = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent': 'SkyeSearch-LinkValidator/1.0',
        'Accept': 'text/html',
      },
    })

    // Read only first 5KB
    const reader = getResponse.body?.getReader()
    if (!reader) {
      return { ...base, status: 'active', reason: 'No body to read' }
    }

    let html = ''
    const decoder = new TextDecoder()
    const MAX_BYTES = 5120

    let totalBytes = 0
    while (totalBytes < MAX_BYTES) {
      const { done, value } = await reader.read()
      if (done) break
      html += decoder.decode(value, { stream: true })
      totalBytes += value.byteLength
    }
    reader.cancel()

    // Check for closure phrases
    const htmlLower = html.toLowerCase()
    for (const phrase of CLOSURE_PHRASES) {
      if (htmlLower.includes(phrase)) {
        return { ...base, status: 'closed', reason: `Closure phrase: ${phrase}` }
      }
    }

    // Check JSON-LD expiry
    const jsonLdResult = checkJsonLdExpired(html)
    if (jsonLdResult) {
      return { ...base, status: 'closed', reason: jsonLdResult }
    }

    // Compute content hash
    const textContent = extractTextContent(html)
    const contentHash = computeContentHash(textContent)

    return {
      ...base,
      status: 'active',
      reason: existingHash && existingHash !== contentHash ? 'Content changed' : 'OK',
      contentHash,
      resolvedUrl: url,
    }
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      return { ...base, status: 'timeout', reason: 'Request timed out' }
    }
    return { ...base, status: 'timeout', reason: 'Network error' }
  } finally {
    clearTimeout(timeout)
  }
}

// ─── Batch Validation ───────────────────────────────────────────────────────

/**
 * Validate a batch of job URLs sequentially.
 *
 * @param jobs - Array of job records to validate
 * @param batchSize - Number of concurrent validations (default 1 for sequential)
 */
export async function validateJobBatch(
  jobs: Array<{ id: string; url: string; content_hash: string | null }>,
  batchSize: number = 1,
): Promise<ValidationResult[]> {
  const results: ValidationResult[] = []

  // Process in sub-batches
  for (let i = 0; i < jobs.length; i += batchSize) {
    const batch = jobs.slice(i, i + batchSize)
    const batchResults = await Promise.all(
      batch.map((job) => validateJobUrl(job.url, job.id, job.content_hash)),
    )
    results.push(...batchResults)
  }

  return results
}
