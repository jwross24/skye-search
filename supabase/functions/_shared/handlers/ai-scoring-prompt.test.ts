/**
 * Tests for scoring prompt improvements (fon3):
 * - Posting gate in rubric
 * - Geographic gate in rubric
 * - isInternationalLocation safety net
 * - Cap-exempt employer section injection
 * - Vote dismiss pattern injection
 */
import { describe, it, expect } from 'vitest'
import { isInternationalLocation } from '../location-filter'

describe('isInternationalLocation', () => {
  describe('detects European locations', () => {
    it.each([
      'London, UK',
      'Berlin, Germany',
      'Paris, France',
      'Amsterdam, Netherlands',
      'Copenhagen, Denmark',
      'Aarhus, Denmark',
      'ETH Zurich, Switzerland',
      'Oxford, United Kingdom',
      'Wageningen, Netherlands',
      'Uppsala, Sweden',
    ])('filters %s', (location) => {
      expect(isInternationalLocation(location)).toBe(true)
    })
  })

  describe('detects Asia/Oceania locations', () => {
    it.each([
      'Tokyo, Japan',
      'Beijing, China',
      'Sydney, Australia',
      'Melbourne, Australia',
      'Singapore',
      'Seoul, South Korea',
    ])('filters %s', (location) => {
      expect(isInternationalLocation(location)).toBe(true)
    })
  })

  describe('allows US locations', () => {
    it.each([
      'Woods Hole, MA',
      'Boulder, CO',
      'Greenbelt, MD',
      'College Park, MD',
      'Seattle, WA',
      'San Diego, CA',
      'Boston, MA',
      'Miami, FL',
      'Honolulu, HI',
      'Fairbanks, AK',
    ])('allows %s', (location) => {
      expect(isInternationalLocation(location)).toBe(false)
    })
  })

  describe('does not false-positive on US cities with international namesakes', () => {
    it.each([
      'Cambridge, MA',           // MIT, Harvard
      'Cambridge, Massachusetts',
      'Oxford, MS',              // Ole Miss
      'Oxford, Mississippi',
      'Manchester, NH',
      'Manchester, New Hampshire',
      'Dublin, OH',
      'Dublin, Ohio',
      'Athens, GA',              // UGA, environmental science
      'Athens, Georgia',
      'Edinburgh, TX',
      'Melbourne, FL',
      'Melbourne, Florida',
    ])('allows %s', (location) => {
      expect(isInternationalLocation(location)).toBe(false)
    })
  })

  describe('allows Canadian locations', () => {
    it.each([
      'Halifax, Nova Scotia',
      'Vancouver, BC',
      'Toronto, ON',
      'Ottawa, ON',
      'Sydney, NS',              // Sydney, Nova Scotia — not Sydney, Australia
      'Sydney, Nova Scotia',
    ])('allows %s', (location) => {
      expect(isInternationalLocation(location)).toBe(false)
    })
  })

  describe('handles edge cases', () => {
    it('returns false for null', () => {
      expect(isInternationalLocation(null)).toBe(false)
    })

    it('returns false for remote positions', () => {
      expect(isInternationalLocation('Remote')).toBe(false)
      expect(isInternationalLocation('remote - US based')).toBe(false)
    })

    it('returns false for TBD', () => {
      expect(isInternationalLocation('TBD')).toBe(false)
    })

    it('returns false for empty string', () => {
      expect(isInternationalLocation('')).toBe(false)
    })
  })
})

describe('Company+title dedup logic', () => {
  it('processBatch includes dedup check before scoring', async () => {
    const { readFileSync } = await import('fs')
    const content = readFileSync('supabase/functions/_shared/handlers/ai-scoring.ts', 'utf8')
    // Dedup uses a single batch query + in-memory Set (not N+1 per-job)
    expect(content).toContain('existingPairs')
    expect(content).toContain('toLowerCase()')
    // 30-day window prevents filtering legitimate re-listings
    expect(content).toContain('thirtyDaysAgo')
    // Deduped jobs are marked scored to prevent re-processing
    expect(content).toContain('dedupIds')
    expect(content).toContain('dedupedScorable')
  })

  it('zero-score jobs are skipped — not inserted into jobs table', async () => {
    const { readFileSync } = await import('fs')
    const content = readFileSync('supabase/functions/_shared/handlers/ai-scoring.ts', 'utf8')
    // Career pages and international jobs (match_score=0) must not be upserted
    expect(content).toContain('match_score === 0')
    // They should be marked scored in discovered_jobs to prevent re-processing
    expect(content).toContain("update({ scored: true })")
    // And the loop must skip to next job
    expect(content).toContain('result.skipped++')
  })
})

