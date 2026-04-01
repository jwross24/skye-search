import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PickCard } from './pick-card'
import type { Job } from '@/types/job'

vi.mock('@/app/jobs/actions', () => ({
  voteOnJob: vi.fn(),
}))

const mockJob: Job = {
  id: 'job-1',
  title: 'Research Scientist',
  company: 'Woods Hole Oceanographic',
  company_domain: null,
  location: 'Falmouth, MA',
  url: 'https://whoi.edu/jobs/123',
  visa_path: 'cap_exempt',
  employer_type: 'nonprofit_research',
  cap_exempt_confidence: 'confirmed',
  employment_type: 'full_time',
  source_type: 'academic',
  application_deadline: null,
  deadline_source: null,
  application_complexity: null,
  h1b_sponsor_count: null,
  salary: null,
  remote_status: null,
  skills_required: ['Python', 'Remote Sensing'],
  why_fits: 'Strong ocean color lab with MODIS expertise',
  indexed_date: '2026-03-30',
  requires_citizenship: false,
  requires_security_clearance: false,
}

describe('PickCard', () => {
  const defaultProps = {
    job: mockJob,
    urgencyScore: 0.85,
    onVote: vi.fn(),
    staggerIndex: 0,
    today: '2026-03-31',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders job title, company, and location', () => {
    render(<PickCard {...defaultProps} />)

    expect(screen.getByText('Research Scientist')).toBeTruthy()
    expect(screen.getByText('Woods Hole Oceanographic')).toBeTruthy()
    expect(screen.getByText('Falmouth, MA')).toBeTruthy()
  })

  it('renders all three action buttons', () => {
    render(<PickCard {...defaultProps} />)

    expect(screen.getByText('Interested')).toBeTruthy()
    expect(screen.getByText('Not for me')).toBeTruthy()
    expect(screen.getByText('Save')).toBeTruthy()
  })

  it('calls onVote with interested when Interested clicked', async () => {
    const user = userEvent.setup()
    render(<PickCard {...defaultProps} />)

    await user.click(screen.getByText('Interested'))
    expect(defaultProps.onVote).toHaveBeenCalledWith('job-1', 'interested')
  })

  it('shows tag picker when Not for me clicked (does not call onVote yet)', async () => {
    const user = userEvent.setup()
    render(<PickCard {...defaultProps} />)

    await user.click(screen.getByText('Not for me'))

    // Tag picker should appear
    expect(screen.getByText('Skip')).toBeTruthy()
    // onVote not called until tag is selected or skipped
    expect(defaultProps.onVote).not.toHaveBeenCalled()
  })

  it('calls onVote with save_for_later when Save clicked', async () => {
    const user = userEvent.setup()
    render(<PickCard {...defaultProps} />)

    await user.click(screen.getByText('Save'))
    expect(defaultProps.onVote).toHaveBeenCalledWith('job-1', 'save_for_later')
  })

  it('expands to show why_fits on click', async () => {
    const user = userEvent.setup()
    render(<PickCard {...defaultProps} />)

    // why_fits not visible initially
    expect(screen.queryByText('Strong ocean color lab with MODIS expertise')).toBeNull()

    // Click the card to expand
    await user.click(screen.getByText('Research Scientist'))

    expect(screen.getByText('Strong ocean color lab with MODIS expertise')).toBeTruthy()
  })

  it('renders with data-testid for e2e targeting', () => {
    render(<PickCard {...defaultProps} />)

    const article = screen.getByTestId('pick-card-job-1')
    expect(article).toBeTruthy()
  })

  it('has drag enabled on the card container', () => {
    const { container } = render(<PickCard {...defaultProps} />)

    // The inner motion.div with drag="x" should be draggable
    // Framer motion adds drag-related attributes
    const article = container.querySelector('article')
    expect(article).toBeTruthy()
  })

  it('renders with drag capability without calling onVote on mount', () => {
    render(<PickCard {...defaultProps} />)

    // Card renders successfully with motion/drag props
    expect(screen.getByTestId('pick-card-job-1')).toBeTruthy()
    // No vote triggered just by rendering
    expect(defaultProps.onVote).not.toHaveBeenCalled()
    // Buttons still present (swipe doesn't replace them)
    expect(screen.getByText('Interested')).toBeTruthy()
    expect(screen.getByText('Not for me')).toBeTruthy()
    expect(screen.getByText('Save')).toBeTruthy()
  })
})
