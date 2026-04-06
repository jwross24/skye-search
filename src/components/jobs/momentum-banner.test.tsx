import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

// Mock the server action — must happen before component import
vi.mock('@/app/jobs/momentum-actions', () => ({
  markMilestoneSeen: vi.fn().mockResolvedValue(undefined),
}))

const { MomentumBanner } = await import('./momentum-banner')
const { markMilestoneSeen } = await import('@/app/jobs/momentum-actions')

describe('MomentumBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the momentum message when provided', () => {
    render(
      <MomentumBanner
        message="You explored 5 jobs this week. You're building momentum."
        milestone={null}
      />,
    )
    expect(screen.getByText(/explored 5 jobs/i)).toBeInTheDocument()
  })

  it('renders the milestone message when provided', () => {
    render(
      <MomentumBanner
        message={null}
        milestone={{ key: 'first_review', message: 'First job reviewed!' }}
      />,
    )
    expect(screen.getByText(/First job reviewed/)).toBeInTheDocument()
  })

  it('renders both message and milestone together', () => {
    render(
      <MomentumBanner
        message="You applied to 2 roles this week."
        milestone={{ key: 'first_application', message: 'First application submitted!' }}
      />,
    )
    expect(screen.getByText(/applied to 2 roles/i)).toBeInTheDocument()
    expect(screen.getByText(/First application submitted/)).toBeInTheDocument()
  })

  it('renders nothing visible when both message and milestone are null', () => {
    const { container } = render(
      <MomentumBanner message={null} milestone={null} />,
    )
    // The wrapper div renders but contains no meaningful text
    expect(container.textContent?.trim()).toBe('')
  })

  it('calls markMilestoneSeen when a milestone is rendered', () => {
    render(
      <MomentumBanner
        message={null}
        milestone={{ key: 'ten_applications', message: '10 applications. You\'re in the groove.' }}
      />,
    )
    expect(markMilestoneSeen).toHaveBeenCalledWith('ten_applications')
  })

  it('does not call markMilestoneSeen when milestone is null', () => {
    render(<MomentumBanner message="Some message." milestone={null} />)
    expect(markMilestoneSeen).not.toHaveBeenCalled()
  })

  it('never contains alarming or guilt language', () => {
    render(
      <MomentumBanner
        message="You explored 3 jobs this week. You're building momentum."
        milestone={null}
      />,
    )
    const text = document.body.textContent ?? ''
    expect(text).not.toMatch(/warning/i)
    expect(text).not.toMatch(/streak/i)
    expect(text).not.toMatch(/only \d/i)
    expect(text).not.toMatch(/behind/i)
  })
})
