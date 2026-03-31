import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TagPicker } from './tag-picker'

describe('TagPicker', () => {
  it('renders all tag groups with correct tag labels', () => {
    render(<TagPicker onSelect={vi.fn()} onSkip={vi.fn()} />)

    // Eligibility group
    expect(screen.getByText('Requires citizenship')).toBeTruthy()
    expect(screen.getByText('Requires clearance')).toBeTruthy()
    expect(screen.getByText('No visa path')).toBeTruthy()

    // Fit group
    expect(screen.getByText('Wrong field')).toBeTruthy()
    expect(screen.getByText('Too junior')).toBeTruthy()
    expect(screen.getByText('Too senior')).toBeTruthy()
    expect(screen.getByText('Salary too low')).toBeTruthy()

    // Logistics group
    expect(screen.getByText('Wrong location')).toBeTruthy()
    expect(screen.getByText('Not remote')).toBeTruthy()
    expect(screen.getByText('Deadline passed')).toBeTruthy()

    // Other group
    expect(screen.getByText('Already applied')).toBeTruthy()
  })

  it('calls onSelect with correct tag value when a tag is clicked', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    render(<TagPicker onSelect={onSelect} onSkip={vi.fn()} />)

    await user.click(screen.getByText('Requires citizenship'))
    expect(onSelect).toHaveBeenCalledWith(['requires_citizenship'])

    await user.click(screen.getByText('Salary too low'))
    expect(onSelect).toHaveBeenCalledWith(['salary_too_low'])

    await user.click(screen.getByText('Not remote'))
    expect(onSelect).toHaveBeenCalledWith(['not_remote'])
  })

  it('calls onSkip when Skip is clicked', async () => {
    const user = userEvent.setup()
    const onSkip = vi.fn()
    render(<TagPicker onSelect={vi.fn()} onSkip={onSkip} />)

    await user.click(screen.getByText('Skip'))
    expect(onSkip).toHaveBeenCalledOnce()
  })
})
