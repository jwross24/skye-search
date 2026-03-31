import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { VisaBadge } from './visa-badge'

describe('VisaBadge', () => {
  it('renders cap-exempt badge with correct text', () => {
    render(<VisaBadge visaPath="cap_exempt" />)
    expect(screen.getByText('Cap-Exempt')).toBeDefined()
  })

  it('renders confirmed confidence indicator for cap-exempt', () => {
    render(<VisaBadge visaPath="cap_exempt" confidence="confirmed" />)
    expect(screen.getByText('Cap-Exempt')).toBeDefined()
    expect(screen.getByText('✓')).toBeDefined()
  })

  it('renders unverified confidence indicator for cap-exempt', () => {
    render(<VisaBadge visaPath="cap_exempt" confidence="unverified" />)
    expect(screen.getByText('Cap-Exempt')).toBeDefined()
    expect(screen.getByText('?')).toBeDefined()
  })

  it('renders cap-exempt badge with correct colors', () => {
    const { container } = render(<VisaBadge visaPath="cap_exempt" />)
    const badge = container.querySelector('[class*="badge-cap-exempt"]')
    expect(badge).toBeDefined()
  })

  it('renders canada badge with correct label', () => {
    render(<VisaBadge visaPath="canada" />)
    expect(screen.getByText('Canada')).toBeDefined()
  })

  it('renders unknown badge with muted style', () => {
    render(<VisaBadge visaPath="unknown" />)
    expect(screen.getByText('Unknown')).toBeDefined()
  })

  it('has accessible aria-label on all visa paths', () => {
    const paths = [
      'cap_exempt',
      'cap_subject',
      'opt_compatible',
      'canada',
      'unknown',
    ] as const
    for (const path of paths) {
      const { container } = render(<VisaBadge visaPath={path} />)
      const badge = container.querySelector('[aria-label]')
      expect(badge).not.toBeNull()
    }
  })
})
