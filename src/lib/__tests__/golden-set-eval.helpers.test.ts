/**
 * Unit tests for golden-set-eval helper functions.
 *
 * Uses synthetic source strings — does NOT read ai-scoring.ts.
 * This ensures these tests remain stable as ai-scoring.ts evolves.
 */

import { describe, it, expect } from 'vitest'
import {
  extractTemplateLiteral,
  validateRubric,
  validateTable,
} from './golden-set-eval.test'

// ─── extractTemplateLiteral ───────────────────────────────────────────────────

describe('extractTemplateLiteral', () => {
  it('extracts content from a simple const X = `content`.trim() source', () => {
    const source = "const MY_VAR = `hello world`.trim()"
    expect(extractTemplateLiteral(source, 'MY_VAR')).toBe('hello world')
  })

  it('extracts multiline content', () => {
    const source = "const MY_VAR = `\nline one\nline two\n`.trim()"
    const result = extractTemplateLiteral(source, 'MY_VAR')
    expect(result).toContain('line one')
    expect(result).toContain('line two')
  })

  it('throws a clear error when variable is not found', () => {
    const source = "const OTHER_VAR = `content`.trim()"
    expect(() => extractTemplateLiteral(source, 'MISSING_VAR')).toThrow(
      'Failed to extract MISSING_VAR from source',
    )
  })

  it('trims leading and trailing whitespace from extracted content', () => {
    const source = "const MY_VAR = `\n  padded content  \n`.trim()"
    const result = extractTemplateLiteral(source, 'MY_VAR')
    expect(result).toBe('padded content')
  })
})

// ─── validateRubric ───────────────────────────────────────────────────────────

// Build a synthetic rubric string that satisfies all guards
const SENTINEL_RUBRIC =
  'Is this an actual job posting?\nGovernment Contractor Disambiguation\n' +
  'x'.repeat(5000)

describe('validateRubric', () => {
  it('throws when rubric is too short (< 5000 chars)', () => {
    const shortRubric =
      'Is this an actual job posting?\nGovernment Contractor Disambiguation'
    expect(() => validateRubric(shortRubric)).toThrow(
      /SCORING_RUBRIC too short .* chars\) — regex likely truncated/,
    )
  })

  it('throws when posting-gate sentinel is missing', () => {
    const rubric =
      'Government Contractor Disambiguation\n' + 'x'.repeat(5000)
    expect(() => validateRubric(rubric)).toThrow(
      'SCORING_RUBRIC missing posting-gate sentinel — source may have been refactored',
    )
  })

  it('throws when contractor-disambiguation sentinel is missing', () => {
    const rubric =
      'Is this an actual job posting?\n' + 'x'.repeat(5000)
    expect(() => validateRubric(rubric)).toThrow(
      'SCORING_RUBRIC missing contractor-disambiguation sentinel — source may have been refactored',
    )
  })

  it('accepts a valid synthetic rubric with both sentinels and sufficient length', () => {
    expect(() => validateRubric(SENTINEL_RUBRIC)).not.toThrow()
  })
})

// ─── validateTable ────────────────────────────────────────────────────────────

// Build a synthetic table string that satisfies all guards
const SENTINEL_TABLE = 'SeaDAS → satellite imagery processing\n' + 'x'.repeat(1000)

describe('validateTable', () => {
  it('throws when table is too short (< 1000 chars)', () => {
    const shortTable = 'SeaDAS → satellite imagery processing'
    expect(() => validateTable(shortTable)).toThrow(
      /TRANSLATION_TABLE too short .* chars\) — regex likely truncated/,
    )
  })

  it('throws when SeaDAS sentinel is missing', () => {
    const table = 'x'.repeat(1000)
    expect(() => validateTable(table)).toThrow(
      'TRANSLATION_TABLE missing SeaDAS sentinel — source may have been refactored',
    )
  })

  it('accepts a valid synthetic table with SeaDAS sentinel and sufficient length', () => {
    expect(() => validateTable(SENTINEL_TABLE)).not.toThrow()
  })
})
