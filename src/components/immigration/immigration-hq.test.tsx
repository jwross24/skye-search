import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ImmigrationHQ } from './immigration-hq'
import { ClockDisplay, getDaysColor, getDaysLabel, getExpiryDays } from './clock-display'
import { seedImmigrationStatus } from '@/db/seed'

const TODAY = '2026-03-25'

// ─── Clock Display Unit Tests ────────────────────────────────────────────────

describe('ClockDisplay color coding', () => {
  it('90+ days -> jade (comfortable)', () => {
    expect(getDaysColor(119)).toBe('text-jade')
    expect(getDaysColor(90)).toBe('text-jade')
  })

  it('60-89 days -> ocean (intentional)', () => {
    expect(getDaysColor(60)).toBe('text-ocean')
    expect(getDaysColor(89)).toBe('text-ocean')
  })

  it('30-59 days -> amber-warm (urgent)', () => {
    expect(getDaysColor(30)).toBe('text-amber-warm')
    expect(getDaysColor(59)).toBe('text-amber-warm')
  })

  it('below 30 -> amber-warm (never red)', () => {
    expect(getDaysColor(15)).toBe('text-amber-warm')
    expect(getDaysColor(1)).toBe('text-amber-warm')
    expect(getDaysColor(0)).toBe('text-amber-warm')
    // Explicitly: no 'text-red' or 'text-destructive' anywhere
    expect(getDaysColor(0)).not.toContain('red')
  })
})

describe('ClockDisplay labels', () => {
  it('employed -> clock paused message', () => {
    expect(getDaysLabel(119, true)).toBe('Clock paused while employed')
  })

  it('90+ unemployed -> comfortable runway', () => {
    expect(getDaysLabel(119, false)).toBe('Comfortable runway')
  })

  it('60-89 -> time to be intentional', () => {
    expect(getDaysLabel(60, false)).toBe('Time to be intentional')
  })

  it('30-59 -> every week matters', () => {
    expect(getDaysLabel(30, false)).toBe('Every week matters')
    expect(getDaysLabel(59, false)).toBe('Every week matters')
  })

  it('<30 -> seek bridge employment', () => {
    expect(getDaysLabel(15, false)).toBe('Seek bridge employment')
  })

  it('0 days -> clock exhausted', () => {
    expect(getDaysLabel(0, false)).toBe('Clock exhausted — talk to your attorney')
  })

  it('negative days -> clock exhausted', () => {
    expect(getDaysLabel(-5, false)).toBe('Clock exhausted — talk to your attorney')
  })

  it('employed always overrides days label', () => {
    expect(getDaysLabel(0, true)).toBe('Clock paused while employed')
    expect(getDaysLabel(-5, true)).toBe('Clock paused while employed')
  })
})

