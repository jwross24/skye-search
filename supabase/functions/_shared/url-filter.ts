/**
 * Pre-scoring URL and title filter.
 * Rejects discovered_jobs entries that are clearly not job postings
 * before they consume Claude API budget.
 *
 * Data-driven: patterns derived from 70 zero-score jobs in production
 * (2026-03-25 through 2026-04-04). Top noise sources:
 *   31 nature.com articles/subjects (44%)
 *   12 career landing pages (17%)
 *    5 blog/news/docs pages (7%)
 *    1 URL shortener (1%)
 */

const NON_JOB_URL_PATTERNS = [
  // ── Nature / NPG (31 of 70 zero-score jobs) ─────────────────────────────
  // nature.com article pages, subject/topic pages, search pages, and obituaries
  // Allow: naturecareers.com (actual job board)
  /^https?:\/\/(go\.|www\.)?nature\.com\/(?!naturecareers)/,
  /^https?:\/\/(www\.)?npg\.nature\.com\//,

  // ── Career landing pages (12 of 70) ──────────────────────────────────────
  // Homepage-level career/jobs/hr pages without a specific job posting path.
  // These are index pages, not job listings.
  // Allow: /careers/postdoc-123, /jobs/12345, /careers/opportunities/scientist
  /^https?:\/\/[^/]+\/careers\/?$/,                    // example.com/careers or /careers/
  /^https?:\/\/[^/]+\/careers\/(index\.(html|shtml|php)|contact-us|news|about)\/?/,  // careers subpages that aren't jobs
  /^https?:\/\/[^/]+\/who-we-are\/work-with-[^/]+\/?$/,  // whoi.edu/who-we-are/work-with-whoi
  /^https?:\/\/[^/]+\/(hr|human-resources)\/?/,        // HR pages (umbc.edu/hr/employment/index.html)
  /^https?:\/\/[^/]+\/about\/student-employment\/?$/,  // Student employment overview pages
  /^https?:\/\/[^/]+\/job-opportunities\/?$/,           // Generic "job opportunities" landing pages
  /^https?:\/\/[^/]+\/user\/new\/?$/,                   // Account creation pages (jobs.colostate.edu/user/new)
  /^https?:\/\/[^/]+\/about-us\/job-opportunities\/?$/, // science.nasa.gov/about-us/job-opportunities/
  /^https?:\/\/[^/]+\/general\/jobs-and-internships/,   // nasa.gov/general/jobs-and-internships-at-nasa-goddard
  /^https?:\/\/[^/]+\/faq\//,                           // jobs.umbc.edu/faq/nonexempt-employment-tips/
  /^https?:\/\/[^/]+\/index\.php\/jobs\/?$/,            // ioccp.org/index.php/jobs (job index, not specific listing)
  /^https?:\/\/science\.gsfc\.nasa\.gov\/sed\/?$/,      // Science @ GSFC department page (not a job posting)

  // ── Blog / news / docs (5 of 70) ────────────────────────────────────────
  /^https?:\/\/[^/]+\/blog\//,                          // Blog posts
  /^https?:\/\/[^/]+\/post\//,                          // geowgs84.com/post/...
  /^https?:\/\/[^/]+\/news\//,                          // News pages
  /^https?:\/\/docs\.[^/]+\//,                          // docs.oracle.com, docs.planet.com

  // ── Academic profiles / homepages (from "other" category) ────────────────
  /^https?:\/\/[^/]+\/people\/[^/]+\/?$/,               // Faculty profile pages (ibs.colorado.edu/people/...)

  // ── Previously caught (still valid) ──────────────────────────────────────
  /^https?:\/\/scholar\.google\.com/,
  /^https?:\/\/(www\.)?researchgate\.net/,
  /^https?:\/\/(www\.)?wikipedia\.org/,
  /^https?:\/\/(www\.)?reddit\.com/,
  /^https?:\/\/(www\.)?youtube\.com/,
  /^https?:\/\/(www\.)?linkedin\.com/,                  // Login wall prevents description extraction

  // ── URL shorteners ───────────────────────────────────────────────────────
  /^https?:\/\/bit\.ly\//,
]

const NON_JOB_TITLE_PATTERNS = [
  /^Nature$/i,                                // Just "Nature" with no job title
  /^Physical oceanography\b/i,                // Article/topic pages
  /^Nature Search$/i,                         // nature.com/search?author= pages
  /^News\b.*\|\s/i,                           // "News | CIRES", "News – Careers@WHOI"
  /^Welcome\s*\|/i,                           // "Welcome | CIRES" — homepage
  /^Page Not Found$/i,                        // Dead links (404 pages)
  /^HOME\s*-/i,                               // Personal website homepages
  /^Careers$/i,                               // Bare "Careers" title (landing page)
  /^(Student|Job) Employment$/i,              // Generic employment pages
  /^Contact Us\b/i,                           // Contact pages
  /^\s*$/,                                    // Empty titles
]

export function isNonJobUrl(url: string): boolean {
  return NON_JOB_URL_PATTERNS.some(p => p.test(url))
}

export function isNonJobEntry(url: string, title: string): boolean {
  if (isNonJobUrl(url)) return true
  if (NON_JOB_TITLE_PATTERNS.some(p => p.test(title))) return true
  return false
}
