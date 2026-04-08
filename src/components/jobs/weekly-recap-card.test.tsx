import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { WeeklyRecapCard } from './weekly-recap-card'

const defaultProps = {
  weekLabel: 'Mar 31 – Apr 6',
  summaryText: 'You explored 12 jobs and submitted 3 applications this week. Steady progress.',
  jobsReviewed: 12,
  applicationsSubmitted: 3,
  daysRemaining: 120,
  phase: 'active',
}

describe('WeeklyRecapCard', () => {
  it('renders week label and summary text', () => {
    render(<WeeklyRecapCard {...defaultProps} />)

    expect(screen.getByText('Your week')).toBeInTheDocument()
    expect(screen.getByText('Mar 31 – Apr 6')).toBeInTheDocument()
    expect(screen.getByText(defaultProps.summaryText)).toBeInTheDocument()
  })

  it('shows stats: jobs reviewed, apps submitted, days remaining', () => {
    render(<WeeklyRecapCard {...defaultProps} />)

    expect(screen.getByText('12')).toBeInTheDocument()
    expect(screen.getByText('jobs reviewed')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('applications')).toBeInTheDocument()
    expect(screen.getByText('120')).toBeInTheDocument()
    expect(screen.getByText('days remaining')).toBeInTheDocument()
  })

  it('phase badge renders correctly for active phase', () => {
    render(<WeeklyRecapCard {...defaultProps} />)
    expect(screen.getByText('Building momentum')).toBeInTheDocument()
  })

  it('phase badge renders correctly for launch phase', () => {
    render(<WeeklyRecapCard {...defaultProps} phase="launch" />)
    expect(screen.getByText('Getting started')).toBeInTheDocument()
  })

  it('phase badge renders correctly for response phase', () => {
    render(<WeeklyRecapCard {...defaultProps} phase="response" />)
    expect(screen.getByText('Getting responses')).toBeInTheDocument()
  })

  it('phase badge renders correctly for pressure phase', () => {
    render(<WeeklyRecapCard {...defaultProps} phase="pressure" />)
    expect(screen.getByText('Focused push')).toBeInTheDocument()
  })

  it('collapses and expands on header click', async () => {
    const user = userEvent.setup()
    render(<WeeklyRecapCard {...defaultProps} />)

    // Content should be visible initially
    expect(screen.getByText(defaultProps.summaryText)).toBeInTheDocument()

    // Click to collapse
    await user.click(screen.getByRole('button', { expanded: true }))
    expect(screen.queryByText(defaultProps.summaryText)).not.toBeInTheDocument()

    // Click to expand
    await user.click(screen.getByRole('button', { expanded: false }))
    expect(screen.getByText(defaultProps.summaryText)).toBeInTheDocument()
  })

  it('uses singular grammar for 1 job reviewed', () => {
    render(<WeeklyRecapCard {...defaultProps} jobsReviewed={1} />)
    expect(screen.getByText('job reviewed')).toBeInTheDocument()
  })

  it('uses singular grammar for 1 application', () => {
    render(<WeeklyRecapCard {...defaultProps} applicationsSubmitted={1} />)
    expect(screen.getByText('application')).toBeInTheDocument()
  })

  it('has correct aria-label for accessibility', () => {
    render(<WeeklyRecapCard {...defaultProps} />)
    expect(screen.getByLabelText('Weekly recap')).toBeInTheDocument()
  })

  it('has correct test id', () => {
    render(<WeeklyRecapCard {...defaultProps} />)
    expect(screen.getByTestId('weekly-recap-card')).toBeInTheDocument()
  })
})
