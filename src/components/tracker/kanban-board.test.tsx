import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { KanbanBoard, type TrackedApplication } from './kanban-board'
import { seedJobs } from '@/db/seed'

function log(step: string, detail: string) {
  process.stdout.write(`  [kanban test] ${step}: ${detail}\n`)
}

// ─── Toast mock ──────────────────────────────────────────────────────────

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}))

// ─── Server action mocks ──────────────────────────────────────────────────

vi.mock('@/app/tracker/actions', () => ({
  moveApplication: vi.fn().mockResolvedValue({ success: true }),
  updateApplicationNotes: vi.fn().mockResolvedValue({ success: true }),
  captureRejection: vi.fn().mockResolvedValue({ success: true }),
  uninterestApplication: vi.fn().mockResolvedValue({ success: true }),
  snoozeApplication: vi.fn().mockResolvedValue({ success: true }),
  archiveApplication: vi.fn().mockResolvedValue({ success: true }),
}))

vi.mock('@/app/tracker/cover-letter-actions', () => ({
  generateCoverLetter: vi.fn().mockResolvedValue({ success: true, skipped: false, taskId: 'task-1' }),
  getCoverLetterStatus: vi.fn().mockResolvedValue({ status: 'none' }),
  saveCoverLetterEdit: vi.fn().mockResolvedValue({ success: true }),
  approveCoverLetter: vi.fn().mockResolvedValue({ success: true }),
  quickApply: vi.fn().mockResolvedValue({ success: true }),
}))

// ─── Mobile mock ──────────────────────────────────────────────────────────

let mockIsMobile = false
vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: () => mockIsMobile,
}))

beforeEach(() => {
  mockIsMobile = false
})

// ─── Seed Data ──────────────────────────────────────────────────────────────

const SEED_APPS: TrackedApplication[] = [
  {
    id: 'app-brown',
    job: seedJobs.find((j) => j.company.includes('Brown'))!,
    status: 'applied',
    dateAdded: '2026-03-24',
    notes: 'Applied via website',
    nextAction: 'Follow up in 2 weeks',
    nextActionDate: '2026-04-07',
    contacts: [{ name: 'PI Contact', email: 'pi@brown.edu', role: 'Faculty' }],
  },
  {
    id: 'app-woodwell',
    job: seedJobs.find((j) => j.company.includes('Woodwell') && j.title.includes('Geospatial'))!,
    status: 'applied',
    dateAdded: '2026-03-23',
    notes: '',
    nextAction: '',
    nextActionDate: '',
    contacts: [],
  },
  {
    id: 'app-bu-sif',
    job: seedJobs.find((j) => j.company.includes('Hutyra') && j.title.includes('SIF'))!,
    status: 'interested',
    dateAdded: '2026-03-25',
    notes: '',
    nextAction: 'Read recent publications',
    nextActionDate: '',
    contacts: [],
  },
  {
    id: 'app-ibss',
    job: seedJobs.find((j) => j.company.includes('IBSS'))!,
    status: 'interview',
    dateAdded: '2026-03-20',
    notes: 'Phone screen went well',
    nextAction: 'Prepare for technical interview',
    nextActionDate: '2026-04-01',
    contacts: [],
  },
  {
    id: 'app-rejected',
    job: seedJobs.find((j) => j.company.includes('ERM'))!,
    status: 'rejected',
    dateAdded: '2026-03-15',
    notes: 'Form rejection email',
    nextAction: '',
    nextActionDate: '',
    contacts: [],
  },
]

// ─── Column Rendering ───────────────────────────────────────────────────────

