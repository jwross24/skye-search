import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Mock confirmEmployment before component import
vi.mock('@/app/immigration/actions', () => ({
  confirmEmployment: vi.fn().mockResolvedValue({ success: true }),
}))

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}))

import { EmploymentConfirmationBanner } from './employment-confirmation-banner'
import { confirmEmployment } from '@/app/immigration/actions'
import { toast } from 'sonner'

function log(step: string, detail: string) {
  process.stdout.write(`  [employment-confirmation-banner test] ${step}: ${detail}\n`)
}

// Helper to create a date string N days ago
function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString()
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('EmploymentConfirmationBanner visibility', () => {
  it('shows banner when employment active >7 days, never confirmed', () => {
    log('Step 1', 'Active 10 days, never confirmed')
    render(
      <EmploymentConfirmationBanner
        employerName="UMass Boston"
        lastConfirmedAt={null}
        employmentActiveSince={daysAgo(10)}
      />,
    )
    expect(screen.getByTestId('employment-confirmation-banner')).toBeDefined()
    expect(screen.getByText(/UMass Boston/)).toBeDefined()
    log('Step 2', 'Banner visible with employer name')
  })

  it('shows banner when last confirmed >30 days ago', () => {
    log('Step 1', 'Active, confirmed 35 days ago')
    render(
      <EmploymentConfirmationBanner
        employerName="Woods Hole"
        lastConfirmedAt={daysAgo(35)}
        employmentActiveSince={daysAgo(60)}
      />,
    )
    expect(screen.getByTestId('employment-confirmation-banner')).toBeDefined()
    // Floor rounding can show 34 or 35 depending on exact time
    expect(screen.getByText(/Last confirmed 3[45] days ago/)).toBeDefined()
    // day7 escalation level: gentle question in the banner heading
    expect(screen.getByText(/bridge role at Woods Hole still active/)).toBeDefined()
    log('Step 2', 'Banner visible with days-since-confirmed and escalation copy')
  })

  it('hides banner when last confirmed <30 days ago', () => {
    log('Step 1', 'Confirmed 15 days ago')
    render(
      <EmploymentConfirmationBanner
        employerName="NOAA"
        lastConfirmedAt={daysAgo(15)}
        employmentActiveSince={daysAgo(60)}
      />,
    )
    expect(screen.queryByTestId('employment-confirmation-banner')).toBeNull()
    log('Step 2', 'Banner hidden (recently confirmed)')
  })

  it('hides banner when employment active <7 days (newly activated)', () => {
    log('Step 1', 'Active 3 days, never confirmed')
    render(
      <EmploymentConfirmationBanner
        employerName="EPA"
        lastConfirmedAt={null}
        employmentActiveSince={daysAgo(3)}
      />,
    )
    expect(screen.queryByTestId('employment-confirmation-banner')).toBeNull()
    log('Step 2', 'Banner hidden (newly activated)')
  })

  it('uses fallback text when employerName is null', () => {
    render(
      <EmploymentConfirmationBanner
        employerName={null}
        lastConfirmedAt={null}
        employmentActiveSince={daysAgo(10)}
      />,
    )
    expect(screen.getByText(/your current employer/)).toBeDefined()
  })
})

