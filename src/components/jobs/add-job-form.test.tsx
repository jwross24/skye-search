import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// ─── Mock server actions before component import ──────────────────────────────

const mockAddManualJob = vi.fn().mockResolvedValue({ success: true, jobId: 'new-job-1' })

vi.mock('@/app/jobs/actions', () => ({
  addManualJob: (...args: unknown[]) => mockAddManualJob(...args),
}))

const mockAnalyzeJobUrl = vi.fn().mockResolvedValue({
  success: true,
  fields: {
    title: 'Research Scientist',
    company: 'Woods Hole Oceanographic',
    location: 'Woods Hole, MA',
    visa_path: 'cap_exempt',
    employer_type: 'nonprofit_research',
    application_deadline: '2026-06-01',
    description_summary: 'Ocean biogeochemistry research using PACE satellite data.',
  },
})

vi.mock('@/app/jobs/url-analysis-actions', () => ({
  analyzeJobUrl: (...args: unknown[]) => mockAnalyzeJobUrl(...args),
}))

// ─── Component import (after mocks) ──────────────────────────────────────────

import { AddJobForm } from './add-job-form'

describe('AddJobForm', () => {
  const defaultProps = {
    onClose: vi.fn(),
    onAdded: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockAddManualJob.mockResolvedValue({ success: true, jobId: 'new-job-1' })
    mockAnalyzeJobUrl.mockResolvedValue({
      success: true,
      fields: {
        title: 'Research Scientist',
        company: 'Woods Hole Oceanographic',
        location: 'Woods Hole, MA',
        visa_path: 'cap_exempt',
        employer_type: 'nonprofit_research',
        application_deadline: '2026-06-01',
        description_summary: 'Ocean biogeochemistry research using PACE satellite data.',
      },
    })
  })

  // ─── Existing form tests ────────────────────────────────────────────────────

  it('renders form with required fields', () => {
    render(<AddJobForm {...defaultProps} />)

    expect(screen.getByLabelText(/job title/i)).toBeTruthy()
    expect(screen.getByLabelText(/company/i)).toBeTruthy()
    expect(screen.getByLabelText(/job url/i)).toBeTruthy()
    expect(screen.getByLabelText(/location/i)).toBeTruthy()
    expect(screen.getByLabelText(/sponsorship path/i)).toBeTruthy()
    expect(screen.getByLabelText(/organization type/i)).toBeTruthy()
    expect(screen.getByText('Add job')).toBeTruthy()
  })

  it('submits form with required fields only', async () => {
    const user = userEvent.setup()
    render(<AddJobForm {...defaultProps} />)

    await user.type(screen.getByLabelText(/job title/i), 'Research Scientist')
    await user.type(screen.getByLabelText(/company/i), 'Woods Hole')
    await user.click(screen.getByText('Add job'))

    expect(mockAddManualJob).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Research Scientist',
        company: 'Woods Hole',
      }),
    )
    expect(defaultProps.onAdded).toHaveBeenCalled()
    expect(defaultProps.onClose).toHaveBeenCalled()
  })

  it('submits form with all fields filled', async () => {
    const user = userEvent.setup()
    render(<AddJobForm {...defaultProps} />)

    await user.type(screen.getByLabelText(/job title/i), 'Postdoc')
    await user.type(screen.getByLabelText(/company/i), 'MIT')
    await user.type(screen.getByLabelText(/job url/i), 'https://mit.edu/jobs/123')
    await user.type(screen.getByLabelText(/location/i), 'Cambridge, MA')
    await user.selectOptions(screen.getByLabelText(/sponsorship path/i), 'cap_exempt')
    await user.selectOptions(screen.getByLabelText(/organization type/i), 'university')
    await user.type(screen.getByLabelText(/notes/i), 'Great ocean color lab')
    await user.click(screen.getByText('Add job'))

    expect(mockAddManualJob).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Postdoc',
        company: 'MIT',
        url: 'https://mit.edu/jobs/123',
        location: 'Cambridge, MA',
        visa_path: 'cap_exempt',
        employer_type: 'university',
        notes: 'Great ocean color lab',
      }),
    )
  })

  it('shows error on server failure', async () => {
    mockAddManualJob.mockResolvedValue({ success: false, error: 'Database error' })
    const user = userEvent.setup()
    render(<AddJobForm {...defaultProps} />)

    await user.type(screen.getByLabelText(/job title/i), 'Test')
    await user.type(screen.getByLabelText(/company/i), 'Test Co')
    await user.click(screen.getByText('Add job'))

    await waitFor(() => {
      expect(screen.getByText('Database error')).toBeTruthy()
    })
    // Should NOT close on error
    expect(defaultProps.onClose).not.toHaveBeenCalled()
  })

  it('calls onClose when cancel is clicked', async () => {
    const user = userEvent.setup()
    render(<AddJobForm {...defaultProps} />)

    await user.click(screen.getByText('Cancel'))
    expect(defaultProps.onClose).toHaveBeenCalled()
  })

  it('calls onClose when X button is clicked', async () => {
    const user = userEvent.setup()
    render(<AddJobForm {...defaultProps} />)

    await user.click(screen.getByRole('button', { name: 'Close' }))
    expect(defaultProps.onClose).toHaveBeenCalled()
  })

  it('disables submit button while submitting', async () => {
    // Make the action hang
    mockAddManualJob.mockReturnValue(new Promise(() => {}))
    const user = userEvent.setup()
    render(<AddJobForm {...defaultProps} />)

    await user.type(screen.getByLabelText(/job title/i), 'Test')
    await user.type(screen.getByLabelText(/company/i), 'Test Co')
    await user.click(screen.getByText('Add job'))

    // Button should be disabled
    const submitButton = screen.getByText('Add job').closest('button')
    expect(submitButton?.disabled).toBe(true)
  })

  // ─── URL analysis tests ────────────────────────────────────────────────────

  it('does NOT show Analyze button when URL field is empty', () => {
    render(<AddJobForm {...defaultProps} />)

    expect(screen.queryByRole('button', { name: /look it up/i })).toBeNull()
    expect(screen.queryByRole('button', { name: /look up job/i })).toBeNull()
  })

  it('shows Look it up button when URL is entered and title is empty', async () => {
    const user = userEvent.setup()
    render(<AddJobForm {...defaultProps} />)

    await user.type(screen.getByLabelText(/job url/i), 'https://whoi.edu/jobs/123')

    expect(
      screen.getByRole('button', { name: /look up job details/i }),
    ).toBeTruthy()
  })

  it('still shows Look it up button when URL is entered and title is already filled (allows re-analysis)', async () => {
    const user = userEvent.setup()
    render(<AddJobForm {...defaultProps} />)

    // Fill title first, then URL — button should still show because
    // Skye might paste a different URL and want to re-analyze
    await user.type(screen.getByLabelText(/job title/i), 'My Job')
    await user.type(screen.getByLabelText(/job url/i), 'https://whoi.edu/jobs/123')

    expect(screen.getByRole('button', { name: /look up job details/i })).toBeTruthy()
  })

  it('fires analyzeJobUrl and populates fields on success', async () => {
    const user = userEvent.setup()
    render(<AddJobForm {...defaultProps} />)

    await user.type(screen.getByLabelText(/job url/i), 'https://whoi.edu/jobs/123')
    await user.click(screen.getByRole('button', { name: /look up job details/i }))

    await waitFor(() => {
      expect(screen.getByDisplayValue('Research Scientist')).toBeTruthy()
    })

    expect(mockAnalyzeJobUrl).toHaveBeenCalledWith('https://whoi.edu/jobs/123')
    expect(screen.getByDisplayValue('Woods Hole Oceanographic')).toBeTruthy()
    expect(screen.getByDisplayValue('Woods Hole, MA')).toBeTruthy()
  })

  it('shows description summary after analysis', async () => {
    const user = userEvent.setup()
    render(<AddJobForm {...defaultProps} />)

    await user.type(screen.getByLabelText(/job url/i), 'https://whoi.edu/jobs/123')
    await user.click(screen.getByRole('button', { name: /look up job details/i }))

    await waitFor(() => {
      expect(
        screen.getByText('Ocean biogeochemistry research using PACE satellite data.'),
      ).toBeTruthy()
    })
  })

  it('shows error message when analysis fails', async () => {
    mockAnalyzeJobUrl.mockResolvedValue({
      success: false,
      error: 'Could not fetch page (HTTP 403)',
    })

    const user = userEvent.setup()
    render(<AddJobForm {...defaultProps} />)

    await user.type(screen.getByLabelText(/job url/i), 'https://private.jobs.com/123')
    await user.click(screen.getByRole('button', { name: /look up job details/i }))

    await waitFor(() => {
      expect(screen.getByText('Could not fetch page (HTTP 403)')).toBeTruthy()
    })
  })

  it('shows loading state during analysis', async () => {
    // Make the action hang so we can catch the loading state
    mockAnalyzeJobUrl.mockReturnValue(new Promise(() => {}))

    const user = userEvent.setup()
    render(<AddJobForm {...defaultProps} />)

    await user.type(screen.getByLabelText(/job url/i), 'https://whoi.edu/jobs/123')
    await user.click(screen.getByRole('button', { name: /look up job details/i }))

    // Loading text should appear
    expect(screen.getByText(/reading\.\.\./i)).toBeTruthy()
  })

  it('allows editing auto-populated fields before submitting', async () => {
    const user = userEvent.setup()
    render(<AddJobForm {...defaultProps} />)

    // Trigger analysis
    await user.type(screen.getByLabelText(/job url/i), 'https://whoi.edu/jobs/123')
    await user.click(screen.getByRole('button', { name: /look up job details/i }))

    // Wait for population
    await waitFor(() => {
      expect(screen.getByDisplayValue('Research Scientist')).toBeTruthy()
    })

    // Edit the title field
    const titleInput = screen.getByLabelText(/job title/i)
    await user.clear(titleInput)
    await user.type(titleInput, 'Senior Research Scientist')

    // Submit
    await user.click(screen.getByText('Add job'))

    expect(mockAddManualJob).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Senior Research Scientist',
        company: 'Woods Hole Oceanographic',
      }),
    )
  })

  it('shows success confirmation after analysis completes', async () => {
    const user = userEvent.setup()
    render(<AddJobForm {...defaultProps} />)

    await user.type(screen.getByLabelText(/job url/i), 'https://whoi.edu/jobs/123')
    await user.click(screen.getByRole('button', { name: /look up job details/i }))

    await waitFor(() => {
      expect(screen.getByText(/fields filled in below/i)).toBeTruthy()
    })
  })
})