describe('Kanban columns', () => {
  it('renders 6 columns when Phone Screen is unlocked: Interested, Tailoring, Applied, Phone Screen, Interview, Offer + Rejected', () => {
    log('Step 1', 'Rendering board with seed data (has interview card → Phone Screen visible)')
    render(<KanbanBoard initialApplications={SEED_APPS} />)

    expect(screen.getByTestId('column-interested')).toBeDefined()
    expect(screen.getByTestId('column-tailoring')).toBeDefined()
    expect(screen.getByTestId('column-applied')).toBeDefined()
    expect(screen.getByTestId('column-phone_screen')).toBeDefined()
    expect(screen.getByTestId('column-interview')).toBeDefined()
    expect(screen.getByTestId('column-offer')).toBeDefined()
    log('Step 2', 'All 6 columns + Rejected rendered')
  })

  it('renders Rejected column always visible', () => {
    render(<KanbanBoard initialApplications={SEED_APPS} />)
    expect(screen.getByTestId('column-rejected')).toBeDefined()
  })

  it('renders application cards in correct columns', () => {
    log('Step 1', 'Checking card placement')
    render(<KanbanBoard initialApplications={SEED_APPS} />)

    const interestedCol = screen.getByTestId('column-interested')
    expect(within(interestedCol).getByTestId('card-app-bu-sif')).toBeDefined()

    const appliedCol = screen.getByTestId('column-applied')
    expect(within(appliedCol).getByTestId('card-app-brown')).toBeDefined()
    expect(within(appliedCol).getByTestId('card-app-woodwell')).toBeDefined()

    const interviewCol = screen.getByTestId('column-interview')
    expect(within(interviewCol).getByTestId('card-app-ibss')).toBeDefined()

    const rejectedCol = screen.getByTestId('column-rejected')
    expect(within(rejectedCol).getByTestId('card-app-rejected')).toBeDefined()
    log('Step 2', 'Cards in correct columns')
  })

  it('empty column shows encouraging message', () => {
    render(<KanbanBoard initialApplications={SEED_APPS} />)
    const offerCol = screen.getByTestId('column-offer')
    expect(offerCol.textContent).toContain('The goal')
  })
})

// ─── Progressive Reveal ──────────────────────────────────────────────────

describe('Phone Screen progressive reveal', () => {
  it('Phone Screen column hidden when no cards past Applied', () => {
    log('Step 1', 'Rendering board with only interested + applied cards')
    const earlyApps: TrackedApplication[] = SEED_APPS.filter(
      (a) => a.status === 'interested' || a.status === 'applied',
    )
    render(<KanbanBoard initialApplications={earlyApps} />)

    expect(screen.queryByTestId('column-phone_screen')).toBeNull()
    log('Step 2', 'Phone Screen column hidden — no cards past Applied')
  })

  it('Phone Screen appears after first card moves past Applied', async () => {
    log('Step 1', 'Rendering with only interested + applied cards')
    const user = userEvent.setup()
    const earlyApps: TrackedApplication[] = SEED_APPS.filter(
      (a) => a.status === 'interested' || a.status === 'applied',
    )
    render(<KanbanBoard initialApplications={earlyApps} />)

    expect(screen.queryByTestId('column-phone_screen')).toBeNull()

    log('Step 2', 'Moving card from Applied → Phone Screen')
    const moveBtn = screen.getByTestId('card-app-brown-move-button')
    await user.click(moveBtn)
    const phoneScreenOption = screen.getByTestId('status-phone_screen')
    await user.click(phoneScreenOption)

    log('Step 3', 'Verifying Phone Screen column appeared')
    expect(screen.getByTestId('column-phone_screen')).toBeDefined()
  })

  it('Phone Screen visible when any card is in interview status', () => {
    render(<KanbanBoard initialApplications={SEED_APPS} />)
    // SEED_APPS has app-ibss in 'interview' → Phone Screen should be visible
    expect(screen.getByTestId('column-phone_screen')).toBeDefined()
  })
})

// ─── Card Content ───────────────────────────────────────────────────────────

