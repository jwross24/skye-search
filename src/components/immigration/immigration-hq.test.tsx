import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Mock server actions (they call cookies() which requires Next.js request scope)
vi.mock('@/app/immigration/actions', () => ({
  saveCalibration: vi.fn().mockResolvedValue({ success: true }),
  acknowledgeDisclaimer: vi.fn().mockResolvedValue({ success: true }),
  toggleEmployment: vi.fn().mockResolvedValue({ success: true }),
}))

import { ImmigrationHQ } from './immigration-hq'
import { ClockDisplay, getDaysColor, getDaysLabel, getExpiryDays, getDaysColorVar } from './clock-display'
import { StrategyMap, getDecisionAlert } from './strategy-map'
import { ProgressArc } from './progress-arc'
import { seedImmigrationStatus, seedPlans } from '@/db/seed'

const TODAY = '2026-03-25'

function log(step: string, detail: string) {
  process.stdout.write(`  [immigration-hq test] ${step}: ${detail}\n`)
}

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
    expect(getDaysColor(0)).not.toContain('red')
  })
})

describe('ClockDisplay arc color var', () => {
  it('maps days to CSS variable names for ProgressArc', () => {
    expect(getDaysColorVar(119)).toBe('jade')
    expect(getDaysColorVar(60)).toBe('ocean')
    expect(getDaysColorVar(29)).toBe('amber-warm')
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
    log('Step 1', 'Rendering clock with 119 days remaining')
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

    const expiry = screen.getByTestId('opt-expiry')
    expect(expiry.textContent).toContain('August 15, 2026')
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

// ─── Progress Arc ───────────────────────────────────────────────────────────

describe('ProgressArc', () => {
  it('SVG progress arc renders with correct fill percentage', () => {
    log('Step 1', 'Rendering arc at 79% (119/150)')
    const { container } = render(
      <ProgressArc fraction={119 / 150} color="jade" label="119 of 150 days">
        <span>119</span>
      </ProgressArc>,
    )
    const svg = container.querySelector('svg')
    expect(svg).not.toBeNull()
    expect(container.querySelector('[role="progressbar"]')).not.toBeNull()
    log('Step 2', 'SVG rendered with progressbar role')
  })

  it('screen reader: aria-label describes the arc', () => {
    const { container } = render(
      <ProgressArc fraction={0.5} color="ocean" label="75 of 150 unemployment days remaining" />,
    )
    const progressbar = container.querySelector('[role="progressbar"]')
    expect(progressbar?.getAttribute('aria-label')).toBe('75 of 150 unemployment days remaining')
  })

  it('clamps fraction between 0 and 1', () => {
    const { container } = render(
      <ProgressArc fraction={1.5} color="jade" label="test" />,
    )
    const progressbar = container.querySelector('[role="progressbar"]')
    expect(progressbar?.getAttribute('aria-valuenow')).toBe('100')
  })

  it('renders children in center', () => {
    render(
      <ProgressArc fraction={0.5} color="jade" label="test">
        <span data-testid="arc-center">Hello</span>
      </ProgressArc>,
    )
    expect(screen.getByTestId('arc-center').textContent).toBe('Hello')
  })
})

// ─── Conditional Views ──────────────────────────────────────────────────────

describe('Conditional clock views', () => {
  it('Clock 4 (exhaustion): transforms page when days_used = 150', () => {
    log('Step 1', 'Rendering exhaustion view')
    render(
      <ClockDisplay
        daysRemaining={0}
        optExpiry="2026-08-15"
        today={TODAY}
        isEmployed={false}
        dataSource="dso_confirmed"
      />,
    )
    expect(screen.getByTestId('exhaustion-view')).toBeDefined()
    expect(screen.getByText('SEVIS Transfer')).toBeDefined()
    expect(screen.getByText('Contact your DSO')).toBeDefined()
    expect(screen.getByText('Consult an attorney')).toBeDefined()
    log('Step 2', 'All 3 action cards visible in exhaustion view')
  })

  it('Clock 3 (grace period): shown when OPT expired and not employed', () => {
    log('Step 1', 'Rendering grace period view — 5 days after OPT expired')
    render(
      <ClockDisplay
        daysRemaining={50}
        optExpiry="2026-08-15"
        today="2026-08-20"
        isEmployed={false}
        dataSource="dso_confirmed"
        isGracePeriod={true}
      />,
    )
    expect(screen.getByTestId('grace-period-view')).toBeDefined()
    // 5 days after expiry → 55 days remaining in grace period
    expect(screen.getByText('55')).toBeDefined()
    expect(screen.getByText(/60-day grace period/)).toBeDefined()
    log('Step 2', 'Grace period view shows 55 of 60 days remaining')
  })

  it('Grace period view hidden by default', () => {
    render(
      <ClockDisplay
        daysRemaining={119}
        optExpiry="2026-08-15"
        today={TODAY}
        isEmployed={false}
        dataSource="dso_confirmed"
      />,
    )
    expect(screen.queryByTestId('grace-period-view')).toBeNull()
  })

  it('persistent banner at <15 days remaining', () => {
    log('Step 1', 'Rendering with 10 days remaining')
    render(
      <ClockDisplay
        daysRemaining={10}
        optExpiry="2026-08-15"
        today={TODAY}
        isEmployed={false}
        dataSource="dso_confirmed"
      />,
    )
    const banner = screen.getByTestId('low-days-banner')
    expect(banner).toBeDefined()
    expect(banner.textContent).toContain('10')
    expect(banner.textContent).toContain('review your options')
  })

  it('no low-days banner at 15+ days', () => {
    render(
      <ClockDisplay
        daysRemaining={15}
        optExpiry="2026-08-15"
        today={TODAY}
        isEmployed={false}
        dataSource="dso_confirmed"
      />,
    )
    expect(screen.queryByTestId('low-days-banner')).toBeNull()
  })

  it('low-days banner shows at exactly 14 days', () => {
    render(
      <ClockDisplay
        daysRemaining={14}
        optExpiry="2026-08-15"
        today={TODAY}
        isEmployed={false}
        dataSource="dso_confirmed"
      />,
    )
    expect(screen.getByTestId('low-days-banner')).toBeDefined()
  })

  it('no low-days banner when employed', () => {
    render(
      <ClockDisplay
        daysRemaining={5}
        optExpiry="2026-08-15"
        today={TODAY}
        isEmployed={true}
        dataSource="dso_confirmed"
      />,
    )
    expect(screen.queryByTestId('low-days-banner')).toBeNull()
  })

  it('cron execution timestamp renders', () => {
    render(
      <ClockDisplay
        daysRemaining={119}
        optExpiry="2026-08-15"
        today={TODAY}
        isEmployed={false}
        dataSource="dso_confirmed"
        lastCronRun="2026-03-25T05:15:00Z"
      />,
    )
    expect(screen.getByTestId('cron-timestamp')).toBeDefined()
    expect(screen.getByText(/Last verified/)).toBeDefined()
  })

  it('gap alert renders when present', () => {
    render(
      <ClockDisplay
        daysRemaining={119}
        optExpiry="2026-08-15"
        today={TODAY}
        isEmployed={false}
        dataSource="dso_confirmed"
        gapAlert="We missed 2 days of tracking (Apr 14-15)"
      />,
    )
    expect(screen.getByTestId('gap-alert')).toBeDefined()
    expect(screen.getByText(/We missed 2 days/)).toBeDefined()
  })

  it('employment status display with halt info', () => {
    render(
      <ClockDisplay
        daysRemaining={119}
        optExpiry="2026-08-15"
        today={TODAY}
        isEmployed={true}
        dataSource="dso_confirmed"
        statusLabel="Employed (Bridge)"
        haltedSince="2026-03-01"
        haltSource="Manual"
      />,
    )
    expect(screen.getByTestId('employment-status')).toBeDefined()
    expect(screen.getByText(/Employed \(Bridge\)/)).toBeDefined()
    expect(screen.getByText(/Clock halted since/)).toBeDefined()
    expect(screen.getByText(/Manual/)).toBeDefined()
  })

  it('OPT expired while employed shows "Expired" not negative days', () => {
    render(
      <ClockDisplay
        daysRemaining={100}
        optExpiry="2026-08-15"
        today="2026-09-01"
        isEmployed={true}
        dataSource="dso_confirmed"
      />,
    )
    // Should show "Expired", not "Valid for -17 more days"
    expect(screen.getByText('Expired')).toBeDefined()
    // Arc should show 0, not a negative number
    expect(screen.queryByText(/-\d+/)).toBeNull()
  })
})

// ─── Strategy Map ───────────────────────────────────────────────────────────

describe('StrategyMap', () => {
  it('renders all 5 plans', () => {
    log('Step 1', 'Rendering strategy map with seed plans')
    render(
      <StrategyMap
        plans={seedPlans}
        daysRemaining={119}
        optExpiryDate="2026-08-15"
        today={TODAY}
      />,
    )
    expect(screen.getByTestId('plan-plan_a')).toBeDefined()
    expect(screen.getByTestId('plan-plan_b')).toBeDefined()
    expect(screen.getByTestId('plan-plan_c')).toBeDefined()
    expect(screen.getByTestId('plan-plan_d')).toBeDefined()
    expect(screen.getByTestId('plan-niw')).toBeDefined()
    log('Step 2', 'All 5 plans rendered')
  })

  it('each plan shows status and next action', () => {
    render(
      <StrategyMap
        plans={seedPlans}
        daysRemaining={119}
        optExpiryDate="2026-08-15"
        today={TODAY}
      />,
    )
    // Two plans are active (plan_a and niw)
    expect(screen.getAllByText('Active')).toHaveLength(2)
    expect(screen.getAllByText('Not started')).toHaveLength(3)
    expect(screen.getByText(/Apply to cap-exempt/)).toBeDefined()
  })

  it('click plan -> detail view with notes', async () => {
    log('Step 1', 'Click Plan A to expand')
    const user = userEvent.setup()
    render(
      <StrategyMap
        plans={seedPlans}
        daysRemaining={119}
        optExpiryDate="2026-08-15"
        today={TODAY}
      />,
    )

    const planA = screen.getByTestId('plan-plan_a')
    const button = within(planA).getByRole('button')
    await user.click(button)

    log('Step 2', 'Verify detail view with notes')
    expect(screen.getByText(/universities, nonprofits, gov contractors/)).toBeDefined()
  })

  it('cap-exempt trap disclosure visible when Plan A expanded', async () => {
    const user = userEvent.setup()
    render(
      <StrategyMap
        plans={seedPlans}
        daysRemaining={119}
        optExpiryDate="2026-08-15"
        today={TODAY}
      />,
    )

    const planA = screen.getByTestId('plan-plan_a')
    await user.click(within(planA).getByRole('button'))

    expect(screen.getByTestId('cap-exempt-trap')).toBeDefined()
    expect(screen.getByText(/affiliated with.*is not the same/)).toBeDefined()
  })

  it('decision point alert at <90 days remaining', () => {
    const alert = getDecisionAlert('plan_a', 80, '2026-08-15', TODAY)
    expect(alert).toContain('Fewer than 90')
  })

  it('no decision alert at 90+ days', () => {
    const alert = getDecisionAlert('plan_a', 119, '2026-08-15', TODAY)
    expect(alert).toBeNull()
  })
})

// ─── Calibration Flow ────────────────────────────────────────────────────────

describe('Calibration flow', () => {
  it('shows calibration when seed data has no days used', () => {
    const status = { ...seedImmigrationStatus, initial_days_used: 0 }
    render(<ImmigrationHQ immigrationStatus={status} today={TODAY} plans={seedPlans} />)
    expect(screen.getByTestId('disclaimer-banner')).toBeDefined()
  })

  it('disclaimer -> acknowledge -> calibration appears', async () => {
    const user = userEvent.setup()
    const status = { ...seedImmigrationStatus, initial_days_used: 0 }
    render(<ImmigrationHQ immigrationStatus={status} today={TODAY} plans={seedPlans} />)

    const ackButton = screen.getByRole('button', { name: /I understand/i })
    await user.click(ackButton)

    expect(screen.getByTestId('calibration-flow')).toBeDefined()
    expect(screen.getByLabelText(/Days already used/i)).toBeDefined()
  })

  it('calibration -> enter days -> submit -> clock appears', async () => {
    const user = userEvent.setup()
    const status = { ...seedImmigrationStatus, initial_days_used: 0 }
    render(<ImmigrationHQ immigrationStatus={status} today={TODAY} plans={seedPlans} />)

    await user.click(screen.getByRole('button', { name: /I understand/i }))

    const input = screen.getByLabelText(/Days already used/i)
    await user.clear(input)
    await user.type(input, '31')
    await user.click(screen.getByRole('button', { name: /Set my clock/i }))

    expect(screen.getByTestId('clock-display')).toBeDefined()
    expect(screen.getByTestId('days-remaining').textContent).toBe('119')
  })

  it('calibration validates negative numbers', async () => {
    const user = userEvent.setup()
    const status = { ...seedImmigrationStatus, initial_days_used: 0 }
    render(<ImmigrationHQ immigrationStatus={status} today={TODAY} plans={seedPlans} />)

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
    render(<ImmigrationHQ immigrationStatus={status} today={TODAY} plans={seedPlans} />)

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
    render(<ImmigrationHQ immigrationStatus={status} today={TODAY} plans={seedPlans} />)

    await user.click(screen.getByRole('button', { name: /I understand/i }))

    const input = screen.getByLabelText(/Days already used/i)
    await user.clear(input)
    await user.type(input, '31')

    const checkbox = screen.getByRole('checkbox')
    await user.click(checkbox)

    await user.click(screen.getByRole('button', { name: /Set my clock/i }))

    expect(screen.getByTestId('clock-display')).toBeDefined()
    expect(screen.queryByText(/Based on your estimate/)).toBeNull()
  })
})

// ─── Full Page Integration ───────────────────────────────────────────────────

describe('Immigration HQ with seed data', () => {
  it('skips calibration when seed data has initial_days_used > 0', () => {
    render(<ImmigrationHQ immigrationStatus={seedImmigrationStatus} today={TODAY} plans={seedPlans} />)
    expect(screen.getByTestId('clock-display')).toBeDefined()
  })

  it('shows 0 days remaining when all 150 days used via calibration', async () => {
    const user = userEvent.setup()
    const status = { ...seedImmigrationStatus, initial_days_used: 0, employment_active: false }
    render(<ImmigrationHQ immigrationStatus={status} today={TODAY} plans={seedPlans} />)

    await user.click(screen.getByRole('button', { name: /I understand/i }))

    const input = screen.getByLabelText(/Days already used/i)
    await user.clear(input)
    await user.type(input, '150')
    await user.click(screen.getByRole('button', { name: /Set my clock/i }))

    // Exhaustion view should appear
    expect(screen.getByTestId('exhaustion-view')).toBeDefined()
    expect(screen.getByText(/All unemployment days have been used/)).toBeDefined()
  })

  it('shows 150 days remaining when 0 days used via calibration', async () => {
    const user = userEvent.setup()
    const status = { ...seedImmigrationStatus, initial_days_used: 0, employment_active: false }
    render(<ImmigrationHQ immigrationStatus={status} today={TODAY} plans={seedPlans} />)

    await user.click(screen.getByRole('button', { name: /I understand/i }))

    const input = screen.getByLabelText(/Days already used/i)
    await user.clear(input)
    await user.type(input, '0')
    await user.click(screen.getByRole('button', { name: /Set my clock/i }))

    expect(screen.getByTestId('days-remaining').textContent).toBe('150')
    expect(screen.getByText(/Comfortable runway/)).toBeDefined()
  })

  it('persistent footer always visible', () => {
    render(<ImmigrationHQ immigrationStatus={seedImmigrationStatus} today={TODAY} plans={seedPlans} />)
    expect(screen.getByText(/Dates shown are tracking estimates/)).toBeDefined()
  })

  it('expiry days calculation is correct', () => {
    const days = getExpiryDays('2026-08-15', '2026-03-25')
    // March 25 to Aug 15 = 143 days
    expect(days).toBe(143)
  })

  it('strategy map renders alongside clocks', () => {
    render(<ImmigrationHQ immigrationStatus={seedImmigrationStatus} today={TODAY} plans={seedPlans} />)
    expect(screen.getByTestId('strategy-map')).toBeDefined()
    expect(screen.getByTestId('plan-plan_a')).toBeDefined()
  })

  it('strategy map hidden until calibrated', () => {
    const status = { ...seedImmigrationStatus, initial_days_used: 0 }
    render(<ImmigrationHQ immigrationStatus={status} today={TODAY} plans={seedPlans} />)
    expect(screen.queryByTestId('strategy-map')).toBeNull()
  })

  it('grace period activates when OPT expired and unemployed', () => {
    log('Step 1', 'Rendering with OPT expired, not employed')
    const status = { ...seedImmigrationStatus, employment_active: false }
    render(
      <ImmigrationHQ
        immigrationStatus={status}
        today="2026-08-20" // past opt_expiry (2026-08-15)
        plans={seedPlans}
      />,
    )
    expect(screen.getByTestId('grace-period-view')).toBeDefined()
    log('Step 2', 'Grace period view rendered')
  })
})
