import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { KanbanBoard, type TrackedApplication } from './kanban-board'
import { seedJobs } from '@/db/seed'

function log(step: string, detail: string) {
  process.stdout.write(`  [kanban test] ${step}: ${detail}\n`)
}

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
  it('renders 4 columns: Interested, Applied, Interview, Offer', () => {
    log('Step 1', 'Rendering board with seed data')
    render(<KanbanBoard initialApplications={SEED_APPS} />)

    expect(screen.getByTestId('column-interested')).toBeDefined()
    expect(screen.getByTestId('column-applied')).toBeDefined()
    expect(screen.getByTestId('column-interview')).toBeDefined()
    expect(screen.getByTestId('column-offer')).toBeDefined()
    log('Step 2', 'All 4 columns rendered')
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

// ─── Card Content ───────────────────────────────────────────────────────────

describe('Application card', () => {
  it('card displays job title, employer, visa path badge, date added', () => {
    log('Step 1', 'Checking card content')
    render(<KanbanBoard initialApplications={SEED_APPS} />)

    const card = screen.getByTestId('card-app-brown')
    expect(card.textContent).toContain('Global Land Surface Remote Sensing')
    expect(card.textContent).toContain('Brown University')
    expect(card.textContent).toContain('Cap-exempt')
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

  it('move to Rejected works from any column', async () => {
    const user = userEvent.setup()
    render(<KanbanBoard initialApplications={SEED_APPS} />)

    const moveBtn = screen.getByTestId('card-app-ibss-move-button')
    await user.click(moveBtn)

    const rejectedOption = screen.getByTestId('status-rejected')
    await user.click(rejectedOption)

    const rejectedCol = screen.getByTestId('column-rejected')
    expect(within(rejectedCol).getByTestId('card-app-ibss')).toBeDefined()
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
    await user.click(screen.getByTestId('detail-status-interview'))

    log('Step 2', 'Closing detail and verifying column change')
    // Close detail
    await user.click(screen.getByLabelText('Close'))

    const interviewCol = screen.getByTestId('column-interview')
    expect(within(interviewCol).getByTestId('card-app-brown')).toBeDefined()
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

// ─── Stats ──────────────────────────────────────────────────────────────────

describe('Stats bar', () => {
  it('shows correct application count', () => {
    render(<KanbanBoard initialApplications={SEED_APPS} />)
    expect(screen.getByText('5 applications')).toBeDefined()
  })
})
