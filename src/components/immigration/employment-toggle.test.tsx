import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EmploymentToggle, checkEligibility } from './employment-toggle'

const TODAY = '2026-03-25'

// ─── Eligibility Logic ───────────────────────────────────────────────────────

describe('checkEligibility', () => {
  it('passes when all criteria met', () => {
    const issues = checkEligibility({
      hours_per_week: 20,
      stem_related: true,
      e_verify: true,
      paid: true,
    })
    expect(issues).toHaveLength(0)
  })

  it('fails when hours < 20', () => {
    const issues = checkEligibility({ hours_per_week: 19, stem_related: true, e_verify: true, paid: true })
    expect(issues).toHaveLength(1)
    expect(issues[0].field).toBe('hours')
  })

  it('fails when stem_related is false', () => {
    const issues = checkEligibility({ hours_per_week: 20, stem_related: false, e_verify: true, paid: true })
    expect(issues).toHaveLength(1)
    expect(issues[0].field).toBe('stem')
  })

  it('fails when e_verify is false', () => {
    const issues = checkEligibility({ hours_per_week: 20, stem_related: true, e_verify: false, paid: true })
    expect(issues).toHaveLength(1)
    expect(issues[0].field).toBe('everify')
  })

  it('fails when paid is false', () => {
    const issues = checkEligibility({ hours_per_week: 20, stem_related: true, e_verify: true, paid: false })
    expect(issues).toHaveLength(1)
    expect(issues[0].field).toBe('paid')
  })

  it('accumulates multiple failures', () => {
    const issues = checkEligibility({ hours_per_week: 10, stem_related: false, e_verify: false, paid: false })
    expect(issues).toHaveLength(4)
    console.log(`[Test] Eligibility issues: ${issues.map((i) => i.field).join(', ')}`)
  })
})

// ─── Toggle Rendering ────────────────────────────────────────────────────────

