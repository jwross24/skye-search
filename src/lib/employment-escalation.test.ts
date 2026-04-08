import { describe, it, expect } from 'vitest'
import { getEscalationLevel, getEscalationCopy } from './employment-escalation'
import type { EscalationLevel } from './employment-escalation'

describe('getEscalationLevel', () => {
  describe('previously confirmed (daysSinceConfirmed != null)', () => {
    it('returns none when confirmation not yet due (< 30 days)', () => {
      expect(getEscalationLevel(15, 60)).toBe('none')
      expect(getEscalationLevel(29, 60)).toBe('none')
      expect(getEscalationLevel(0, 10)).toBe('none')
    })

    it('returns day7 when 0-6 days overdue (30-36 days since confirmed)', () => {
      expect(getEscalationLevel(30, 60)).toBe('day7')
      expect(getEscalationLevel(33, 60)).toBe('day7')
      expect(getEscalationLevel(36, 60)).toBe('day7')
    })

    it('returns day14 when 7-22 days overdue (37-52 days since confirmed)', () => {
      expect(getEscalationLevel(37, 60)).toBe('day14')
      expect(getEscalationLevel(45, 80)).toBe('day14')
      expect(getEscalationLevel(52, 80)).toBe('day14')
    })

    it('returns day30 when 23-37 days overdue (53-67 days since confirmed)', () => {
      expect(getEscalationLevel(53, 90)).toBe('day30')
      expect(getEscalationLevel(60, 90)).toBe('day30')
      expect(getEscalationLevel(67, 90)).toBe('day30')
    })

    it('returns day45 when 38-52 days overdue (68-82 days since confirmed)', () => {
      expect(getEscalationLevel(68, 100)).toBe('day45')
      expect(getEscalationLevel(75, 100)).toBe('day45')
      expect(getEscalationLevel(82, 100)).toBe('day45')
    })

    it('returns day60 when 53+ days overdue (83+ days since confirmed)', () => {
      expect(getEscalationLevel(83, 120)).toBe('day60')
      expect(getEscalationLevel(100, 150)).toBe('day60')
      expect(getEscalationLevel(200, 250)).toBe('day60')
    })
  })

  describe('never confirmed (daysSinceConfirmed = null)', () => {
    it('returns none when activation < 7 days ago', () => {
      expect(getEscalationLevel(null, 0)).toBe('none')
      expect(getEscalationLevel(null, 3)).toBe('none')
      expect(getEscalationLevel(null, 6)).toBe('none')
    })

    it('returns day7 when 0-6 days overdue (7-13 days since activation)', () => {
      expect(getEscalationLevel(null, 7)).toBe('day7')
      expect(getEscalationLevel(null, 10)).toBe('day7')
      expect(getEscalationLevel(null, 13)).toBe('day7')
    })

    it('returns day14 when 7-22 days overdue (14-29 days since activation)', () => {
      expect(getEscalationLevel(null, 14)).toBe('day14')
      expect(getEscalationLevel(null, 20)).toBe('day14')
      expect(getEscalationLevel(null, 29)).toBe('day14')
    })

    it('returns day30 when 23-37 days overdue (30-44 days since activation)', () => {
      expect(getEscalationLevel(null, 30)).toBe('day30')
      expect(getEscalationLevel(null, 40)).toBe('day30')
      expect(getEscalationLevel(null, 44)).toBe('day30')
    })

    it('returns day45 when 38-52 days overdue (45-59 days since activation)', () => {
      expect(getEscalationLevel(null, 45)).toBe('day45')
      expect(getEscalationLevel(null, 50)).toBe('day45')
      expect(getEscalationLevel(null, 59)).toBe('day45')
    })

    it('returns day60 when 53+ days overdue (60+ days since activation)', () => {
      expect(getEscalationLevel(null, 60)).toBe('day60')
      expect(getEscalationLevel(null, 90)).toBe('day60')
    })
  })

  describe('boundary values', () => {
    it('day7 boundary: exactly 30 days since confirmed = day7 (just overdue)', () => {
      expect(getEscalationLevel(30, 60)).toBe('day7')
    })

    it('day14 boundary: exactly 37 days since confirmed = day14', () => {
      expect(getEscalationLevel(37, 60)).toBe('day14')
    })

    it('day30 boundary: exactly 53 days since confirmed = day30', () => {
      expect(getEscalationLevel(53, 90)).toBe('day30')
    })

    it('day45 boundary: exactly 68 days since confirmed = day45', () => {
      expect(getEscalationLevel(68, 100)).toBe('day45')
    })

    it('day60 boundary: exactly 83 days since confirmed = day60', () => {
      expect(getEscalationLevel(83, 120)).toBe('day60')
    })
  })
})

describe('getEscalationCopy', () => {
  const employer = 'UMass Boston'

  it('day7 copy is a gentle question', () => {
    const { banner, detail } = getEscalationCopy('day7', employer)
    expect(banner).toContain(employer)
    expect(banner).toContain('still active')
    expect(detail).toContain('accurate')
  })

  it('day14 copy mentions not recently confirmed', () => {
    const { banner, detail } = getEscalationCopy('day14', employer)
    expect(banner).toContain(employer)
    expect(banner).toContain("haven't confirmed")
    expect(detail).toContain('verify')
  })

  it('day30 copy mentions over a month', () => {
    const { banner, detail } = getEscalationCopy('day30', employer)
    expect(banner).toContain(employer)
    expect(banner).toContain('over a month')
    expect(detail).toContain('2 weeks')
  })

  it('day45 copy mentions "ended" and "immediately"', () => {
    const { banner, detail } = getEscalationCopy('day45', employer)
    expect(banner).toContain(employer)
    expect(banner).toContain('6 weeks')
    expect(detail).toContain('ended')
    expect(detail).toContain('immediately')
  })

  it('day60 copy mentions "unverified" and "immediately"', () => {
    const { banner, detail } = getEscalationCopy('day60', employer)
    expect(banner).toContain(employer)
    expect(banner).toContain('unverified')
    expect(detail).toContain('immediately')
    expect(detail).toContain('clock should be running')
  })

  it('all levels include employer name', () => {
    const levels: EscalationLevel[] = ['day7', 'day14', 'day30', 'day45', 'day60']
    for (const level of levels) {
      const { banner } = getEscalationCopy(level, 'Woods Hole')
      expect(banner).toContain('Woods Hole')
    }
  })

  it('no copy uses alarm words: WARNING, DANGER, CRITICAL, URGENT', () => {
    const levels: EscalationLevel[] = ['day7', 'day14', 'day30', 'day45', 'day60']
    const alarmWords = ['WARNING', 'DANGER', 'CRITICAL', 'URGENT']
    for (const level of levels) {
      const { banner, detail } = getEscalationCopy(level, employer)
      const combined = (banner + ' ' + detail).toUpperCase()
      for (const word of alarmWords) {
        expect(combined).not.toContain(word)
      }
    }
  })

  it('none level returns gentle default copy', () => {
    const { banner, detail } = getEscalationCopy('none', employer)
    expect(banner).toContain(employer)
    expect(detail).toContain('accurate')
  })
})