describe('Application card', () => {
  it('card displays job title, employer, visa path badge, date added', () => {
    log('Step 1', 'Checking card content')
    render(<KanbanBoard initialApplications={SEED_APPS} />)

    const card = screen.getByTestId('card-app-brown')
    expect(card.textContent).toContain('Global Land Surface Remote Sensing')
    expect(card.textContent).toContain('Brown University')
    expect(card.textContent).toContain('Cap-Exempt')
    expect(card.textContent).toContain('Mar 24')
    log('Step 2', 'Card displays all required fields')
  })

  it('card displays next action when present', () => {
    render(<KanbanBoard initialApplications={SEED_APPS} />)
    const card = screen.getByTestId('card-app-bu-sif')
    expect(card.textContent).toContain('Read recent publications')
  })
})

// ─── Card Movement ──────────────────────────────────────────────────────────

describe('Card movement', () => {
  it('click-to-move via dropdown changes card column', async () => {
    log('Step 1', 'Clicking move button on BU SIF card')
    const user = userEvent.setup()
    render(<KanbanBoard initialApplications={SEED_APPS} />)

    // Card starts in Interested
    const interestedCol = screen.getByTestId('column-interested')
    expect(within(interestedCol).getByTestId('card-app-bu-sif')).toBeDefined()

    // Click move button
    const moveBtn = screen.getByTestId('card-app-bu-sif-move-button')
    await user.click(moveBtn)

    log('Step 2', 'Selecting Applied from dropdown')
    const appliedOption = screen.getByTestId('status-applied')
    await user.click(appliedOption)

    // Card should now be in Applied column
    log('Step 3', 'Verifying card moved to Applied')
    const appliedCol = screen.getByTestId('column-applied')
    expect(within(appliedCol).getByTestId('card-app-bu-sif')).toBeDefined()
  })

  it('move to Rejected shows rejection capture', async () => {
    log('Step 1', 'Moving card to Rejected')
    const user = userEvent.setup()
    render(<KanbanBoard initialApplications={SEED_APPS} />)

    const moveBtn = screen.getByTestId('card-app-ibss-move-button')
    await user.click(moveBtn)

    const rejectedOption = screen.getByTestId('status-rejected')
    await user.click(rejectedOption)

    log('Step 2', 'Verifying rejection capture dialog appears')
    expect(screen.getByTestId('rejection-capture')).toBeDefined()
  })
})

// ─── Rejection Quick-Capture ──────────────────────────────────────────────

describe('Rejection quick-capture', () => {
  it('rejection_type captured when moving to Rejected', async () => {
    log('Step 1', 'Moving card to Rejected and selecting form_email')
    const user = userEvent.setup()
    render(<KanbanBoard initialApplications={SEED_APPS} />)

    const moveBtn = screen.getByTestId('card-app-ibss-move-button')
    await user.click(moveBtn)
    await user.click(screen.getByTestId('status-rejected'))

    log('Step 2', 'Selecting form_email rejection type')
    await user.click(screen.getByTestId('rejection-form_email'))

    log('Step 3', 'Verifying card moved to Rejected column')
    const rejectedCol = screen.getByTestId('column-rejected')
    expect(within(rejectedCol).getByTestId('card-app-ibss')).toBeDefined()
  })

  it('skip rejection type and still move to Rejected', async () => {
    const user = userEvent.setup()
    render(<KanbanBoard initialApplications={SEED_APPS} />)

    const moveBtn = screen.getByTestId('card-app-ibss-move-button')
    await user.click(moveBtn)
    await user.click(screen.getByTestId('status-rejected'))
    await user.click(screen.getByTestId('rejection-skip'))

    const rejectedCol = screen.getByTestId('column-rejected')
    expect(within(rejectedCol).getByTestId('card-app-ibss')).toBeDefined()
  })

  it('cancelling rejection capture keeps card in original column', async () => {
    const user = userEvent.setup()
    render(<KanbanBoard initialApplications={SEED_APPS} />)

    const moveBtn = screen.getByTestId('card-app-ibss-move-button')
    await user.click(moveBtn)
    await user.click(screen.getByTestId('status-rejected'))

    // Click backdrop to cancel
    expect(screen.getByTestId('rejection-capture')).toBeDefined()
    await user.keyboard('{Escape}')

    // Card stays in Interview
    const interviewCol = screen.getByTestId('column-interview')
    expect(within(interviewCol).getByTestId('card-app-ibss')).toBeDefined()
  })

  it('rejection capture shows all three options: form_email, personalized, ghosted', async () => {
    const user = userEvent.setup()
    render(<KanbanBoard initialApplications={SEED_APPS} />)

    const moveBtn = screen.getByTestId('card-app-ibss-move-button')
    await user.click(moveBtn)
    await user.click(screen.getByTestId('status-rejected'))

    expect(screen.getByTestId('rejection-form_email')).toBeDefined()
    expect(screen.getByTestId('rejection-personalized')).toBeDefined()
    expect(screen.getByTestId('rejection-ghosted')).toBeDefined()
  })
})