describe('Positive feedback signal from applications', () => {
  it('fetches applications with job join in buildScoringPrompt', async () => {
    const { readFileSync } = await import('fs')
    const content = readFileSync('supabase/functions/_shared/handlers/ai-scoring.ts', 'utf8')
    expect(content).toContain("from('applications')")
    expect(content).toContain("select('job_id, jobs(employer_type, visa_path, company)')")
    expect(content).toContain('ninetyDaysAgo')
  })

  it('no applications → no positive signal section', async () => {
    const { readFileSync } = await import('fs')
    const content = readFileSync('supabase/functions/_shared/handlers/ai-scoring.ts', 'utf8')
    expect(content).toContain("let positiveSection = ''")
    expect(content).toContain('if (appJobs && appJobs.length > 0)')
  })

  it('applications to universities → includes employer_type in positive section', async () => {
    const { readFileSync } = await import('fs')
    const content = readFileSync('supabase/functions/_shared/handlers/ai-scoring.ts', 'utf8')
    expect(content).toContain('employerTypeCounts')
    expect(content).toContain("job.employer_type !== 'unknown'")
    expect(content).toContain('`${t} (${c})`')
    expect(content).toContain('Employer type:')
  })

  it('positive boost capped at +0.05', async () => {
    const { readFileSync } = await import('fs')
    const content = readFileSync('supabase/functions/_shared/handlers/ai-scoring.ts', 'utf8')
    expect(content).toContain('up to +0.05')
    expect(content).toContain('max total boost: +0.05')
  })

  it('positive and negative signals coexist in prompt template', async () => {
    const { readFileSync } = await import('fs')
    const content = readFileSync('supabase/functions/_shared/handlers/ai-scoring.ts', 'utf8')
    expect(content).toContain("${voteSection ? `${voteSection}\\n\\n` : ''}${positiveSection ? `${positiveSection}\\n\\n` : ''}")
  })

  it('excludes unknown employer_type and visa_path from aggregation', async () => {
    const { readFileSync } = await import('fs')
    const content = readFileSync('supabase/functions/_shared/handlers/ai-scoring.ts', 'utf8')
    expect(content).toContain("job.employer_type !== 'unknown'")
    expect(content).toContain("job.visa_path !== 'unknown'")
  })

  it('limits company list to top 5', async () => {
    const { readFileSync } = await import('fs')
    const content = readFileSync('supabase/functions/_shared/handlers/ai-scoring.ts', 'utf8')
    expect(content).toContain('.slice(0, 5)')
    expect(content).toContain('Companies applied to:')
  })

  it('includes boost logic instructions for AI', async () => {
    const { readFileSync } = await import('fs')
    const content = readFileSync('supabase/functions/_shared/handlers/ai-scoring.ts', 'utf8')
    expect(content).toContain('Boost logic:')
    expect(content).toContain('add +0.05 to match_score')
    expect(content).toContain('add +0.03')
    expect(content).toContain('add +0.02')
    expect(content).toContain('Clamp final match_score to [0.0, 1.0]')
  })

  it('sorts employer types and visa paths by count descending', async () => {
    const { readFileSync } = await import('fs')
    const content = readFileSync('supabase/functions/_shared/handlers/ai-scoring.ts', 'utf8')
    expect(content).toContain('sortedEmployerTypes')
    expect(content).toContain('sortedVisaPaths')
    expect(content).toContain('.sort((a, b) => b[1] - a[1])')
  })
})

