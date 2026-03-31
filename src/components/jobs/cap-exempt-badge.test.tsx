import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { VisaBadge, capExemptTiers, CAP_EXEMPT_DISCLAIMER } from '@/components/visa-badge'

describe('VisaBadge cap-exempt confidence tiers', () => {
  it('confirmed: solid background with checkmark', () => {
    const { container } = render(<VisaBadge visaPath="cap_exempt" confidence="confirmed" />)
    expect(screen.getByText('✓')).toBeTruthy()
    expect(screen.getByText('Cap-Exempt')).toBeTruthy()
    // Tooltip trigger wraps the badge — check the element with badge classes
    const badgeEl = container.querySelector('[class*="bg-badge-cap-exempt"][class*="text-white"]')
    expect(badgeEl).toBeTruthy()
  })

  it('likely: outline style, no icon', () => {
    render(<VisaBadge visaPath="cap_exempt" confidence="likely" />)
    const badge = screen.getByText('Cap-Exempt')
    expect(badge.className).toContain('bg-badge-cap-exempt/15')
    expect(badge.className).not.toContain('text-white')
    expect(screen.queryByText('✓')).toBeNull()
    expect(screen.queryByText('?')).toBeNull()
  })

  it('unverified: outline with question mark', () => {
    const { container } = render(<VisaBadge visaPath="cap_exempt" confidence="unverified" />)
    expect(screen.getByText('?')).toBeTruthy()
    const badgeEl = container.querySelector('[class*="bg-badge-cap-exempt/10"]')
    expect(badgeEl).toBeTruthy()
  })

  it('all tiers include text labels — never color-only', () => {
    for (const confidence of ['confirmed', 'likely', 'unverified', 'none'] as const) {
      const { unmount } = render(<VisaBadge visaPath="cap_exempt" confidence={confidence} />)
      expect(screen.getByText('Cap-Exempt')).toBeTruthy()
      unmount()
    }
  })

  it('badge green is distinct from jade theme green', () => {
    // badge-cap-exempt is #16a34a, jade is #059669
    const confirmed = capExemptTiers.confirmed.className
    expect(confirmed).toContain('badge-cap-exempt')
    expect(confirmed).not.toContain('jade')
  })

  it('tooltip trigger has cursor-help on cap-exempt badge', () => {
    const { container } = render(<VisaBadge visaPath="cap_exempt" confidence="confirmed" />)
    const badgeEl = container.querySelector('[class*="cursor-help"]')
    expect(badgeEl).toBeTruthy()
  })

  it('has accessible aria-label describing confidence tier', () => {
    render(<VisaBadge visaPath="cap_exempt" confidence="confirmed" />)
    const badge = screen.getByLabelText(/cap-exempt confirmed/i)
    expect(badge).toBeTruthy()
  })

  it('screen reader text for confirmed tier', () => {
    render(<VisaBadge visaPath="cap_exempt" confidence="confirmed" />)
    expect(screen.getByText('(confirmed)')).toHaveClass('sr-only')
  })
})

describe('VisaBadge non-cap-exempt paths', () => {
  it('cap-subject renders without tooltip', () => {
    render(<VisaBadge visaPath="cap_subject" />)
    expect(screen.getByText('Cap-Subject')).toBeTruthy()
    // No cursor-help (no tooltip)
    const badge = screen.getByText('Cap-Subject')
    expect(badge.className).not.toContain('cursor-help')
  })

  it('OPT compatible renders correctly', () => {
    render(<VisaBadge visaPath="opt_compatible" />)
    expect(screen.getByText('OPT Compatible')).toBeTruthy()
  })

  it('Canada renders correctly', () => {
    render(<VisaBadge visaPath="canada" />)
    expect(screen.getByText('Canada')).toBeTruthy()
  })

  it('Unknown renders correctly', () => {
    render(<VisaBadge visaPath="unknown" />)
    expect(screen.getByText('Unknown')).toBeTruthy()
  })
})

describe('CAP_EXEMPT_DISCLAIMER', () => {
  it('contains verification language', () => {
    expect(CAP_EXEMPT_DISCLAIMER).toContain('Verify')
    expect(CAP_EXEMPT_DISCLAIMER).toContain('USCIS')
  })
})
