import { describe, it, expect } from 'vitest'
import { canonicalizeUrl } from './canonicalize'

describe('canonicalizeUrl', () => {
  it('strips utm parameters', () => {
    const result = canonicalizeUrl('https://example.com/jobs?utm_source=linkedin&utm_medium=social')
    console.log(`[Canon] utm strip: ${result}`)
    expect(result).toBe('https://example.com/jobs')
  })

  it('strips tracking tokens', () => {
    const result = canonicalizeUrl('https://example.com/apply?trk=abc&ref=def&sid=ghi&keep=yes')
    console.log(`[Canon] tracking strip: ${result}`)
    expect(result).toBe('https://example.com/apply?keep=yes')
  })

  it('strips hash fragments', () => {
    const result = canonicalizeUrl('https://example.com/jobs#section-2')
    console.log(`[Canon] hash strip: ${result}`)
    expect(result).toBe('https://example.com/jobs')
  })

  it('normalizes protocol to https', () => {
    const result = canonicalizeUrl('http://example.com/jobs')
    expect(result).toBe('https://example.com/jobs')
  })

  it('normalizes www prefix', () => {
    const result = canonicalizeUrl('https://www.example.com/jobs')
    expect(result).toBe('https://example.com/jobs')
  })

  it('strips trailing slash', () => {
    const result = canonicalizeUrl('https://example.com/jobs/')
    expect(result).toBe('https://example.com/jobs')
  })

  it('keeps root path slash', () => {
    const result = canonicalizeUrl('https://example.com/')
    expect(result).toBe('https://example.com/')
  })

  it('handles already-clean URLs', () => {
    const clean = 'https://example.com/jobs/12345'
    expect(canonicalizeUrl(clean)).toBe(clean)
  })

  it('handles empty string', () => {
    expect(canonicalizeUrl('')).toBe('')
  })

  it('strips fbclid and gclid tracking', () => {
    const result = canonicalizeUrl('https://example.com/apply?fbclid=abc123&gclid=xyz789')
    expect(result).toBe('https://example.com/apply')
  })

  it('preserves non-tracking query params', () => {
    const result = canonicalizeUrl('https://example.com/search?q=postdoc&location=boston&utm_source=google')
    expect(result).toContain('q=postdoc')
    expect(result).toContain('location=boston')
    expect(result).not.toContain('utm_source')
  })
})
