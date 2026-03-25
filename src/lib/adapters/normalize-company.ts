/**
 * Company name normalization for dedup matching.
 * Strips common suffixes, lowercases, trims whitespace.
 */

const COMPANY_SUFFIXES = [
  /,?\s+inc\.?$/i,
  /,?\s+llc\.?$/i,
  /,?\s+ltd\.?$/i,
  /,?\s+corp\.?$/i,
  /,?\s+corporation$/i,
  /,?\s+co\.?$/i,
  /,?\s+company$/i,
  /,?\s+incorporated$/i,
  /,?\s+limited$/i,
  /,?\s+plc\.?$/i,
  /,?\s+gmbh$/i,
  /,?\s+s\.?a\.?$/i,
]

export function normalizeCompany(name: string): string {
  if (!name) return ''

  let normalized = name.trim()

  // Strip only the outermost legal suffix — avoids eating name words
  // "Big Corp Corporation" → "Big Corp" (not "Big")
  // "Acme, Inc." → "Acme"
  for (const suffix of COMPANY_SUFFIXES) {
    const before = normalized
    normalized = normalized.replace(suffix, '')
    if (normalized !== before) break
  }

  // Lowercase and collapse whitespace
  normalized = normalized.toLowerCase().replace(/\s+/g, ' ').trim()

  return normalized
}
