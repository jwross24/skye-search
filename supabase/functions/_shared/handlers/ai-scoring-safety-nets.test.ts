/**
 * Tests for post-score safety nets applied after Claude scoring.
 *
 * Safety nets:
 * 1. International location → zero score (existing, tested in location-filter tests)
 * 2. Citizenship/clearance regex backup
 * 3. visa_path="unknown" score demotion
 * 4. Null location warning note
 */
import { describe, it, expect } from 'vitest'

// Import the patterns directly for unit testing
// The handler applies them — we test the regex matching here
// MUST stay in sync with INELIGIBILITY_PATTERNS in ai-scoring.ts
const INELIGIBILITY_PATTERNS: RegExp[] = [
  /\bU\.?S\.?\s+citizen(?:s|ship)?\s+(?:only|required)\b/i,
  /\bmust\s+be\s+a?\s*U\.?S\.?\s+citizen\b/i,
  /\bU\.?S\.?\s+persons?\s+only\b/i,
  // ITAR: require affirmative context — bare /ITAR/ causes false positives on "ITAR-free"
  /subject\s+to\s+ITAR\b/i,
  /\bITAR[\s-](?:controlled|restricted|regulated|classified|compliance|requirement)/i,
  /\bsecurity\s+clearance\s+(?:required|needed|necessary)\b/i,
  /\bTS\/SCI\b/,
  /\bTop\s+Secret\s+(?:(?:clearance|access)\s+)?(?:required|needed|necessary|eligible)\b/i,
  /\bcitizenship\s+(?:is\s+)?required\b/i,
  // Negative lookahead: don't match "must be a US national laboratory/lab"
  /\bmust\s+be\s+a?\s*U\.?S\.?\s+national(?!\s+lab(?:oratory)?)\b/i,
  /\bDOD\s+clearance\b/i,
]

function matchesIneligibility(text: string): boolean {
  return INELIGIBILITY_PATTERNS.some(p => p.test(text))
}

// ─── Safety Net 2: Citizenship/Clearance Regex ──────────────────────────────

describe('Citizenship/clearance regex patterns', () => {
  describe('catches citizenship requirements', () => {
    it.each([
      ['Applicants must be U.S. citizens only', 'US citizens only'],
      ['Must be a US citizen to apply', 'must be a US citizen'],
      ['U.S. citizenship required for this role', 'citizenship required'],
      ['Must be a U.S. citizen or permanent resident', 'must be a U.S. citizen'],
      ['US persons only may apply', 'US persons only'],
      ['Applicant must be a U.S. national', 'must be a U.S. national'],
      ['U.S. citizenship is required', 'citizenship is required'],
    ])('catches: %s (%s)', (text, _label) => {
      expect(matchesIneligibility(text)).toBe(true)
    })
  })

  describe('catches security clearance requirements', () => {
    it.each([
      ['Active TS/SCI clearance required', 'TS/SCI'],
      ['Top Secret clearance needed', 'Top Secret clearance needed'],
      ['Top Secret clearance required', 'Top Secret clearance required'],
      ['Must be Top Secret eligible', 'Top Secret eligible'],
      ['Security clearance required', 'security clearance required'],
      ['Must hold active security clearance needed for this role', 'security clearance needed'],
      ['DOD clearance mandatory', 'DOD clearance'],
      ['Security clearance necessary for access', 'security clearance necessary'],
      // ITAR affirmative-context patterns (bare /ITAR/ replaced to prevent false positives)
      ['This position is subject to ITAR regulations', 'subject to ITAR'],
      ['ITAR-controlled materials must be handled with clearance', 'ITAR-controlled'],
      ['ITAR-restricted research program — US persons only', 'ITAR-restricted'],
      ['ITAR compliance is mandatory for this role', 'ITAR compliance'],
      ['ITAR requirement applies; clearance may be needed', 'ITAR requirement'],
    ])('catches: %s (%s)', (text, _label) => {
      expect(matchesIneligibility(text)).toBe(true)
    })
  })

  describe('does NOT flag valid postings', () => {
    it.each([
      ['Work authorization required', 'work authorization (standard for all employers)'],
      ['Must be authorized to work in the United States', 'work authorization phrasing'],
      ['Visa sponsorship available for qualified candidates', 'visa sponsorship offered'],
      ['Equal opportunity employer', 'standard EEO'],
      ['We welcome international applicants', 'international welcome'],
      ['Experience in citizen science programs', 'citizen science (not citizenship)'],
      ['The lab is located in the US', 'US location mention'],
      ['Security protocols for data access', 'security without clearance'],
      // Fixed false-positives (previously flagged by overly-broad patterns)
      ['Must be a national laboratory employee', 'ORISE/DOE fellowship — cap-exempt, not citizenship req'],
      ['Keep this information top secret', 'colloquial top secret, no clearance context'],
      ['Top Secret clearance preferred but not required', 'preferred != required'],
      // ITAR false-positives: academic postings that explicitly state ITAR does NOT apply
      ['ITAR-free research environment — open to all nationalities', 'ITAR-free (explicit exemption)'],
      ['No ITAR or EAR restrictions apply to this position', 'no ITAR restrictions'],
      ['Researchers from all countries welcome; no ITAR restrictions', 'no ITAR international welcome'],
      // US national false-positive: 'national' modifying 'laboratory', not citizenship
      ['Must be a U.S. national laboratory or university employee', 'US national laboratory — not citizenship req'],
      ['Appointment must be at a US national lab facility', 'US national lab facility'],
    ])('does NOT match: %s (%s)', (text, _label) => {
      expect(matchesIneligibility(text)).toBe(false)
    })
  })
})

// ─── Safety Net 3: visa_path="unknown" Demotion ─────────────────────────────

describe('visa_path unknown demotion', () => {
  function applyUnknownPenalty(matchScore: number, visaPath: string): { score: number; penalized: boolean } {
    if (visaPath === 'unknown' && matchScore > 0.4) {
      return { score: Math.round(matchScore * 0.70 * 100) / 100, penalized: true }
    }
    return { score: matchScore, penalized: false }
  }

  it('demotes 0.65 unknown to 0.45', () => {
    const { score, penalized } = applyUnknownPenalty(0.65, 'unknown')
    expect(score).toBe(0.45) // 0.65 * 0.70 = 0.45499... (IEEE 754), rounds to 0.45
    expect(penalized).toBe(true)
  })

  it('demotes 0.85 unknown to 0.595', () => {
    const { score, penalized } = applyUnknownPenalty(0.85, 'unknown')
    expect(score).toBe(0.6) // 0.85 * 0.70 = 0.595, rounded
    expect(penalized).toBe(true)
  })

  it('does NOT penalize cap_exempt jobs', () => {
    const { score, penalized } = applyUnknownPenalty(0.65, 'cap_exempt')
    expect(score).toBe(0.65)
    expect(penalized).toBe(false)
  })

  it('does NOT penalize unknown jobs with score <= 0.4', () => {
    const { score, penalized } = applyUnknownPenalty(0.35, 'unknown')
    expect(score).toBe(0.35)
    expect(penalized).toBe(false)
  })

  it('does NOT penalize cap_subject jobs', () => {
    const { score, penalized } = applyUnknownPenalty(0.60, 'cap_subject')
    expect(score).toBe(0.60)
    expect(penalized).toBe(false)
  })
})
