import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BreakCard } from './break-card'

function log(step: string, detail: string) {
  process.stdout.write(`  [break-card] ${step}: ${detail}\n`)
}

describe('BreakCard', () => {
  it('[break-card] Step 1: renders break message and end date', () => {
    render(<BreakCard breakModeUntil="2026-04-04T00:00:00Z" />)
    log('Step 2', 'Checking break card content')

    expect(screen.getByText(/taking a break/i)).toBeInTheDocument()
    expect(screen.getByText(/jobs will be here/i)).toBeInTheDocument()
    expect(screen.getByText(/break ends/i)).toBeInTheDocument()
    log('Step 3', 'Break message, encouragement, and end date visible')
  })

  it('[break-card] Step 1: shows "End break early" link to settings', () => {
    render(<BreakCard breakModeUntil="2026-04-04T00:00:00Z" />)
    log('Step 2', 'Checking end break link')

    const link = screen.getByText(/end break early/i)
    expect(link).toBeInTheDocument()
    expect(link.closest('a')).toHaveAttribute('href', '/settings#break-mode')
    log('Step 3', 'Link points to /settings#break-mode')
  })

  it('[break-card] Step 1: has no guilt messaging', () => {
    render(<BreakCard breakModeUntil="2026-04-04T00:00:00Z" />)
    log('Step 2', 'Checking for absence of guilt language')

    const text = document.body.textContent ?? ''
    expect(text).not.toMatch(/missed/i)
    expect(text).not.toMatch(/behind/i)
    expect(text).not.toMatch(/falling/i)
    expect(text).not.toMatch(/warning/i)
    expect(text).toMatch(/earned it/i)
    log('Step 3', 'No guilt language found. "Earned it" encouragement present.')
  })
})
