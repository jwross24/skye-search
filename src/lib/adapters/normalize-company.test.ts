import { describe, it, expect } from 'vitest'
import { normalizeCompany } from './normalize-company'

describe('normalizeCompany', () => {
  it('strips Inc suffix', () => {
    expect(normalizeCompany('Acme, Inc.')).toBe('acme')
  })

  it('strips LLC suffix', () => {
    expect(normalizeCompany('Widget LLC')).toBe('widget')
  })

  it('strips Corporation suffix', () => {
    expect(normalizeCompany('Big Corp Corporation')).toBe('big corp')
  })

  it('strips Corp suffix', () => {
    expect(normalizeCompany('Science Corp.')).toBe('science')
  })

  it('lowercases', () => {
    expect(normalizeCompany('MIT Lincoln Laboratory')).toBe('mit lincoln laboratory')
  })

  it('trims whitespace', () => {
    expect(normalizeCompany('  NOAA  ')).toBe('noaa')
  })

  it('handles compound names', () => {
    expect(normalizeCompany('University of Colorado Boulder')).toBe('university of colorado boulder')
  })

  it('collapses internal whitespace', () => {
    expect(normalizeCompany('Planet   Labs')).toBe('planet labs')
  })

  it('handles empty string', () => {
    expect(normalizeCompany('')).toBe('')
  })

  it('strips Ltd suffix', () => {
    expect(normalizeCompany('Maxar Technologies Ltd.')).toBe('maxar technologies')
  })

  it('handles Inc without comma', () => {
    expect(normalizeCompany('Descartes Labs Inc')).toBe('descartes labs')
  })
})
