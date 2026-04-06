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
    log('Step 2', 'Banner visible with days-since-confirmed')
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
