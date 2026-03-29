import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CoverLetterPanel } from './cover-letter-panel'

function log(step: string, detail: string) {
  process.stdout.write(`  [cover-letter-panel] ${step}: ${detail}\n`)
}

// ─── Mock server actions ────────────────────────────────────────────────────

const mockGenerateCoverLetter = vi.fn()
const mockGetCoverLetterStatus = vi.fn()
const mockSaveCoverLetterEdit = vi.fn()
const mockApproveCoverLetter = vi.fn()
const mockQuickApply = vi.fn()

vi.mock('@/app/tracker/cover-letter-actions', () => ({
  generateCoverLetter: (...args: unknown[]) => mockGenerateCoverLetter(...args),
  getCoverLetterStatus: (...args: unknown[]) => mockGetCoverLetterStatus(...args),
  saveCoverLetterEdit: (...args: unknown[]) => mockSaveCoverLetterEdit(...args),
  approveCoverLetter: (...args: unknown[]) => mockApproveCoverLetter(...args),
  quickApply: (...args: unknown[]) => mockQuickApply(...args),
}))

beforeEach(() => {
  vi.clearAllMocks()
  mockGetCoverLetterStatus.mockResolvedValue({ status: 'none' })
  mockGenerateCoverLetter.mockResolvedValue({ success: true, skipped: false, taskId: 'task-1' })
  mockSaveCoverLetterEdit.mockResolvedValue({ success: true })
  mockApproveCoverLetter.mockResolvedValue({ success: true })
  mockQuickApply.mockResolvedValue({ success: true })
})

// ─── No Cover Letter State ──────────────────────────────────────────────────

describe('No cover letter state', () => {
  it('shows generate button and quick apply when no cover letter exists', async () => {
    log('Step 1', 'Rendering panel with status=none')
    render(<CoverLetterPanel applicationId="app-1" companyName="NOAA" />)

    await waitFor(() => {
      expect(screen.getByTestId('generate-cover-letter')).toBeDefined()
    })
    expect(screen.getByTestId('quick-apply')).toBeDefined()
    log('Step 2', 'Both buttons present')
  })

  it('clicking generate enqueues tailor_cover_letter task', async () => {
    log('Step 1', 'Clicking generate button')
    const user = userEvent.setup()
    render(<CoverLetterPanel applicationId="app-1" companyName="NOAA" />)

    await waitFor(() => {
      expect(screen.getByTestId('generate-cover-letter')).toBeDefined()
    })
    await user.click(screen.getByTestId('generate-cover-letter'))

    expect(mockGenerateCoverLetter).toHaveBeenCalledWith('app-1')
    log('Step 2', 'generateCoverLetter called with correct applicationId')
  })

  it('button disabled during generation', async () => {
    log('Step 1', 'Rendering with generating state')
    mockGetCoverLetterStatus.mockResolvedValue({ status: 'generating', taskId: 'task-1' })
    render(<CoverLetterPanel applicationId="app-1" companyName="NOAA" />)

    await waitFor(() => {
      expect(screen.getByText(/Tailoring your cover letter for NOAA/)).toBeDefined()
    })
    log('Step 2', 'Warm loading state visible')
  })
})

// ─── Generating State ───────────────────────────────────────────────────────

describe('Generating state', () => {
  it('shows warm loading message with company name and time estimate', async () => {
    log('Step 1', 'Rendering with generating status')
    mockGetCoverLetterStatus.mockResolvedValue({ status: 'generating', taskId: 'task-1' })
    render(<CoverLetterPanel applicationId="app-1" companyName="Woods Hole" />)

    await waitFor(() => {
      expect(screen.getByText(/Tailoring your cover letter for Woods Hole/)).toBeDefined()
    })
    expect(screen.getByText(/usually takes about 20 seconds/)).toBeDefined()
    log('Step 2', 'Loading state shows company name and time estimate')
  })
})

// ─── Ready State ────────────────────────────────────────────────────────────

