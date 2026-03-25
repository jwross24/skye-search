/**
 * URL canonicalization — strips tracking params, normalizes protocol/www/trailing slashes.
 * Used by dedup pipeline and all source adapters.
 */

const TRACKING_PARAMS = [
  /^utm_/i,
  /^trk$/i,
  /^ref$/i,
  /^sid$/i,
  /^fbclid$/i,
  /^gclid$/i,
  /^mc_/i,
  /^_ga$/i,
  /^_gl$/i,
]

export function canonicalizeUrl(url: string): string {
  if (!url) return ''

  let normalized = url.trim()

  // Normalize protocol to https
  normalized = normalized.replace(/^http:\/\//i, 'https://')

  // Add protocol if missing
  if (!normalized.startsWith('https://')) {
    normalized = 'https://' + normalized
  }

  let parsed: URL
  try {
    parsed = new URL(normalized)
  } catch {
    return normalized
  }

  // Strip www prefix
  if (parsed.hostname.startsWith('www.')) {
    parsed.hostname = parsed.hostname.slice(4)
  }

  // Strip tracking parameters
  const paramsToDelete: string[] = []
  parsed.searchParams.forEach((_, key) => {
    if (TRACKING_PARAMS.some((pattern) => pattern.test(key))) {
      paramsToDelete.push(key)
    }
  })
  for (const key of paramsToDelete) {
    parsed.searchParams.delete(key)
  }

  // Strip hash fragments
  parsed.hash = ''

  // Normalize trailing slash — remove from path unless it's just "/"
  if (parsed.pathname.length > 1 && parsed.pathname.endsWith('/')) {
    parsed.pathname = parsed.pathname.slice(0, -1)
  }

  // Reconstruct — strip empty search string
  let result = parsed.origin + parsed.pathname
  const search = parsed.searchParams.toString()
  if (search) result += '?' + search
  return result
}