// ─── Offer Verification ──────────────────────────────────────────────────

describe('Offer verification', () => {
  it('moving to Offer shows immigration verification prompt', async () => {
    log('Step 1', 'Moving card to Offer')
    const user = userEvent.setup()
    render(<KanbanBoard initialApplications={SEED_APPS} />)

    const moveBtn = screen.getByTestId('card-app-ibss-move-button')
    await user.click(moveBtn)
    await user.click(screen.getByTestId('status-offer'))

    log('Step 2', 'Verifying offer verification dialog appears')
    const dialog = screen.getByTestId('offer-verification')
    expect(dialog).toBeDefined()
    expect(dialog.textContent).toContain('cap-exempt')
  })

  it('confirming offer moves card to Offer column', async () => {
    const user = userEvent.setup()
    render(<KanbanBoard initialApplications={SEED_APPS} />)

    const moveBtn = screen.getByTestId('card-app-ibss-move-button')
    await user.click(moveBtn)
    await user.click(screen.getByTestId('status-offer'))
    await user.click(screen.getByTestId('offer-confirm'))

    const offerCol = screen.getByTestId('column-offer')
    expect(within(offerCol).getByTestId('card-app-ibss')).toBeDefined()
  })

  it('cancelling offer does not move card', async () => {
    const user = userEvent.setup()
    render(<KanbanBoard initialApplications={SEED_APPS} />)

    const moveBtn = screen.getByTestId('card-app-ibss-move-button')
    await user.click(moveBtn)
    await user.click(screen.getByTestId('status-offer'))
    await user.click(screen.getByTestId('offer-cancel'))

    // Card stays in Interview
    const interviewCol = screen.getByTestId('column-interview')
    expect(within(interviewCol).getByTestId('card-app-ibss')).toBeDefined()
  })
})

// ─── Card Detail View ───────────────────────────────────────────────────────

describe('Card detail view', () => {
  it('click card opens detail panel with notes and contacts', async () => {
    log('Step 1', 'Clicking card to open detail')
    const user = userEvent.setup()
    render(<KanbanBoard initialApplications={SEED_APPS} />)

    await user.click(screen.getByTestId('card-app-brown'))

    log('Step 2', 'Verifying detail panel content')
    const detail = screen.getByTestId('card-detail')
    expect(detail).toBeDefined()
    expect(detail.textContent).toContain('Global Land Surface Remote Sensing')
    expect(detail.textContent).toContain('Brown University')
    expect(detail.textContent).toContain('PI Contact')
    expect(detail.textContent).toContain('pi@brown.edu')
  })

  it('detail view shows editable notes textarea', async () => {
    const user = userEvent.setup()
    render(<KanbanBoard initialApplications={SEED_APPS} />)

    await user.click(screen.getByTestId('card-app-brown'))

    const notesField = screen.getByTestId('detail-notes')
    expect(notesField).toBeDefined()
    expect((notesField as HTMLTextAreaElement).value).toBe('Applied via website')
  })

  it('detail view shows next action fields', async () => {
    const user = userEvent.setup()
    render(<KanbanBoard initialApplications={SEED_APPS} />)

    await user.click(screen.getByTestId('card-app-brown'))

    expect(screen.getByTestId('detail-next-action')).toBeDefined()
    expect(screen.getByTestId('detail-next-date')).toBeDefined()
  })

  it('detail view shows why-it-fits description', async () => {
    const user = userEvent.setup()
    render(<KanbanBoard initialApplications={SEED_APPS} />)

    await user.click(screen.getByTestId('card-app-brown'))
    expect(screen.getByText(/remote sensing, Landsat/)).toBeDefined()
  })

  it('status can be changed from detail view', async () => {
    log('Step 1', 'Opening detail and changing status')
    const user = userEvent.setup()
    render(<KanbanBoard initialApplications={SEED_APPS} />)

    await user.click(screen.getByTestId('card-app-brown'))
    await user.click(screen.getByTestId('detail-status-phone_screen'))

    log('Step 2', 'Closing detail and verifying column change')
    // Close detail
    await user.click(screen.getByLabelText('Close'))

    const phoneScreenCol = screen.getByTestId('column-phone_screen')
    expect(within(phoneScreenCol).getByTestId('card-app-brown')).toBeDefined()
  })
})

