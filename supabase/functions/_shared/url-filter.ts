/**
 * Pre-scoring URL and title filter.
 * Rejects discovered_jobs entries that are clearly not job postings
 * before they consume Claude API budget.
 */

const NON_JOB_URL_PATTERNS = [
  /^https?:\/\/(go\.)?nature\.com\/(?!naturecareers)/,  // Nature article pages (not career pages)
  /^https?:\/\/scholar\.google\.com/,
  /^https?:\/\/(www\.)?researchgate\.net/,
  /^https?:\/\/(www\.)?wikipedia\.org/,
  /^https?:\/\/(www\.)?reddit\.com/,
  /^https?:\/\/(www\.)?youtube\.com/,
]

const NON_JOB_TITLE_PATTERNS = [
  /^Nature$/i,                     // Just "Nature" with no job title
  /^Physical oceanography\b/i,     // Article/topic pages, not job postings
]

export function isNonJobUrl(url: string): boolean {
  return NON_JOB_URL_PATTERNS.some(p => p.test(url))
}

export function isNonJobEntry(url: string, title: string): boolean {
  if (isNonJobUrl(url)) return true
  if (NON_JOB_TITLE_PATTERNS.some(p => p.test(title))) return true
  return false
}
