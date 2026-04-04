/**
 * Golden Set Evaluation — tests AI scoring against manually graded job descriptions.
 *
 * Requires ANTHROPIC_API_KEY and RUN_GOLDEN_SET=1 environment variables.
 * Not run in normal `bun run test` — only when explicitly requested.
 *
 * To run: RUN_GOLDEN_SET=1 bun run test -- golden-set-eval
 * (requires @anthropic-ai/sdk installed: bun add -d @anthropic-ai/sdk)
 *
 * Regression gate: >2 visa_path mismatches across full set → FAIL
 */

import { describe, it, expect } from 'vitest'
import { GOLDEN_SET, type GoldenSetEntry } from './golden-set-data'

const SKIP = !process.env.RUN_GOLDEN_SET

// Dynamic import to avoid Anthropic SDK dependency in normal test runs.
// The SDK is only available when explicitly installed for golden set runs.
async function scoreJob(entry: GoldenSetEntry) {
  const Anthropic = (await import('@anthropic-ai/sdk')).default
  const { zodOutputFormat } = await import('@anthropic-ai/sdk/helpers/zod')
  const { z } = await import('zod')

  const ScoringOutputSchema = z.object({
    visa_path: z.enum(['cap_exempt', 'cap_subject', 'opt_compatible', 'canada', 'unknown']),
    cap_exempt_confidence: z.enum(['none', 'unverified', 'likely', 'confirmed']),
    employer_type: z.enum([
      'university', 'nonprofit_research', 'cooperative_institute',
      'government_contractor', 'government_direct', 'private_sector', 'unknown',
    ]),
    employment_type: z.enum(['full_time', 'part_time', 'contract', 'unknown']),
    match_score: z.number().min(0).max(1),
    why_fits: z.string(),
    skills_academic_equiv: z.array(z.string()),
    application_deadline: z.string().nullable(),
    hiring_timeline_estimate: z.enum(['immediate', 'weeks', 'months', 'academic_cycle']),
    requires_security_clearance: z.boolean(),
    requires_citizenship: z.boolean(),
    location: z.string().nullable(),
    salary: z.string().nullable(),
    remote_status: z.string().nullable(),
  })

  const client = new Anthropic({ dangerouslyAllowBrowser: true })

  // Simplified system prompt for golden set (same rubric, generic profile)
  const systemPrompt = `You are an immigration-aware job scoring system for an international PhD environmental scientist.

## Candidate Profile
Field: Environmental science / Ocean color remote sensing
Skills: Ocean color remote sensing, SeaDAS, Google Earth Engine, MODIS/VIIRS/PACE, coastal biogeochemistry, Python, R, MATLAB, NetCDF/HDF5, radiative transfer modeling, phytoplankton dynamics
Visa: F-1 STEM OPT. Cap-exempt employers are highest priority (H1-B without annual cap).

## Scoring Instructions

### visa_path
- cap_exempt: Universities, 501(c)(3) nonprofits, government research labs, cooperative institutes.
- cap_subject: Private sector subject to H1-B annual cap.
- opt_compatible: Can work under OPT without H1-B.
- canada: Canadian employers.
- unknown: Cannot determine.

### cap_exempt_confidence
- confirmed: Explicitly university/nonprofit/government. - likely: Strong indicators (.edu, NIH/NSF/NOAA). - unverified: Ambiguous hints. - none: No indicators.

### employer_type
university, nonprofit_research, cooperative_institute, government_contractor, government_direct, private_sector, unknown.

### Government Contractor Disambiguation (CRITICAL for visa_path)
When a posting mentions work at a government agency (NASA, NOAA, DOE) but the EMPLOYER is a private company:
- "Inc.", "LLC", "Corporation" → cap_subject (private sector).
- KNOWN cap_subject: SSAI, GST Inc., SAIC, Booz Allen Hamilton, Leidos.
- KNOWN cap_exempt: Battelle (501(c)(3)), UCAR (501(c)(3)), ORAU (501(c)(3)).
- "SSAI at NASA Goddard" → employer is SSAI (cap_subject), NOT NASA.
- When in doubt: classify as cap_subject.

### match_score (0.0-1.0)
0.85-1.0: STRONG (core domain). 0.65-0.85: GOOD (related, skills transfer). 0.40-0.65: MODERATE (adjacent, retraining). 0.15-0.40: STRETCH (method overlap only). 0.0-0.15: NO MATCH.

### why_fits
Reference specific candidate skills.

### hiring_timeline_estimate
immediate, weeks, months, academic_cycle.

### requires_security_clearance / requires_citizenship
true if posting mentions clearance, US citizen only, ITAR. "work authorization required" is NOT citizenship.

### skills_academic_equiv
Map required skills to academic equivalents.`

  const message = await client.messages.parse({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2048,
    temperature: 0,
    system: [{ type: 'text' as const, text: systemPrompt }],
    messages: [{
      role: 'user' as const,
      content: `<job_description source_type="${entry.source_type}" title="${entry.title}" company="${entry.company}">\n${entry.raw_description}\n</job_description>`,
    }],
    output_config: { format: zodOutputFormat(ScoringOutputSchema) },
  })

  return message.parsed_output
}

describe.skipIf(SKIP)('Golden set evaluation', { timeout: 300_000 }, () => {
  const visaPathMismatches: string[] = []

  for (const entry of GOLDEN_SET) {
    it(`${entry.id}: ${entry.title} (${entry.category})`, { timeout: 30_000 }, async () => {
      const result = await scoreJob(entry)
      expect(result).toBeDefined()
      if (!result) return

      // visa_path: exact match or one of accepted values (critical for immigration guidance)
      const validVisaPaths = Array.isArray(entry.expected.visa_path)
        ? entry.expected.visa_path
        : [entry.expected.visa_path]
      if (!validVisaPaths.includes(result.visa_path)) {
        visaPathMismatches.push(`${entry.id}: expected ${validVisaPaths.join('|')}, got ${result.visa_path}`)
      }
      expect(validVisaPaths).toContain(result.visa_path)

      // cap_exempt_confidence: exact match (or one of accepted values)
      const validConfidences = Array.isArray(entry.expected.cap_exempt_confidence)
        ? entry.expected.cap_exempt_confidence
        : [entry.expected.cap_exempt_confidence]
      expect(validConfidences).toContain(result.cap_exempt_confidence)

      // match_score: within range
      expect(result.match_score).toBeGreaterThanOrEqual(entry.expected.match_score_min)
      expect(result.match_score).toBeLessThanOrEqual(entry.expected.match_score_max)

      // Ineligibility flags: exact match (safety-critical)
      expect(result.requires_security_clearance).toBe(entry.expected.requires_security_clearance)
      expect(result.requires_citizenship).toBe(entry.expected.requires_citizenship)

      // hiring_timeline_estimate: exact match (or one of accepted values)
      const validTimelines = Array.isArray(entry.expected.hiring_timeline_estimate)
        ? entry.expected.hiring_timeline_estimate
        : [entry.expected.hiring_timeline_estimate]
      expect(validTimelines).toContain(result.hiring_timeline_estimate)

      // why_fits: non-empty and substantive
      expect(result.why_fits.length).toBeGreaterThan(20)
    })
  }

  it('regression gate: <=2 visa_path mismatches across full set', () => {
    if (visaPathMismatches.length > 2) {
      const details = visaPathMismatches.join('\n  ')
      expect.fail(
        `${visaPathMismatches.length} visa_path mismatches (max 2):\n  ${details}`,
      )
    }
  })
})
