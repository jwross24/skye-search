import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BudgetSection } from './budget-section'

vi.mock('@/app/settings/actions', () => ({
  updateBudgetCaps: vi.fn().mockResolvedValue({ success: true }),
}))

describe('BudgetSection', () => {
  it('renders spend bars with correct dollar amounts', () => {
    render(
      <BudgetSection
        dailyCents={150}
        weeklyCents={600}
        dailyCapCents={300}
        weeklyCapCents={1200}
        weeklyAlertCents={800}
      />,
    )

    expect(screen.getByText('$1.50')).toBeDefined()
    expect(screen.getByText('$6.00')).toBeDefined()
  })

  it('shows paused status when at daily cap', () => {
    render(
      <BudgetSection
        dailyCents={300}
        weeklyCents={300}
        dailyCapCents={300}
        weeklyCapCents={1200}
        weeklyAlertCents={800}
      />,
    )

    expect(screen.getByText(/Paused for today/)).toBeDefined()
  })

  it('shows getting close when at 80%+', () => {
    render(
      <BudgetSection
        dailyCents={250}
        weeklyCents={100}
        dailyCapCents={300}
        weeklyCapCents={1200}
        weeklyAlertCents={800}
      />,
    )

    expect(screen.getByText(/Getting close/)).toBeDefined()
  })

  it('renders cap input fields with default values', () => {
    render(
      <BudgetSection
        dailyCents={0}
        weeklyCents={0}
        dailyCapCents={300}
        weeklyCapCents={1200}
        weeklyAlertCents={800}
      />,
    )

    const inputs = screen.getAllByRole('spinbutton')
    expect(inputs).toHaveLength(3)
    expect(inputs[0]).toHaveValue(3) // $3.00
    expect(inputs[1]).toHaveValue(12) // $12.00
    expect(inputs[2]).toHaveValue(8) // $8.00
  })

  it('shows zero spend correctly', () => {
    render(
      <BudgetSection
        dailyCents={0}
        weeklyCents={0}
        dailyCapCents={300}
        weeklyCapCents={1200}
        weeklyAlertCents={800}
      />,
    )

    // Both today and this week show $0.00
    const zeros = screen.getAllByText('$0.00')
    expect(zeros.length).toBe(2)
  })
})
