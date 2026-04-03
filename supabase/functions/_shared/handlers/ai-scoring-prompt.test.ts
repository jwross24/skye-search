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

describe('SCORING_RUBRIC content', () => {
  // We can't easily import the rubric from the Deno module in Vitest,
  // so we read the file and check string content
  it('includes posting gate instruction', async () => {
    const { readFileSync } = await import('fs')
    const content = readFileSync('supabase/functions/_shared/handlers/ai-scoring.ts', 'utf8')
    expect(content).toContain('Is this an actual job posting?')
    expect(content).toContain('careers landing page')
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

  it('includes vote dismiss pattern injection in buildScoringPrompt', async () => {
    const { readFileSync } = await import('fs')
    const content = readFileSync('supabase/functions/_shared/handlers/ai-scoring.ts', 'utf8')
    expect(content).toContain("eq('decision', 'not_for_me')")
    expect(content).toContain('User Feedback Patterns')
  })
})