describe('EmploymentToggle rendering', () => {
  it('renders toggle in OFF state when not employed', () => {
    const onToggle = vi.fn()
    render(<EmploymentToggle isEmployed={false} today={TODAY} onToggle={onToggle} />)

    expect(screen.getByText('Not employed')).toBeDefined()
    expect(screen.getByLabelText('Employment status')).toBeDefined()
  })

  it('renders toggle in ON state when employed', () => {
    const onToggle = vi.fn()
    render(<EmploymentToggle isEmployed={true} today={TODAY} onToggle={onToggle} />)

    expect(screen.getByText('Employed')).toBeDefined()
    expect(screen.getByText('Clock paused')).toBeDefined()
  })

  it('shows form dialog when toggle turned ON', async () => {
    const user = userEvent.setup()
    const onToggle = vi.fn()
    render(<EmploymentToggle isEmployed={false} today={TODAY} onToggle={onToggle} />)

    const toggle = screen.getByLabelText('Employment status')
    await user.click(toggle)

    expect(screen.getByText('Employment details')).toBeDefined()
    expect(screen.getByLabelText('Employer name')).toBeDefined()
    expect(screen.getByLabelText('Start date')).toBeDefined()
    expect(screen.getByLabelText('Hours per week')).toBeDefined()
    console.log('[Test] Form dialog opened with all required fields')
  })

  it('validates employer name required', async () => {
    const user = userEvent.setup()
    const onToggle = vi.fn()
    render(<EmploymentToggle isEmployed={false} today={TODAY} onToggle={onToggle} />)

    await user.click(screen.getByLabelText('Employment status'))
    await user.click(screen.getByRole('button', { name: /Confirm employment/i }))

    expect(screen.getByText(/Please enter your employer name/)).toBeDefined()
  })

  it('submits valid form and calls onToggle', async () => {
    const user = userEvent.setup()
    const onToggle = vi.fn()
    render(<EmploymentToggle isEmployed={false} today={TODAY} onToggle={onToggle} />)

    await user.click(screen.getByLabelText('Employment status'))

    await user.type(screen.getByLabelText('Employer name'), 'Boston University')
    await user.type(screen.getByLabelText('Start date'), '2026-03-20')
    await user.type(screen.getByLabelText('Hours per week'), '20')
    await user.click(screen.getByRole('button', { name: /Confirm employment/i }))

    expect(onToggle).toHaveBeenCalledWith(true, expect.objectContaining({
      employer_name: 'Boston University',
      hours_per_week: 20,
      eligibility_override: false,
    }))
    console.log('[Test] Valid form submitted, onToggle called')
  })

  it('shows eligibility warning when hours < 20', async () => {
    const user = userEvent.setup()
    const onToggle = vi.fn()
    render(<EmploymentToggle isEmployed={false} today={TODAY} onToggle={onToggle} />)

    await user.click(screen.getByLabelText('Employment status'))
    await user.type(screen.getByLabelText('Employer name'), 'Test Corp')
    await user.type(screen.getByLabelText('Start date'), '2026-03-20')
    await user.type(screen.getByLabelText('Hours per week'), '15')
    await user.click(screen.getByRole('button', { name: /Confirm employment/i }))

    // Warning dialog should appear
    expect(screen.getByText('Eligibility concern')).toBeDefined()
    expect(screen.getByText(/20\+ hours per week/)).toBeDefined()
    console.log('[Test] Eligibility warning shown for hours < 20')
  })

  it('override sets eligibility_override flag', async () => {
    const user = userEvent.setup()
    const onToggle = vi.fn()
    render(<EmploymentToggle isEmployed={false} today={TODAY} onToggle={onToggle} />)

    await user.click(screen.getByLabelText('Employment status'))
    await user.type(screen.getByLabelText('Employer name'), 'Test Corp')
    await user.type(screen.getByLabelText('Start date'), '2026-03-20')
    await user.type(screen.getByLabelText('Hours per week'), '10')
    await user.click(screen.getByRole('button', { name: /Confirm employment/i }))

    // Click override
    await user.click(screen.getByRole('button', { name: /Halt clock anyway/i }))

    expect(onToggle).toHaveBeenCalledWith(true, expect.objectContaining({
      eligibility_override: true,
    }))
    console.log('[Test] Override flag set correctly')
  })

  it('Keep clock running dismisses warning', async () => {
    const user = userEvent.setup()
    const onToggle = vi.fn()
    render(<EmploymentToggle isEmployed={false} today={TODAY} onToggle={onToggle} />)

    await user.click(screen.getByLabelText('Employment status'))
    await user.type(screen.getByLabelText('Employer name'), 'Test Corp')
    await user.type(screen.getByLabelText('Start date'), '2026-03-20')
    await user.type(screen.getByLabelText('Hours per week'), '10')
    await user.click(screen.getByRole('button', { name: /Confirm employment/i }))

    await user.click(screen.getByRole('button', { name: /Keep clock running/i }))

    expect(onToggle).not.toHaveBeenCalled()
    console.log('[Test] Keep clock running dismissed warning without toggling')
  })

  it('toggle OFF calls onToggle(false)', async () => {
    const user = userEvent.setup()
    const onToggle = vi.fn()
    render(<EmploymentToggle isEmployed={true} today={TODAY} onToggle={onToggle} />)

    const toggle = screen.getByLabelText('Employment status')
    await user.click(toggle)

    expect(onToggle).toHaveBeenCalledWith(false)
  })

  it('resets form state when dialog is cancelled and reopened', async () => {
    const user = userEvent.setup()
    const onToggle = vi.fn()
    render(<EmploymentToggle isEmployed={false} today={TODAY} onToggle={onToggle} />)

    // Open form and type into employer name
    await user.click(screen.getByLabelText('Employment status'))
    await user.type(screen.getByLabelText('Employer name'), 'Stale Corp')

    // Cancel
    await user.click(screen.getByRole('button', { name: /Not right now/i }))

    // Re-open: form fields should be reset
    await user.click(screen.getByLabelText('Employment status'))
    expect(screen.getByLabelText('Employer name')).toHaveValue('')
  })

  it('validates start date is required', async () => {
    const user = userEvent.setup()
    const onToggle = vi.fn()
    render(<EmploymentToggle isEmployed={false} today={TODAY} onToggle={onToggle} />)

    await user.click(screen.getByLabelText('Employment status'))
    await user.type(screen.getByLabelText('Employer name'), 'Test Corp')
    // Skip start date
    await user.type(screen.getByLabelText('Hours per week'), '20')
    await user.click(screen.getByRole('button', { name: /Confirm employment/i }))

    expect(screen.getByText(/When do you start/)).toBeDefined()
    expect(onToggle).not.toHaveBeenCalled()
  })

  it('validates hours per week is required', async () => {
    const user = userEvent.setup()
    const onToggle = vi.fn()
    render(<EmploymentToggle isEmployed={false} today={TODAY} onToggle={onToggle} />)

    await user.click(screen.getByLabelText('Employment status'))
    await user.type(screen.getByLabelText('Employer name'), 'Test Corp')
    await user.type(screen.getByLabelText('Start date'), '2026-03-20')
    // Skip hours
    await user.click(screen.getByRole('button', { name: /Confirm employment/i }))

    expect(screen.getByText(/How many hours per week/)).toBeDefined()
    expect(onToggle).not.toHaveBeenCalled()
  })

  it('form error has alert role for screen readers', async () => {
    const user = userEvent.setup()
    const onToggle = vi.fn()
    render(<EmploymentToggle isEmployed={false} today={TODAY} onToggle={onToggle} />)

    await user.click(screen.getByLabelText('Employment status'))
    await user.click(screen.getByRole('button', { name: /Confirm employment/i }))

    const alert = screen.getByRole('alert')
    expect(alert.textContent).toContain('Please enter your employer name')
  })
})
