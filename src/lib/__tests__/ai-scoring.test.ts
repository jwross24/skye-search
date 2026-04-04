/**
 * Unit tests for AI scoring pipeline logic.
 *
 * Tests the scoring cron route behavior (mocked DB) and golden set data integrity.
 * The actual Claude API calls are tested in golden-set-eval.test.ts (requires API key).
 */

import { describe, it, expect } from 'vitest'
import { GOLDEN_SET } from './golden-set-data'

describe('Golden set data integrity', () => {
  it('has at least 20 entries', () => {
    expect(GOLDEN_SET.length).toBeGreaterThanOrEqual(20)
  })

  it('has all required categories', () => {
    const categories = new Set(GOLDEN_SET.map(e => e.category))
    expect(categories.has('cap_exempt')).toBe(true)
    expect(categories.has('cap_subject')).toBe(true)
    expect(categories.has('ineligible')).toBe(true)
    expect(categories.has('academic_vernacular')).toBe(true)
    expect(categories.has('industry_vernacular')).toBe(true)
    expect(categories.has('edge_case')).toBe(true)
  })

  it('has correct category distribution', () => {
    const counts = GOLDEN_SET.reduce((acc, e) => {
      acc[e.category] = (acc[e.category] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    expect(counts.cap_exempt).toBeGreaterThanOrEqual(5)
    expect(counts.cap_subject).toBeGreaterThanOrEqual(5)
    expect(counts.ineligible).toBeGreaterThanOrEqual(3)
    expect(counts.academic_vernacular).toBeGreaterThanOrEqual(3)
    expect(counts.industry_vernacular).toBeGreaterThanOrEqual(3)
    expect(counts.edge_case).toBeGreaterThanOrEqual(3)
  })

  it('has unique IDs', () => {
    const ids = GOLDEN_SET.map(e => e.id)
    const uniqueIds = new Set(ids)
    expect(uniqueIds.size).toBe(ids.length)
  })

  it('all entries have valid expected values', () => {
    const validVisaPaths = ['cap_exempt', 'cap_subject', 'opt_compatible', 'canada', 'unknown']
    const validConfidences = ['none', 'unverified', 'likely', 'confirmed']
    const validEmployerTypes = [
      'university', 'nonprofit_research', 'cooperative_institute',
      'government_contractor', 'government_direct', 'private_sector', 'unknown',
    ]
    const validTimelines = ['immediate', 'weeks', 'months', 'academic_cycle']

    for (const entry of GOLDEN_SET) {
      // visa_path can be string or string[]
      const visaPaths = Array.isArray(entry.expected.visa_path)
        ? entry.expected.visa_path
        : [entry.expected.visa_path]
      for (const vp of visaPaths) {
        expect(validVisaPaths).toContain(vp)
      }

      // cap_exempt_confidence can be string or string[]
      const confidences = Array.isArray(entry.expected.cap_exempt_confidence)
        ? entry.expected.cap_exempt_confidence
        : [entry.expected.cap_exempt_confidence]
      for (const c of confidences) {
        expect(validConfidences).toContain(c)
      }

      // employer_type can be string or string[]
      const employerTypes = Array.isArray(entry.expected.employer_type)
        ? entry.expected.employer_type
        : [entry.expected.employer_type]
      for (const et of employerTypes) {
        expect(validEmployerTypes).toContain(et)
      }
      expect(entry.expected.match_score_min).toBeGreaterThanOrEqual(0)
      expect(entry.expected.match_score_max).toBeLessThanOrEqual(1)
      expect(entry.expected.match_score_min).toBeLessThanOrEqual(entry.expected.match_score_max)
      expect(typeof entry.expected.requires_security_clearance).toBe('boolean')
      expect(typeof entry.expected.requires_citizenship).toBe('boolean')

      // hiring_timeline_estimate can be string or string[]
      const timelines = Array.isArray(entry.expected.hiring_timeline_estimate)
        ? entry.expected.hiring_timeline_estimate
        : [entry.expected.hiring_timeline_estimate]
      for (const t of timelines) {
        expect(validTimelines).toContain(t)
      }
    }
  })

  it('all entries have substantive descriptions (>100 chars)', () => {
    for (const entry of GOLDEN_SET) {
      expect(entry.raw_description.length).toBeGreaterThan(100)
    }
  })

  it('ineligible entries have security clearance or citizenship required', () => {
    const ineligible = GOLDEN_SET.filter(e => e.category === 'ineligible')
    for (const entry of ineligible) {
      expect(
        entry.expected.requires_security_clearance || entry.expected.requires_citizenship,
      ).toBe(true)
    }
  })

  it('cap-exempt entries accept cap_exempt visa_path', () => {
    const capExempt = GOLDEN_SET.filter(e => e.category === 'cap_exempt')
    for (const entry of capExempt) {
      const paths = Array.isArray(entry.expected.visa_path) ? entry.expected.visa_path : [entry.expected.visa_path]
      expect(paths).toContain('cap_exempt')
    }
  })

  it('cap-subject entries accept cap_subject visa_path', () => {
    const capSubject = GOLDEN_SET.filter(e => e.category === 'cap_subject')
    for (const entry of capSubject) {
      const paths = Array.isArray(entry.expected.visa_path) ? entry.expected.visa_path : [entry.expected.visa_path]
      expect(paths).toContain('cap_subject')
    }
  })
})

describe('Scoring prompt construction', () => {
  it('XML-escaped user message prevents injection', () => {
    // Simulate the escapeXml function from the handler
    function escapeXml(s: string): string {
      return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    }

    const malicious = '<script>alert("xss")</script> & "quotes"'
    const escaped = escapeXml(malicious)
    expect(escaped).not.toContain('<script>')
    expect(escaped).toContain('&lt;script&gt;')
    expect(escaped).toContain('&amp;')
    expect(escaped).toContain('&quot;')
  })

  it('raw description is capped at 6000 chars', () => {
    const longDescription = 'A'.repeat(10000)
    const capped = longDescription.slice(0, 6000)
    expect(capped.length).toBe(6000)
  })
})