// ─── View Toggle ────────────────────────────────────────────────────────────

describe('View toggle', () => {
  it('list view toggle renders cards as rows', async () => {
    log('Step 1', 'Toggling to list view')
    const user = userEvent.setup()
    render(<KanbanBoard initialApplications={SEED_APPS} />)

    await user.click(screen.getByTestId('view-toggle'))

    log('Step 2', 'Verifying list view rendered')
    expect(screen.getByTestId('list-view')).toBeDefined()
    expect(screen.queryByTestId('board-view')).toBeNull()
  })

  it('list view shows all applications', async () => {
    const user = userEvent.setup()
    render(<KanbanBoard initialApplications={SEED_APPS} />)

    await user.click(screen.getByTestId('view-toggle'))

    // All 5 cards should be visible in list
    expect(screen.getByTestId('card-app-brown')).toBeDefined()
    expect(screen.getByTestId('card-app-woodwell')).toBeDefined()
    expect(screen.getByTestId('card-app-bu-sif')).toBeDefined()
    expect(screen.getByTestId('card-app-ibss')).toBeDefined()
    expect(screen.getByTestId('card-app-rejected')).toBeDefined()
  })

  it('list view tap-to-move works', async () => {
    const user = userEvent.setup()
    render(<KanbanBoard initialApplications={SEED_APPS} />)

    await user.click(screen.getByTestId('view-toggle'))

    // Click move button on a card in list view
    const moveBtn = screen.getByTestId('card-app-bu-sif-move-button')
    await user.click(moveBtn)

    const appliedOption = screen.getByTestId('status-applied')
    await user.click(appliedOption)

    // Toggle back to board view to verify column change
    await user.click(screen.getByTestId('view-toggle'))
    const appliedCol = screen.getByTestId('column-applied')
    expect(within(appliedCol).getByTestId('card-app-bu-sif')).toBeDefined()
  })
})

// ─── Mobile Default ─────────────────────────────────────────────────────────

describe('Mobile default', () => {
  it('defaults to list view on mobile', () => {
    log('Step 1', 'Rendering board with mobile viewport mock')
    mockIsMobile = true
    render(<KanbanBoard initialApplications={SEED_APPS} />)

    log('Step 2', 'Verifying list view is default')
    expect(screen.getByTestId('list-view')).toBeDefined()
    expect(screen.queryByTestId('board-view')).toBeNull()
  })

  it('mobile user can toggle to board view', async () => {
    mockIsMobile = true
    const user = userEvent.setup()
    render(<KanbanBoard initialApplications={SEED_APPS} />)

    expect(screen.getByTestId('list-view')).toBeDefined()

    await user.click(screen.getByTestId('view-toggle'))
    expect(screen.getByTestId('board-view')).toBeDefined()
    expect(screen.queryByTestId('list-view')).toBeNull()
  })

  it('defaults to board view on desktop', () => {
    mockIsMobile = false
    render(<KanbanBoard initialApplications={SEED_APPS} />)
    expect(screen.getByTestId('board-view')).toBeDefined()
  })
})