describe('EmploymentConfirmationBanner interactions', () => {
  it('"Yes, still active" calls confirmEmployment(true) and hides banner', async () => {
    const user = userEvent.setup()
    log('Step 1', 'Clicking "Yes, still active"')
    render(
      <EmploymentConfirmationBanner
        employerName="UMass Boston"
        lastConfirmedAt={null}
        employmentActiveSince={daysAgo(10)}
      />,
    )

    await user.click(screen.getByRole('button', { name: /Yes, still active/ }))

    expect(confirmEmployment).toHaveBeenCalledWith(true)
    expect(screen.queryByTestId('employment-confirmation-banner')).toBeNull()
    log('Step 2', 'Banner hidden after confirmation')
  })

  it('"No, it ended" shows date picker', async () => {
    const user = userEvent.setup()
    log('Step 1', 'Clicking "No, it ended"')
    render(
      <EmploymentConfirmationBanner
        employerName="UMass Boston"
        lastConfirmedAt={null}
        employmentActiveSince={daysAgo(10)}
      />,
    )

    await user.click(screen.getByRole('button', { name: /No, it ended/ }))

    expect(screen.getByLabelText('Employment end date')).toBeDefined()
    expect(screen.getByRole('button', { name: /Submit/ })).toBeDefined()
    expect(screen.getByRole('button', { name: /Back/ })).toBeDefined()
    log('Step 2', 'Date picker visible')
  })

  it('submitting end date calls confirmEmployment(false, date)', async () => {
    const user = userEvent.setup()
    log('Step 1', 'Navigating to end-date view and submitting')
    render(
      <EmploymentConfirmationBanner
        employerName="UMass Boston"
        lastConfirmedAt={null}
        employmentActiveSince={daysAgo(10)}
      />,
    )

    await user.click(screen.getByRole('button', { name: /No, it ended/ }))

    const dateInput = screen.getByLabelText('Employment end date')
    await user.type(dateInput, '2026-03-15')
    await user.click(screen.getByRole('button', { name: /Submit/ }))

    expect(confirmEmployment).toHaveBeenCalledWith(false, '2026-03-15')
    log('Step 2', 'confirmEmployment called with end date')
  })

  it('"Back" button returns to prompt state', async () => {
    const user = userEvent.setup()
    render(
      <EmploymentConfirmationBanner
        employerName="UMass Boston"
        lastConfirmedAt={null}
        employmentActiveSince={daysAgo(10)}
      />,
    )

    await user.click(screen.getByRole('button', { name: /No, it ended/ }))
    expect(screen.getByLabelText('Employment end date')).toBeDefined()

    await user.click(screen.getByRole('button', { name: /Back/ }))
    expect(screen.getByRole('button', { name: /Yes, still active/ })).toBeDefined()
  })

  it('Submit button disabled when no date entered', async () => {
    const user = userEvent.setup()
    render(
      <EmploymentConfirmationBanner
        employerName="UMass Boston"
        lastConfirmedAt={null}
        employmentActiveSince={daysAgo(10)}
      />,
    )

    await user.click(screen.getByRole('button', { name: /No, it ended/ }))

    const submitBtn = screen.getByRole('button', { name: /Submit/ })
    expect(submitBtn.hasAttribute('disabled')).toBe(true)
  })
})

describe('EmploymentConfirmationBanner styling', () => {
  it('uses warm/amber styling, not red', () => {
    const { container } = render(
      <EmploymentConfirmationBanner
        employerName="UMass Boston"
        lastConfirmedAt={null}
        employmentActiveSince={daysAgo(10)}
      />,
    )

    const banner = container.querySelector('[role="alert"]')
    expect(banner?.className).toContain('amber-warm')
    expect(banner?.className).not.toContain('red')
    log('Step 1', 'Amber styling confirmed, no red')
  })

  it('has role="alert" for accessibility', () => {
    render(
      <EmploymentConfirmationBanner
        employerName="UMass Boston"
        lastConfirmedAt={null}
        employmentActiveSince={daysAgo(10)}
      />,
    )
    expect(screen.getByRole('alert')).toBeDefined()
  })

  it('exposes escalation level via data attribute', () => {
    const { container } = render(
      <EmploymentConfirmationBanner
        employerName="UMass Boston"
        lastConfirmedAt={null}
        employmentActiveSince={daysAgo(10)}
      />,
    )
    const banner = container.querySelector('[data-escalation-level]')
    expect(banner?.getAttribute('data-escalation-level')).toBe('day7')
  })
})