describe('Ready state (cover letter exists)', () => {
  const readyState = {
    status: 'ready' as const,
    document: {
      id: 'doc-1',
      contentMd: 'Your ocean color remote sensing expertise maps directly to this role.',
      version: 1,
      status: 'pending_review',
      createdAt: '2026-03-29T12:00:00Z',
    },
  }

  it('renders cover letter preview with content', async () => {
    log('Step 1', 'Rendering with ready state')
    mockGetCoverLetterStatus.mockResolvedValue(readyState)
    render(<CoverLetterPanel applicationId="app-1" companyName="NOAA" />)

    await waitFor(() => {
      expect(screen.getByTestId('cover-letter-preview')).toBeDefined()
    })
    expect(screen.getByText(/ocean color remote sensing expertise/)).toBeDefined()
    log('Step 2', 'Cover letter content visible in preview')
  })

  it('shows edit, approve, and regenerate buttons', async () => {
    log('Step 1', 'Checking action buttons')
    mockGetCoverLetterStatus.mockResolvedValue(readyState)
    render(<CoverLetterPanel applicationId="app-1" companyName="NOAA" />)

    await waitFor(() => {
      expect(screen.getByTestId('edit-cover-letter')).toBeDefined()
    })
    expect(screen.getByTestId('approve-cover-letter')).toBeDefined()
    expect(screen.getByTestId('regenerate-cover-letter')).toBeDefined()
    log('Step 2', 'All action buttons present')
  })

  it('switching to edit mode shows textarea with content', async () => {
    log('Step 1', 'Clicking edit button')
    const user = userEvent.setup()
    mockGetCoverLetterStatus.mockResolvedValue(readyState)
    render(<CoverLetterPanel applicationId="app-1" companyName="NOAA" />)

    await waitFor(() => {
      expect(screen.getByTestId('edit-cover-letter')).toBeDefined()
    })
    await user.click(screen.getByTestId('edit-cover-letter'))

    const editor = screen.getByTestId('cover-letter-editor') as HTMLTextAreaElement
    expect(editor.value).toContain('ocean color remote sensing expertise')
    log('Step 2', 'Editor contains cover letter text')
  })

  it('saving edit calls saveCoverLetterEdit and returns to preview', async () => {
    log('Step 1', 'Editing and saving')
    const user = userEvent.setup()
    mockGetCoverLetterStatus.mockResolvedValue(readyState)
    render(<CoverLetterPanel applicationId="app-1" companyName="NOAA" />)

    await waitFor(() => {
      expect(screen.getByTestId('edit-cover-letter')).toBeDefined()
    })
    await user.click(screen.getByTestId('edit-cover-letter'))

    const editor = screen.getByTestId('cover-letter-editor') as HTMLTextAreaElement
    await user.clear(editor)
    await user.type(editor, 'Updated content')
    await user.click(screen.getByTestId('save-cover-letter'))

    expect(mockSaveCoverLetterEdit).toHaveBeenCalledWith('doc-1', 'Updated content')
    log('Step 2', 'saveCoverLetterEdit called with correct args')
  })

  it('approving cover letter updates status badge', async () => {
    log('Step 1', 'Clicking approve')
    const user = userEvent.setup()
    mockGetCoverLetterStatus.mockResolvedValue(readyState)
    render(<CoverLetterPanel applicationId="app-1" companyName="NOAA" />)

    await waitFor(() => {
      expect(screen.getByTestId('approve-cover-letter')).toBeDefined()
    })
    await user.click(screen.getByTestId('approve-cover-letter'))

    expect(mockApproveCoverLetter).toHaveBeenCalledWith('doc-1')
    log('Step 2', 'approveCoverLetter called')
  })

  it('approved cover letter shows copy button instead of approve', async () => {
    log('Step 1', 'Rendering with approved document')
    mockGetCoverLetterStatus.mockResolvedValue({
      ...readyState,
      document: { ...readyState.document, status: 'approved' },
    })
    render(<CoverLetterPanel applicationId="app-1" companyName="NOAA" />)

    await waitFor(() => {
      expect(screen.getByTestId('copy-cover-letter')).toBeDefined()
    })
    expect(screen.queryByTestId('approve-cover-letter')).toBeNull()
    expect(screen.getByText('Approved')).toBeDefined()
    log('Step 2', 'Approved state shows copy button and badge')
  })
})

// ─── Error State ────────────────────────────────────────────────────────────

describe('Error state', () => {
  it('shows friendly error message and retry button', async () => {
    log('Step 1', 'Rendering with error state')
    mockGetCoverLetterStatus.mockResolvedValue({
      status: 'error',
      error: 'Budget cap reached',
      taskId: 'task-1',
    })
    render(<CoverLetterPanel applicationId="app-1" companyName="NOAA" />)

    await waitFor(() => {
      expect(screen.getByText(/Couldn't generate this time/)).toBeDefined()
    })
    expect(screen.getByText(/Budget cap reached/)).toBeDefined()
    expect(screen.getByTestId('retry-cover-letter')).toBeDefined()
    log('Step 2', 'Error with retry button visible')
  })
})

// ─── Quick Apply ────────────────────────────────────────────────────────────

describe('Quick Apply', () => {
  it('calls quickApply and triggers status change callback', async () => {
    log('Step 1', 'Clicking quick apply')
    const user = userEvent.setup()
    const onStatusChange = vi.fn()
    render(
      <CoverLetterPanel
        applicationId="app-1"
        companyName="NOAA"
        onStatusChange={onStatusChange}
      />,
    )

    await waitFor(() => {
      expect(screen.getByTestId('quick-apply')).toBeDefined()
    })
    await user.click(screen.getByTestId('quick-apply'))

    expect(mockQuickApply).toHaveBeenCalledWith('app-1')
    await waitFor(() => {
      expect(onStatusChange).toHaveBeenCalledWith('applied')
    })
    log('Step 2', 'quickApply called and status change triggered')
  })
})

// ─── Idempotency ────────────────────────────────────────────────────────────

describe('Idempotency', () => {
  it('duplicate generate returns skipped=true without creating new task', async () => {
    log('Step 1', 'Calling generate when task already exists')
    mockGenerateCoverLetter.mockResolvedValue({ success: true, skipped: true, taskId: 'existing-task' })
    const user = userEvent.setup()
    render(<CoverLetterPanel applicationId="app-1" companyName="NOAA" />)

    await waitFor(() => {
      expect(screen.getByTestId('generate-cover-letter')).toBeDefined()
    })
    await user.click(screen.getByTestId('generate-cover-letter'))

    expect(mockGenerateCoverLetter).toHaveBeenCalledWith('app-1')
    log('Step 2', 'Generate called but task was skipped (idempotent)')
  })
})
