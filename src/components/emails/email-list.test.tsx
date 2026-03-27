import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('@/app/emails/actions', () => ({
  classifyEmail: vi.fn().mockResolvedValue({ success: true }),
}))

import { EmailList } from './email-list'
import { classifyEmail } from '@/app/emails/actions'

const mockEmails = [
  {
    id: 'email-1',
    sender: 'alerts@indeed.com',
    subject: 'New jobs matching your search',
    body_text: 'We found 5 new postdoc positions in environmental science near Boston.',
    status: 'unprocessed',
    created_at: '2026-03-26T14:00:00Z',
  },
  {
    id: 'email-2',
    sender: 'hr@university.edu',
    subject: 'Application status update',
    body_text: 'Thank you for applying to the Research Scientist position.',
    status: 'unprocessed',
    created_at: '2026-03-26T10:00:00Z',
  },
  {
    id: 'email-3',
    sender: 'noreply@linkedin.com',
    subject: 'Your weekly digest',
    body_text: null,
    status: 'classified',
    created_at: '2026-03-25T08:00:00Z',
  },
]

describe('EmailList', () => {
  it('renders empty state when no emails', () => {
    render(<EmailList emails={[]} />)
    expect(screen.getByText('No emails yet')).toBeDefined()
    expect(screen.getByText(/Forward job alerts/)).toBeDefined()
  })

  it('renders unprocessed emails with sender and subject', () => {
    render(<EmailList emails={mockEmails} />)
    expect(screen.getByText('alerts@indeed.com')).toBeDefined()
    expect(screen.getByText('New jobs matching your search')).toBeDefined()
    expect(screen.getByText('hr@university.edu')).toBeDefined()
    expect(screen.getByText('Application status update')).toBeDefined()
  })

  it('shows classification buttons on unprocessed emails', () => {
    render(<EmailList emails={mockEmails} />)
    const jobAlertButtons = screen.getAllByRole('button', { name: /Job alert/i })
    const appUpdateButtons = screen.getAllByRole('button', { name: /App update/i })
    const ignoreButtons = screen.getAllByRole('button', { name: /Ignore/i })

    // 2 unprocessed emails should have action buttons
    expect(jobAlertButtons.length).toBe(2)
    expect(appUpdateButtons.length).toBe(2)
    expect(ignoreButtons.length).toBe(2)
  })

  it('does not show classification buttons on processed emails', () => {
    const processed = [mockEmails[2]] // classified email only
    render(<EmailList emails={processed} />)
    expect(screen.queryByRole('button', { name: /Job alert/i })).toBeNull()
    expect(screen.getAllByText('Classified').length).toBeGreaterThan(0)
  })

  it('clicking Job alert calls classifyEmail server action', async () => {
    const user = userEvent.setup()
    vi.mocked(classifyEmail).mockClear()
    render(<EmailList emails={[mockEmails[0]]} />)

    const jobAlertBtn = screen.getByRole('button', { name: /Job alert/i })
    await user.click(jobAlertBtn)

    expect(classifyEmail).toHaveBeenCalledWith('email-1', 'job_alert')
  })

  it('clicking Ignore calls classifyEmail with ignore', async () => {
    const user = userEvent.setup()
    vi.mocked(classifyEmail).mockClear()
    render(<EmailList emails={[mockEmails[0]]} />)

    const ignoreBtn = screen.getByRole('button', { name: /Ignore/i })
    await user.click(ignoreBtn)

    expect(classifyEmail).toHaveBeenCalledWith('email-1', 'ignore')
  })

  it('shows body preview truncated to 200 chars', () => {
    const longBody = 'A'.repeat(300)
    const email = { ...mockEmails[0], body_text: longBody }
    render(<EmailList emails={[email]} />)

    // Should show first 200 chars
    const preview = screen.getByText(longBody.slice(0, 200))
    expect(preview).toBeDefined()
  })

  it('shows "to classify" count for unprocessed section', () => {
    render(<EmailList emails={mockEmails} />)
    expect(screen.getByText('2 to classify')).toBeDefined()
  })

  it('separates unprocessed and classified emails into sections', () => {
    render(<EmailList emails={mockEmails} />)
    expect(screen.getByText('2 to classify')).toBeDefined()
    expect(screen.getAllByText('Classified').length).toBeGreaterThan(0)
  })

  it('handles null sender gracefully', () => {
    const email = { ...mockEmails[0], sender: null }
    render(<EmailList emails={[email]} />)
    expect(screen.getByText('Unknown sender')).toBeDefined()
  })

  it('handles null subject gracefully', () => {
    const email = { ...mockEmails[0], subject: null }
    render(<EmailList emails={[email]} />)
    expect(screen.getByText('(no subject)')).toBeDefined()
  })
})