describe('is_job_posting field (uiib: validity vs relevance split)', () => {
  it('Zod schema includes is_job_posting boolean', async () => {
    const { readFileSync } = await import('fs')
    const content = readFileSync('supabase/functions/_shared/handlers/ai-scoring.ts', 'utf8')
    // The schema must declare is_job_posting as a boolean field
    expect(content).toContain('is_job_posting: z.boolean()')
  })

  it('rubric instructs Claude to set is_job_posting explicitly', async () => {
    const { readFileSync } = await import('fs')
    const content = readFileSync('supabase/functions/_shared/handlers/ai-scoring.ts', 'utf8')
    expect(content).toContain('is_job_posting=true')
    expect(content).toContain('is_job_posting=false')
    // Rubric calls out the relationship between the flag and match_score
    expect(content).toContain('is_job_posting=false ALWAYS implies match_score=0')
  })

  it('handler applies defensive invariant when Claude violates the relationship', async () => {
    const { readFileSync } = await import('fs')
    const content = readFileSync('supabase/functions/_shared/handlers/ai-scoring.ts', 'utf8')
    // If is_job_posting=false but match_score>0, force match_score to 0
    expect(content).toContain('output.is_job_posting === false && output.match_score > 0')
    expect(content).toContain('Filtered: Claude classified as non-posting but assigned score')
  })

  it('zero-score path persists is_job_posting on discovered_jobs', async () => {
    const { readFileSync } = await import('fs')
    const content = readFileSync('supabase/functions/_shared/handlers/ai-scoring.ts', 'utf8')
    // Both update sites must propagate the flag (string match for the literal payload)
    expect(content).toContain('{ scored: true, is_job_posting: output.is_job_posting }')
  })

  it('success path persists is_job_posting on discovered_jobs', async () => {
    const { readFileSync } = await import('fs')
    const content = readFileSync('supabase/functions/_shared/handlers/ai-scoring.ts', 'utf8')
    // Verify the literal payload appears more than once (zero-score skip + post-upsert mark)
    const matches = content.match(/\{ scored: true, is_job_posting: output\.is_job_posting \}/g) ?? []
    expect(matches.length).toBeGreaterThanOrEqual(2)
  })

  it('bulk-skip writes (filter + dedup) leave is_job_posting NULL', async () => {
    const { readFileSync } = await import('fs')
    const content = readFileSync('supabase/functions/_shared/handlers/ai-scoring.ts', 'utf8')
    // The pre-Claude bulk update is intentionally `{ scored: true }` only — those rows
    // never reached Claude, so we have no signal. Leaving is_job_posting NULL excludes
    // them from validity_rate denominator.
    const bulkMatches = content.match(/\.update\(\{ scored: true \}\)\n\s+\.in\('id',/g) ?? []
    expect(bulkMatches.length).toBeGreaterThanOrEqual(2) // filter skip + dedup skip
  })
})

describe('SCORING_RUBRIC content', () => {
  // We can't easily import the rubric from the Deno module in Vitest,
  // so we read the file and check string content
  it('includes posting gate instruction', async () => {
    const { readFileSync } = await import('fs')
    const content = readFileSync('supabase/functions/_shared/handlers/ai-scoring.ts', 'utf8')
    expect(content).toContain('Is this an actual job posting?')
    expect(content).toContain('careers landing page')
    // Either explicit 0 or 0.0 is acceptable — both are present in the rubric now
    expect(content).toContain('match_score = 0.0')
  })

  it('includes geographic gate instruction', async () => {
    const { readFileSync } = await import('fs')
    const content = readFileSync('supabase/functions/_shared/handlers/ai-scoring.ts', 'utf8')
    expect(content).toContain('United States or Canada only')
    expect(content).toContain('located in Europe')
  })

  it('includes cap-exempt employer lookup in buildScoringPrompt', async () => {
    const { readFileSync } = await import('fs')
    const content = readFileSync('supabase/functions/_shared/handlers/ai-scoring.ts', 'utf8')
    expect(content).toContain("from('cap_exempt_employers')")
    expect(content).toContain('Known Cap-Exempt Employers')
  })

  it('includes quantified vote feedback injection in buildScoringPrompt', async () => {
    const { readFileSync } = await import('fs')
    const content = readFileSync('supabase/functions/_shared/handlers/ai-scoring.ts', 'utf8')
    expect(content).toContain("eq('decision', 'not_for_me')")
    expect(content).toContain('User Feedback Penalties')
    expect(content).toContain('TAG_PENALTIES')
    expect(content).toContain('ninetyDaysAgo')
    expect(content).toContain('Math.min(1.0, count / 5)')
  })
})
