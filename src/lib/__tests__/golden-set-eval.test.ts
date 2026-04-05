/**
 * Golden Set Evaluation — tests AI scoring against manually graded job descriptions.
 *
 * Uses the PRODUCTION scoring rubric (extracted from ai-scoring.ts at runtime)
 * to ensure the golden set tests the same prompt the pipeline uses.
 *
 * Requires ANTHROPIC_API_KEY and RUN_GOLDEN_SET=1 environment variables.
 * Not run in normal `bun run test` — only when explicitly requested.
 *
 * To run: RUN_GOLDEN_SET=1 bun run test -- golden-set-eval
 * (requires @anthropic-ai/sdk installed: bun add -d @anthropic-ai/sdk)
 *
 * Regression gate: >2 visa_path mismatches across full set → FAIL
 */

import { readFileSync } from 'fs'
import { describe, it, expect } from 'vitest'
import { GOLDEN_SET, type GoldenSetEntry } from './golden-set-data'

const SKIP = !process.env.RUN_GOLDEN_SET

// ─── Pure regex extractor — exported for unit tests ─────────────────────────
// Extracts a template literal assigned as: const VARNAME = `...`.trim()
// Exported so helpers.test.ts can test it with synthetic source strings.

export function extractTemplateLiteral(source: string, varName: string): string {
  const pattern = new RegExp(`const ${varName} = \`([\\s\\S]*?)\`\\.trim\\(\\)`)
  const match = source.match(pattern)
  if (!match?.[1]) {
    throw new Error(`Failed to extract ${varName} from source`)
  }
  return match[1].trim()
}

// ─── Content guards — exported for unit tests ────────────────────────────────
// Pure functions that throw on guard failure. Tested with synthetic inputs
// in golden-set-eval.helpers.test.ts so they don't depend on the real file.

export function validateRubric(rubric: string): void {
  if (rubric.length < 5000) {
    throw new Error(
      `SCORING_RUBRIC too short (${rubric.length} chars) — regex likely truncated at an embedded backtick`,
    )
  }
  if (!rubric.includes('Is this an actual job posting?')) {
    throw new Error(
      'SCORING_RUBRIC missing posting-gate sentinel — source may have been refactored',
    )
  }
  if (!rubric.includes('Government Contractor Disambiguation')) {
    throw new Error(
      'SCORING_RUBRIC missing contractor-disambiguation sentinel — source may have been refactored',
    )
  }
}

export function validateTable(table: string): void {
  if (table.length < 1000) {
    throw new Error(
      `TRANSLATION_TABLE too short (${table.length} chars) — regex likely truncated`,
    )
  }
  if (!table.includes('SeaDAS')) {
    throw new Error(
      'TRANSLATION_TABLE missing SeaDAS sentinel — source may have been refactored',
    )
  }
}

// ─── Lazy reader — only runs inside describe.skipIf block ───────────────────
// readFileSync is deferred here so that when RUN_GOLDEN_SET is unset the
// describe callback never executes and this function is never called.
// A broken ai-scoring.ts cannot crash the full test suite.

function getProductionRubric(): { rubric: string; table: string } {
  const source = readFileSync(
    'supabase/functions/_shared/handlers/ai-scoring.ts',
    'utf8',
  )
  const rubric = extractTemplateLiteral(source, 'SCORING_RUBRIC')
  const table = extractTemplateLiteral(source, 'TRANSLATION_TABLE')
  validateRubric(rubric)
  validateTable(table)
  return { rubric, table }
}

// Dynamic import to avoid Anthropic SDK dependency in normal test runs.
// The SDK is only available when explicitly installed for golden set runs.
async function scoreJob(entry: GoldenSetEntry, evalSystemPrompt: string) {
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

  const message = await client.messages.parse({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2048,
    temperature: 0,
    system: [{ type: 'text' as const, text: evalSystemPrompt }],
    messages: [{
      role: 'user' as const,
      content: `<job_description source_type="${entry.source_type}" title="${entry.title}" company="${entry.company}">\n${entry.raw_description}\n</job_description>`,
    }],
    output_config: { format: zodOutputFormat(ScoringOutputSchema) },
  })

  return message.parsed_output
}

describe.skipIf(SKIP)('Golden set evaluation', { timeout: 300_000 }, () => {
  // getProductionRubric() runs here — inside the describe callback, which
  // Vitest only evaluates when skipIf is false (RUN_GOLDEN_SET is set).
  // If the file is missing or guards fail, only golden-set tests fail.
  const { rubric: SCORING_RUBRIC, table: TRANSLATION_TABLE } = getProductionRubric()

  // ─── Build eval system prompt ────────────────────────────────────────────
  // Uses production rubric + translation table with a static candidate profile.
  // Dynamic sections (employer lookup, feedback penalties, positive patterns)
  // are omitted — the golden set tests scoring logic, not personalization.

  const EVAL_SYSTEM_PROMPT = `You are an immigration-aware job scoring system for an international PhD scientist.

## Candidate Profile

Field: Environmental science / Ocean color remote sensing
Skills: Ocean color remote sensing, satellite imagery processing (SeaDAS), Google Earth Engine, MODIS/VIIRS data analysis, coastal biogeochemistry, Python, R, MATLAB, NetCDF/HDF5, radiative transfer modeling
Research areas: Ocean color remote sensing, coastal biogeochemistry, phytoplankton dynamics, satellite validation

## Immigration Context

Visa: F-1 STEM OPT
Priority: Cap-exempt employers (universities, nonprofits, government labs) are highest priority because they can sponsor H1-B without annual cap limits. This candidate missed the FY2027 H1-B lottery.

## Academic ↔ Industry Translation Table
${TRANSLATION_TABLE}

${SCORING_RUBRIC}`

  const visaPathMismatches: string[] = []

  for (const entry of GOLDEN_SET) {
    it(`${entry.id}: ${entry.title} (${entry.category})`, { timeout: 30_000 }, async () => {
      const result = await scoreJob(entry, EVAL_SYSTEM_PROMPT)
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