describe('EmploymentConfirmationBanner error handling', () => {
  it('shows toast and stays visible when confirmEmployment(true) fails', async () => {
    vi.mocked(confirmEmployment).mockResolvedValueOnce({ success: false, error: 'DB error' })
    const user = userEvent.setup()
    render(
      <EmploymentConfirmationBanner
        employerName="UMass Boston"
        lastConfirmedAt={null}
        employmentActiveSince={daysAgo(10)}
      />,
    )

    await user.click(screen.getByRole('button', { name: /Yes, still active/ }))

    expect(screen.getByTestId('employment-confirmation-banner')).toBeDefined()
    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('confirmation'))
  })

  it('shows toast and stays on end-date step when confirmEmployment(false) fails', async () => {
    vi.mocked(confirmEmployment).mockResolvedValueOnce({ success: false, error: 'DB error' })
    const user = userEvent.setup()
    render(
      <EmploymentConfirmationBanner
        employerName="UMass Boston"
        lastConfirmedAt={null}
        employmentActiveSince={daysAgo(10)}
      />,
    )

    await user.click(screen.getByRole('button', { name: /No, it ended/ }))
    const dateInput = screen.getByLabelText('Employment end date')
    await user.type(dateInput, '2026-03-15')
    await user.click(screen.getByRole('button', { name: /Submit/ }))

    // Banner should still show the date picker (error recovery)
    expect(screen.getByLabelText('Employment end date')).toBeDefined()
    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('employment'))
  })
})

describe('EmploymentConfirmationBanner escalation levels', () => {
  it('day14 banner shows "haven\'t confirmed" message', () => {
    // day14 = 7-22 days overdue. Never confirmed + 14-29 days active = day14.
    render(
      <EmploymentConfirmationBanner
        employerName="Woods Hole"
        lastConfirmedAt={null}
        employmentActiveSince={daysAgo(20)}
      />,
    )
    expect(screen.getByText(/haven't confirmed/)).toBeDefined()
    expect(screen.getByText(/verify/)).toBeDefined()
  })

  it('day30 banner shows "over a month" message', () => {
    // day30 = 23-37 days overdue. For confirmed: 53-67 days since confirmed.
    render(
      <EmploymentConfirmationBanner
        employerName="NOAA"
        lastConfirmedAt={daysAgo(55)}
        employmentActiveSince={daysAgo(90)}
      />,
    )
    expect(screen.getByText(/over a month/)).toBeDefined()
    const banner = screen.getByTestId('employment-confirmation-banner')
    expect(banner.getAttribute('data-escalation-level')).toBe('day30')
  })

  it('day45 banner shows stronger urgency', () => {
    // day45 = 38-52 days overdue. For confirmed: 68-82 days since confirmed.
    render(
      <EmploymentConfirmationBanner
        employerName="EPA"
        lastConfirmedAt={daysAgo(75)}
        employmentActiveSince={daysAgo(120)}
      />,
    )
    expect(screen.getByText(/6 weeks/)).toBeDefined()
    expect(screen.getByText(/role has ended/)).toBeDefined()
    const banner = screen.getByTestId('employment-confirmation-banner')
    expect(banner.getAttribute('data-escalation-level')).toBe('day45')
  })

  it('day60 banner shows maximum urgency', () => {
    // day60 = 53+ days overdue. For confirmed: 83+ days since confirmed.
    render(
      <EmploymentConfirmationBanner
        employerName="USGS"
        lastConfirmedAt={daysAgo(90)}
        employmentActiveSince={daysAgo(150)}
      />,
    )
    expect(screen.getByText(/unverified/)).toBeDefined()
    expect(screen.getByText(/clock should be running/)).toBeDefined()
    const banner = screen.getByTestId('employment-confirmation-banner')
    expect(banner.getAttribute('data-escalation-level')).toBe('day60')
  })

  it('confirming at any escalation level resets to done', async () => {
    const user = userEvent.setup()
    // Render at day45 escalation
    render(
      <EmploymentConfirmationBanner
        employerName="EPA"
        lastConfirmedAt={daysAgo(75)}
        employmentActiveSince={daysAgo(120)}
      />,
    )
    expect(screen.getByTestId('employment-confirmation-banner')).toBeDefined()

    await user.click(screen.getByRole('button', { name: /Yes, still active/ }))

    expect(confirmEmployment).toHaveBeenCalledWith(true)
    expect(screen.queryByTestId('employment-confirmation-banner')).toBeNull()
  })

  it('never uses red styling even at highest escalation', () => {
    const { container } = render(
      <EmploymentConfirmationBanner
        employerName="USGS"
        lastConfirmedAt={daysAgo(90)}
        employmentActiveSince={daysAgo(150)}
      />,
    )
    const banner = container.querySelector('[role="alert"]')
    expect(banner?.className).toContain('amber-warm')
    expect(banner?.className).not.toContain('red')
  })
})
