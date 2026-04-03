import { describe, it, expect } from 'vitest'
import { selectTemplate, buildMessage, type NudgeContext } from './nudge-templates'

function log(step: string, detail: string) {
  process.stdout.write(`  [nudge-templates] ${step}: ${detail}\n`)
}

const basePick = {
  title: 'Physical Scientist',
  company: 'NOAA',
  matchScore: 0.92,
  visaPath: 'cap_exempt',
  url: 'https://example.com/job',
}

describe('selectTemplate', () => {
  it('selects urgent_clock when <=15 days', () => {
    log('1', 'Testing urgent_clock selection')
    expect(selectTemplate({ daysRemaining: 15, topPick: basePick })).toBe('urgent_clock')
    expect(selectTemplate({ daysRemaining: 5, topPick: null })).toBe('urgent_clock')
  })

  it('selects warm_clock when 16-50 days', () => {
    log('1', 'Testing warm_clock selection')
    expect(selectTemplate({ daysRemaining: 50, topPick: basePick })).toBe('warm_clock')
    expect(selectTemplate({ daysRemaining: 30, topPick: null })).toBe('warm_clock')
  })

  it('selects welcome_back after 2+ days away', () => {
    log('1', 'Testing welcome_back selection')
    expect(selectTemplate({ daysRemaining: 119, topPick: basePick, daysSinceLastOpen: 3 })).toBe('welcome_back')
  })

  it('selects standard with a match', () => {
    log('1', 'Testing standard selection')
    expect(selectTemplate({ daysRemaining: 119, topPick: basePick })).toBe('standard')
  })

  it('selects no_match without a match', () => {
    log('1', 'Testing no_match selection')
    expect(selectTemplate({ daysRemaining: 119, topPick: null })).toBe('no_match')
  })

  it('urgent overrides welcome_back', () => {
    log('1', 'Testing urgent overrides welcome_back')
    expect(selectTemplate({ daysRemaining: 10, topPick: basePick, daysSinceLastOpen: 5 })).toBe('urgent_clock')
  })
})

describe('buildMessage', () => {
  it('standard includes clock + pick + cap-exempt', () => {
    log('1', 'Building standard message')
    const msg = buildMessage({ daysRemaining: 119, topPick: basePick })
    log('2', `Message length: ${msg.length}`)

    expect(msg).toContain('119 days')
    expect(msg).toContain('Physical Scientist')
    expect(msg).toContain('NOAA')
    expect(msg).toContain('92% match')
    expect(msg).toContain('cap-exempt')
    expect(msg).toContain('https://example.com/job')
    expect(msg).toContain('momentum')
  })

  it('no_match includes clock + encouragement', () => {
    log('1', 'Building no_match message')
    const msg = buildMessage({ daysRemaining: 119, topPick: null })

    expect(msg).toContain('119 days')
    expect(msg).toContain('No new standout')
    expect(msg).toContain('got this')
  })

  it('welcome_back includes clock + best match', () => {
    log('1', 'Building welcome_back message')
    const msg = buildMessage({ daysRemaining: 100, topPick: basePick, daysSinceLastOpen: 4 })

    expect(msg).toContain('Welcome back')
    expect(msg).toContain('100 days')
    expect(msg).toContain('Physical Scientist')
  })

  it('warm_clock uses focused language', () => {
    log('1', 'Building warm_clock message')
    const msg = buildMessage({ daysRemaining: 30, topPick: basePick })

    expect(msg).toContain('30 days')
    expect(msg).toContain('strongest leads')
    expect(msg).toContain('plan')
  })

  it('urgent_clock uses supportive but direct language', () => {
    log('1', 'Building urgent_clock message')
    const msg = buildMessage({ daysRemaining: 10, topPick: basePick })

    expect(msg).toContain('10 days')
    expect(msg).toContain('Priority')
    expect(msg).toContain('Every application counts')
  })

  it('never contains alarm language', () => {
    log('1', 'Checking all templates for alarm words')
    const contexts: NudgeContext[] = [
      { daysRemaining: 119, topPick: basePick },
      { daysRemaining: 119, topPick: null },
      { daysRemaining: 30, topPick: basePick },
      { daysRemaining: 10, topPick: basePick },
      { daysRemaining: 100, topPick: basePick, daysSinceLastOpen: 5 },
    ]

    for (const ctx of contexts) {
      const msg = buildMessage(ctx)
      expect(msg).not.toMatch(/WARNING|URGENT|CRITICAL|DANGER|ALERT|hurry|panic|missed|failed/i)
    }
    log('2', 'No alarm language found in any template')
  })

  it('non-cap-exempt jobs do not say cap-exempt', () => {
    log('1', 'Testing cap_subject pick')
    const msg = buildMessage({
      daysRemaining: 119,
      topPick: { ...basePick, visaPath: 'cap_subject' },
    })

    expect(msg).not.toContain('cap-exempt')
    expect(msg).toContain('92% match')
  })

  it('messages are under 320 chars (web push payload limit)', () => {
    log('1', 'Checking message lengths')
    const contexts: NudgeContext[] = [
      { daysRemaining: 119, topPick: basePick },
      { daysRemaining: 119, topPick: null },
      { daysRemaining: 30, topPick: basePick },
      { daysRemaining: 10, topPick: basePick },
    ]

    for (const ctx of contexts) {
      const msg = buildMessage(ctx)
      expect(msg.length).toBeLessThan(320)
    }
    log('2', 'All under 320 chars')
  })
})