describe('ClockDisplay rendering', () => {
  it('renders days remaining and OPT expiry', () => {
    render(
      <ClockDisplay
        daysRemaining={119}
        optExpiry="2026-08-15"
        today={TODAY}
        isEmployed={true}
        dataSource="user_reported"
      />,
    )

    const days = screen.getByTestId('days-remaining')
    expect(days.textContent).toBe('119')
    console.log(`[Test] Days remaining: ${days.textContent}`)

    const expiry = screen.getByTestId('opt-expiry')
    expect(expiry.textContent).toContain('August 15, 2026')
    console.log(`[Test] OPT expiry: ${expiry.textContent}`)
  })

  it('shows clock paused message when employed', () => {
    render(
      <ClockDisplay
        daysRemaining={119}
        optExpiry="2026-08-15"
        today={TODAY}
        isEmployed={true}
        dataSource="dso_confirmed"
      />,
    )
    expect(screen.getByText('Clock paused while employed')).toBeDefined()
    expect(screen.getByText(/Active employment stops the clock/)).toBeDefined()
  })

  it('shows user_reported data source caveat', () => {
    render(
      <ClockDisplay
        daysRemaining={119}
        optExpiry="2026-08-15"
        today={TODAY}
        isEmployed={false}
        dataSource="user_reported"
      />,
    )
    expect(screen.getByText(/Based on your estimate/)).toBeDefined()
  })

  it('shows exhausted state at 0 days remaining', () => {
    render(
      <ClockDisplay
        daysRemaining={0}
        optExpiry="2026-08-15"
        today={TODAY}
        isEmployed={false}
        dataSource="dso_confirmed"
      />,
    )
    expect(screen.getByTestId('days-remaining').textContent).toBe('0')
    expect(screen.getByText(/Clock exhausted/)).toBeDefined()
    expect(screen.getByText(/150 unemployment days have been used/)).toBeDefined()
  })

  it('has aria-label on days remaining for screen readers', () => {
    render(
      <ClockDisplay
        daysRemaining={119}
        optExpiry="2026-08-15"
        today={TODAY}
        isEmployed={true}
        dataSource="dso_confirmed"
      />,
    )
    const days = screen.getByTestId('days-remaining')
    expect(days.getAttribute('aria-label')).toContain('119 of 150')
    expect(days.getAttribute('aria-label')).toContain('Clock paused while employed')
  })

  it('does NOT show data source caveat for dso_confirmed', () => {
    render(
      <ClockDisplay
        daysRemaining={119}
        optExpiry="2026-08-15"
        today={TODAY}
        isEmployed={false}
        dataSource="dso_confirmed"
      />,
    )
    expect(screen.queryByText(/Based on your estimate/)).toBeNull()
  })
})

// ─── Calibration Flow ────────────────────────────────────────────────────────

describe('Calibration flow', () => {
  it('shows calibration when seed data has no days used', () => {
    const status = { ...seedImmigrationStatus, initial_days_used: 0 }
    render(<ImmigrationHQ immigrationStatus={status} today={TODAY} />)

    // First: disclaimer
    expect(screen.getByTestId('disclaimer-banner')).toBeDefined()
  })

  it('disclaimer -> acknowledge -> calibration appears', async () => {
    const user = userEvent.setup()
    const status = { ...seedImmigrationStatus, initial_days_used: 0 }
    render(<ImmigrationHQ immigrationStatus={status} today={TODAY} />)

    const ackButton = screen.getByRole('button', { name: /I understand/i })
    await user.click(ackButton)

    expect(screen.getByTestId('calibration-flow')).toBeDefined()
    expect(screen.getByLabelText(/Days already used/i)).toBeDefined()
    console.log('[Test] Calibration flow visible after disclaimer')
  })

  it('calibration -> enter days -> submit -> clock appears', async () => {
    const user = userEvent.setup()
    const status = { ...seedImmigrationStatus, initial_days_used: 0 }
    render(<ImmigrationHQ immigrationStatus={status} today={TODAY} />)

    // Ack disclaimer
    await user.click(screen.getByRole('button', { name: /I understand/i }))

    // Fill calibration
    const input = screen.getByLabelText(/Days already used/i)
    await user.clear(input)
    await user.type(input, '31')
    await user.click(screen.getByRole('button', { name: /Set my clock/i }))

    // Clock should now show
    expect(screen.getByTestId('clock-display')).toBeDefined()
    expect(screen.getByTestId('days-remaining').textContent).toBe('119')
    console.log('[Test] Clock visible: 119 days remaining')
  })

  it('calibration validates negative numbers', async () => {
    const user = userEvent.setup()
    const status = { ...seedImmigrationStatus, initial_days_used: 0 }
    render(<ImmigrationHQ immigrationStatus={status} today={TODAY} />)

    await user.click(screen.getByRole('button', { name: /I understand/i }))

    const input = screen.getByLabelText(/Days already used/i)
    await user.clear(input)
    await user.type(input, '-5')
    await user.click(screen.getByRole('button', { name: /Set my clock/i }))

    expect(screen.getByText(/Enter a number between 0 and 150/)).toBeDefined()
  })

  it('calibration validates > 150', async () => {
    const user = userEvent.setup()
    const status = { ...seedImmigrationStatus, initial_days_used: 0 }
    render(<ImmigrationHQ immigrationStatus={status} today={TODAY} />)

    await user.click(screen.getByRole('button', { name: /I understand/i }))

    const input = screen.getByLabelText(/Days already used/i)
    await user.clear(input)
    await user.type(input, '200')
    await user.click(screen.getByRole('button', { name: /Set my clock/i }))

    expect(screen.getByText(/Maximum is 150 days/)).toBeDefined()
  })

  it('DSO confirmation checkbox changes data source', async () => {
    const user = userEvent.setup()
    const status = { ...seedImmigrationStatus, initial_days_used: 0 }
    render(<ImmigrationHQ immigrationStatus={status} today={TODAY} />)

    await user.click(screen.getByRole('button', { name: /I understand/i }))

    const input = screen.getByLabelText(/Days already used/i)
    await user.clear(input)
    await user.type(input, '31')

    // Check DSO confirmed
    const checkbox = screen.getByRole('checkbox')
    await user.click(checkbox)

    await user.click(screen.getByRole('button', { name: /Set my clock/i }))

    // Clock visible, no "estimate" caveat
    expect(screen.getByTestId('clock-display')).toBeDefined()
    expect(screen.queryByText(/Based on your estimate/)).toBeNull()
    console.log('[Test] DSO confirmed: no estimate caveat')
  })
})

