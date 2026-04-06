import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PlanCContent } from './plan-c-content'

describe('PlanCContent', () => {
  // ─── Attorney Warning ───────────────────────────────────────────────────────

  it('always shows the attorney consultation warning', () => {
    render(<PlanCContent employmentActive={false} />)
    const alerts = screen.getAllByRole('alert')
    const attorneyAlert = alerts.find(el =>
      el.textContent?.includes('Consult an immigration attorney'),
    )
    expect(attorneyAlert).toBeDefined()
  })

  it('attorney warning mentions SEVIS transfer is irreversible', () => {
    render(<PlanCContent employmentActive={false} />)
    expect(screen.getByText(/This action is irreversible/)).toBeDefined()
  })

  // ─── School Comparison ──────────────────────────────────────────────────────

  it('renders all 13 schools in the comparison table', () => {
    render(<PlanCContent employmentActive={false} />)
    // Desktop table has 13 data rows (Bay State College removed — closed 2022)
    const table = screen.getByTestId('school-table')
    const rows = within(table).getAllByTestId(/^school-row-/)
    expect(rows).toHaveLength(13)
  })

  it('shows Curry College first (proximity ranking)', () => {
    render(<PlanCContent employmentActive={false} />)
    const firstRow = screen.getByTestId('school-row-0')
    expect(firstRow.textContent).toContain('Curry College')
  })

  it('shows unverified badge for Westcliff, CIAM, and Sofia', () => {
    render(<PlanCContent employmentActive={false} />)
    const table = screen.getByTestId('school-table')
    const unverifiedBadges = within(table).getAllByText('unverified')
    expect(unverifiedBadges).toHaveLength(3)
  })

  it('shows USCIS scrutiny note for unverified schools', () => {
    render(<PlanCContent employmentActive={false} />)
    const notes = screen.getAllByText('USCIS scrutiny reported')
    expect(notes.length).toBeGreaterThanOrEqual(3)
  })

  it('shows verified checkmark for verified schools', () => {
    render(<PlanCContent employmentActive={false} />)
    const table = screen.getByTestId('school-table')
    const verified = within(table).getAllByLabelText('Verified')
    // 10 verified schools in the table (desktop)
    expect(verified).toHaveLength(10)
  })

  it('shows "Not started" application status for each school', () => {
    render(<PlanCContent employmentActive={false} />)
    const notStarted = screen.getAllByText('Not started')
    // 13 desktop + 13 mobile = 26 total
    expect(notStarted.length).toBeGreaterThanOrEqual(13)
  })

  // ─── Risk Framework ─────────────────────────────────────────────────────────

  it('shows 3 risk tiers', () => {
    render(<PlanCContent employmentActive={false} />)
    const tiers = screen.getByTestId('risk-tiers')
    expect(within(tiers).getByTestId('risk-tier-lower')).toBeDefined()
    expect(within(tiers).getByTestId('risk-tier-moderate')).toBeDefined()
    expect(within(tiers).getByTestId('risk-tier-higher')).toBeDefined()
  })

  it('lower risk tier includes Curry College', () => {
    render(<PlanCContent employmentActive={false} />)
    const lowerTier = screen.getByTestId('risk-tier-lower')
    expect(lowerTier.textContent).toContain('Curry College')
  })

  it('higher risk tier shows USCIS scrutiny warning', () => {
    render(<PlanCContent employmentActive={false} />)
    const higherTier = screen.getByTestId('risk-tier-higher')
    expect(higherTier.textContent).toContain('increased USCIS scrutiny')
  })

  // ─── SEVIS Checklist ─────────────────────────────────────────────────────────

  it('SEVIS checklist is locked by default', () => {
    render(<PlanCContent employmentActive={false} />)
    expect(screen.getByTestId('sevis-locked')).toBeDefined()
    expect(screen.getByTestId('break-glass-button')).toBeDefined()
  })

  it('SEVIS checklist is not visible when locked', () => {
    render(<PlanCContent employmentActive={false} />)
    expect(screen.queryByTestId('sevis-unlocked')).toBeNull()
  })

  it('Break Glass button reveals the checklist', async () => {
    const user = userEvent.setup()
    render(<PlanCContent employmentActive={false} />)

    await user.click(screen.getByTestId('break-glass-button'))

    expect(screen.getByTestId('sevis-unlocked')).toBeDefined()
    expect(screen.queryByTestId('sevis-locked')).toBeNull()
  })

  it('unlocked checklist shows 6 steps', async () => {
    const user = userEvent.setup()
    render(<PlanCContent employmentActive={false} />)

    await user.click(screen.getByTestId('break-glass-button'))

    const checkboxes = screen.getAllByRole('checkbox')
    expect(checkboxes).toHaveLength(6)
  })

  it('checklist steps can be toggled', async () => {
    const user = userEvent.setup()
    render(<PlanCContent employmentActive={false} />)

    await user.click(screen.getByTestId('break-glass-button'))

    const firstCheckbox = screen.getAllByRole('checkbox')[0]
    expect(firstCheckbox).not.toBeChecked()

    await user.click(firstCheckbox)
    expect(firstCheckbox).toBeChecked()

    await user.click(firstCheckbox)
    expect(firstCheckbox).not.toBeChecked()
  })

  // ─── Bridge Collision Warning ─────────────────────────────────────────────

  it('shows bridge collision warning when employmentActive is true', () => {
    render(<PlanCContent employmentActive={true} />)
    const warning = screen.getByTestId('bridge-collision-warning')
    expect(warning).toBeDefined()
    expect(warning.textContent).toContain('active bridge role')
  })

  it('hides bridge collision warning when employmentActive is false', () => {
    render(<PlanCContent employmentActive={false} />)
    expect(screen.queryByTestId('bridge-collision-warning')).toBeNull()
  })

  it('bridge collision warning mentions OPT termination', () => {
    render(<PlanCContent employmentActive={true} />)
    const warning = screen.getByTestId('bridge-collision-warning')
    expect(warning.textContent).toContain('terminate your OPT')
  })

  // ─── Footer ──────────────────────────────────────────────────────────────────

  it('shows disclaimer that this is not legal advice', () => {
    render(<PlanCContent employmentActive={false} />)
    expect(screen.getByText(/not immigration legal advice/)).toBeDefined()
  })
})
