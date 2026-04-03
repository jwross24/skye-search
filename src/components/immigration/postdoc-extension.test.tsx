import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('@/app/immigration/actions', () => ({
  updatePostdocEndDate: vi.fn().mockResolvedValue({
    success: true,
    corrections_count: 3,
    old_end_date: '2026-04-11',
    new_end_date: '2026-07-01',
  }),
}))

import { PostdocExtension } from './postdoc-extension'
import { updatePostdocEndDate } from '@/app/immigration/actions'

describe('PostdocExtension', () => {
  const defaultProps = {
    currentEndDate: '2026-04-11',
    today: '2026-04-02',
    onExtended: vi.fn(),
  }

  it('shows current postdoc end date', () => {
    render(<PostdocExtension {...defaultProps} />)
    expect(screen.getByText(/April 11, 2026/)).toBeTruthy()
  })

  it('shows days remaining when postdoc is active', () => {
    render(<PostdocExtension {...defaultProps} />)
    expect(screen.getByText(/9 days remaining/)).toBeTruthy()
  })

  it('shows "ended" when postdoc period has passed', () => {
    render(<PostdocExtension {...defaultProps} today="2026-05-01" />)
    expect(screen.getByText(/PostDoc period has ended/)).toBeTruthy()
  })

  it('shows "Last day today" when today equals end date', () => {
    render(<PostdocExtension {...defaultProps} today="2026-04-11" currentEndDate="2026-04-11" />)
    expect(screen.getByText(/Last day today/)).toBeTruthy()
  })

  it('opens confirmation dialog on "Update date" click', async () => {
    const user = userEvent.setup()
    render(<PostdocExtension {...defaultProps} />)

    await user.click(screen.getByRole('button', { name: /update date/i }))

    expect(screen.getByText(/Update PostDoc end date/)).toBeTruthy()
    expect(screen.getByLabelText(/new I-20 end date/i)).toBeTruthy()
  })

  it('disables confirm button when no date entered', async () => {
    const user = userEvent.setup()
    render(<PostdocExtension {...defaultProps} />)

    await user.click(screen.getByRole('button', { name: /update date/i }))

    const confirmBtn = screen.getByRole('button', { name: /confirm update/i })
    expect(confirmBtn).toHaveProperty('disabled', true)
  })

  it('calls updatePostdocEndDate on confirmation and shows success', async () => {
    const user = userEvent.setup()
    const onExtended = vi.fn()
    render(<PostdocExtension {...defaultProps} onExtended={onExtended} />)

    await user.click(screen.getByRole('button', { name: /update date/i }))

    const dateInput = screen.getByLabelText(/new I-20 end date/i)
    await user.clear(dateInput)
    await user.type(dateInput, '2026-07-01')

    await user.click(screen.getByRole('button', { name: /confirm update/i }))

    expect(updatePostdocEndDate).toHaveBeenCalledWith('2026-07-01')
    expect(onExtended).toHaveBeenCalledWith('2026-07-01')

    // Success message appears
    expect(await screen.findByText(/3 days corrected on your unemployment clock/)).toBeTruthy()
    expect(screen.getByText(/Confirm with your DSO/)).toBeTruthy()
  })

  it('shows error message on failure', async () => {
    vi.mocked(updatePostdocEndDate).mockResolvedValueOnce({
      success: false,
      error: 'No immigration status found',
    })

    const user = userEvent.setup()
    render(<PostdocExtension {...defaultProps} />)

    await user.click(screen.getByRole('button', { name: /update date/i }))

    const dateInput = screen.getByLabelText(/new I-20 end date/i)
    await user.clear(dateInput)
    await user.type(dateInput, '2026-07-01')

    await user.click(screen.getByRole('button', { name: /confirm update/i }))

    expect(await screen.findByText(/No immigration status found/)).toBeTruthy()
  })

  it('shows "no adjustments needed" when 0 corrections', async () => {
    vi.mocked(updatePostdocEndDate).mockResolvedValueOnce({
      success: true,
      corrections_count: 0,
      old_end_date: '2026-04-11',
      new_end_date: '2026-04-15',
    })

    const user = userEvent.setup()
    render(<PostdocExtension {...defaultProps} />)

    await user.click(screen.getByRole('button', { name: /update date/i }))

    const dateInput = screen.getByLabelText(/new I-20 end date/i)
    await user.clear(dateInput)
    await user.type(dateInput, '2026-04-15')

    await user.click(screen.getByRole('button', { name: /confirm update/i }))

    expect(await screen.findByText(/All set. No clock adjustments were needed/)).toBeTruthy()
  })
})