// ─── Stats ──────────────────────────────────────────────────────────────────

describe('Stats bar', () => {
  it('shows correct application count', () => {
    render(<KanbanBoard initialApplications={SEED_APPS} />)
    expect(screen.getByText('5 applications')).toBeDefined()
  })
})

// ─── Uninterest Flow ───────────────────────────────────────────────────────

describe('Uninterest ("Changed my mind")', () => {
  it('[uninterest] Step 1: "Changed my mind" button visible on Interested cards only', () => {
    render(<KanbanBoard initialApplications={SEED_APPS} />)
    log('Step 1', 'Checking "Changed my mind" button visibility')

    // app-bu-sif is interested — should have the button
    const interestedCard = screen.getByTestId('card-app-bu-sif')
    const uninterestBtn = within(interestedCard).getByTestId('card-app-bu-sif-uninterest')
    expect(uninterestBtn).toBeDefined()
    expect(uninterestBtn.textContent).toBe('Changed my mind')
    log('Step 2', 'Button found on interested card app-bu-sif')

    // app-brown is applied — should NOT have the button
    const appliedCard = screen.getByTestId('card-app-brown')
    expect(within(appliedCard).queryByTestId('card-app-brown-uninterest')).toBeNull()
    log('Step 3', 'Button NOT present on applied card app-brown (correct)')
  })

  it('[uninterest] Step 1: clicking "Changed my mind" opens tag picker dialog', async () => {
    const user = userEvent.setup()
    render(<KanbanBoard initialApplications={SEED_APPS} />)

    const uninterestBtn = screen.getByTestId('card-app-bu-sif-uninterest')
    await user.click(uninterestBtn)
    log('Step 2', 'Clicked "Changed my mind" on app-bu-sif')

    // Tag picker dialog should appear
    const dialog = screen.getByRole('dialog', { name: /removing this job/i })
    expect(dialog).toBeDefined()
    log('Step 3', 'Tag picker dialog appeared')

    // Should show the warm tone message
    expect(screen.getByText(/no worries/i)).toBeDefined()
    log('Step 4', 'Warm tone message visible: "No worries — it happens"')

    // Should show tag pills
    expect(screen.getByText('Wrong field')).toBeDefined()
    expect(screen.getByText('No visa path')).toBeDefined()
    expect(screen.getByText('Skip')).toBeDefined()
    log('Step 5', 'Tag pills and Skip button visible')
  })

  it('[uninterest] Step 1: selecting a tag removes card and calls server action', async () => {
    const { uninterestApplication } = await import('@/app/tracker/actions')
    const user = userEvent.setup()
    render(<KanbanBoard initialApplications={SEED_APPS} />)

    log('Step 2', 'Interested column has app-bu-sif')
    expect(screen.getByTestId('card-app-bu-sif')).toBeDefined()

    // Click "Changed my mind"
    await user.click(screen.getByTestId('card-app-bu-sif-uninterest'))
    log('Step 3', 'Opened tag picker')

    // Click "Wrong field" tag
    await user.click(screen.getByText('Wrong field'))
    log('Step 4', 'Selected "Wrong field" tag')

    // Card should be removed (optimistic)
    expect(screen.queryByTestId('card-app-bu-sif')).toBeNull()
    log('Step 5', 'Card removed from board (optimistic update)')

    // Server action should be called
    expect(uninterestApplication).toHaveBeenCalledWith('app-bu-sif', ['wrong_field'])
    log('Step 6', 'uninterestApplication called with correct args')

    // Application count should decrease
    expect(screen.getByText('4 applications')).toBeDefined()
    log('Step 7', 'Application count decreased to 4')
  })

  it('[uninterest] Step 1: clicking Skip removes card without tags', async () => {
    const { uninterestApplication } = await import('@/app/tracker/actions')
    const user = userEvent.setup()
    render(<KanbanBoard initialApplications={SEED_APPS} />)

    await user.click(screen.getByTestId('card-app-bu-sif-uninterest'))
    log('Step 2', 'Opened tag picker')

    await user.click(screen.getByText('Skip'))
    log('Step 3', 'Clicked Skip')

    expect(screen.queryByTestId('card-app-bu-sif')).toBeNull()
    expect(uninterestApplication).toHaveBeenCalledWith('app-bu-sif', [])
    log('Step 4', 'Card removed, action called with empty tags')
  })

  it('[uninterest] Step 1: clicking backdrop dismisses dialog without removing card', async () => {
    const user = userEvent.setup()
    render(<KanbanBoard initialApplications={SEED_APPS} />)

    await user.click(screen.getByTestId('card-app-bu-sif-uninterest'))
    log('Step 2', 'Opened tag picker')
    expect(screen.getByRole('dialog')).toBeDefined()

    // Click the backdrop (presentation div)
    const backdrop = screen.getByRole('presentation')
    await user.click(backdrop)
    log('Step 3', 'Clicked backdrop')

    // Dialog should close, card should still be there
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getByTestId('card-app-bu-sif')).toBeDefined()
    log('Step 4', 'Dialog closed, card still in Interested column')
  })
})