// ─── Full Page Integration ───────────────────────────────────────────────────

describe('Immigration HQ with seed data', () => {
  it('skips calibration when seed data has initial_days_used > 0', () => {
    render(<ImmigrationHQ immigrationStatus={seedImmigrationStatus} today={TODAY} />)

    // Disclaimer first, but clock should be visible (seed data has days_used=31)
    expect(screen.getByTestId('clock-display')).toBeDefined()
    console.log('[Test] Clock visible immediately with seed data')
  })

  it('shows 0 days remaining when all 150 days used via calibration', async () => {
    const user = userEvent.setup()
    const status = { ...seedImmigrationStatus, initial_days_used: 0, employment_active: false }
    render(<ImmigrationHQ immigrationStatus={status} today={TODAY} />)

    // Ack disclaimer
    await user.click(screen.getByRole('button', { name: /I understand/i }))

    // Enter 150 days used
    const input = screen.getByLabelText(/Days already used/i)
    await user.clear(input)
    await user.type(input, '150')
    await user.click(screen.getByRole('button', { name: /Set my clock/i }))

    expect(screen.getByTestId('days-remaining').textContent).toBe('0')
    expect(screen.getByText(/Clock exhausted/)).toBeDefined()
    expect(screen.getByText(/150 unemployment days have been used/)).toBeDefined()
  })

  it('shows 150 days remaining when 0 days used via calibration', async () => {
    const user = userEvent.setup()
    const status = { ...seedImmigrationStatus, initial_days_used: 0, employment_active: false }
    render(<ImmigrationHQ immigrationStatus={status} today={TODAY} />)

    // Ack disclaimer
    await user.click(screen.getByRole('button', { name: /I understand/i }))

    // Enter 0 days used
    const input = screen.getByLabelText(/Days already used/i)
    await user.clear(input)
    await user.type(input, '0')
    await user.click(screen.getByRole('button', { name: /Set my clock/i }))

    expect(screen.getByTestId('days-remaining').textContent).toBe('150')
    expect(screen.getByText(/Comfortable runway/)).toBeDefined()
  })

  it('persistent footer always visible', () => {
    render(<ImmigrationHQ immigrationStatus={seedImmigrationStatus} today={TODAY} />)
    expect(screen.getByText(/Dates shown are tracking estimates/)).toBeDefined()
  })

  it('expiry days calculation is correct', () => {
    const days = getExpiryDays('2026-08-15', '2026-03-25')
    // March 25 to Aug 15 = 143 days
    console.log(`[Test] Expiry days: ${days}`)
    expect(days).toBe(143)
  })
})
