import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AddJobForm } from './add-job-form'

const mockAddManualJob = vi.fn().mockResolvedValue({ success: true, jobId: 'new-job-1' })

vi.mock('@/app/jobs/actions', () => ({
  addManualJob: (...args: unknown[]) => mockAddManualJob(...args),
}))

describe('AddJobForm', () => {
  const defaultProps = {
    onClose: vi.fn(),
    onAdded: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockAddManualJob.mockResolvedValue({ success: true, jobId: 'new-job-1' })
  })

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

    await vi.waitFor(() => {
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
})