// ─── Error Toast + Rollback ──────────────────────────────────────────────

describe('Server action error handling', () => {
  it('rolls back card move and shows toast on failure', async () => {
    const { toast } = await import('sonner')
    const { moveApplication: moveAction } = await import('@/app/tracker/actions')
    vi.mocked(moveAction).mockResolvedValueOnce({ success: false, error: 'DB error' })

    const user = userEvent.setup()
    render(<KanbanBoard initialApplications={SEED_APPS} />)

    log('Step 1', 'Moving card from Interested to Applied (will fail)')
    const moveBtn = screen.getByTestId('card-app-bu-sif-move-button')
    await user.click(moveBtn)
    await user.click(screen.getByTestId('status-applied'))

    log('Step 2', 'Verifying rollback: card returns to Interested')
    const interestedCol = screen.getByTestId('column-interested')
    expect(within(interestedCol).getByTestId('card-app-bu-sif')).toBeDefined()
    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('move'))
  })

  it('rolls back rejection and shows toast on failure', async () => {
    const { toast } = await import('sonner')
    const { captureRejection: rejectAction } = await import('@/app/tracker/actions')
    vi.mocked(rejectAction).mockResolvedValueOnce({ success: false, error: 'DB error' })

    const user = userEvent.setup()
    render(<KanbanBoard initialApplications={SEED_APPS} />)

    log('Step 1', 'Moving card to Rejected (will fail)')
    const moveBtn = screen.getByTestId('card-app-ibss-move-button')
    await user.click(moveBtn)
    await user.click(screen.getByTestId('status-rejected'))
    await user.click(screen.getByTestId('rejection-form_email'))

    log('Step 2', 'Verifying rollback: card returns to Interview')
    const interviewCol = screen.getByTestId('column-interview')
    expect(within(interviewCol).getByTestId('card-app-ibss')).toBeDefined()
    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('rejection'))
  })

  it('restores card on uninterest failure', async () => {
    const { toast } = await import('sonner')
    const { uninterestApplication: uninterestAction } = await import('@/app/tracker/actions')
    vi.mocked(uninterestAction).mockResolvedValueOnce({ success: false, error: 'DB error' })

    const user = userEvent.setup()
    render(<KanbanBoard initialApplications={SEED_APPS} />)

    log('Step 1', 'Removing card via uninterest (will fail)')
    await user.click(screen.getByTestId('card-app-bu-sif-uninterest'))
    await user.click(screen.getByText('Wrong field'))

    log('Step 2', 'Verifying rollback: card reappears')
    expect(screen.getByTestId('card-app-bu-sif')).toBeDefined()
    expect(screen.getByText('5 applications')).toBeDefined()
    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('remove'))
  })
})
