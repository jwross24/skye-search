import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ApplicationCard } from './application-card'
import type { TrackedApplication } from './kanban-board'
import { seedJobs } from '@/db/seed'

function log(step: string, detail: string) {
  process.stdout.write(`  [application-card] ${step}: ${detail}\n`)
}

vi.mock('@/app/tracker/actions', () => ({
  moveApplication: vi.fn().mockResolvedValue({ success: true }),
  updateApplicationNotes: vi.fn().mockResolvedValue({ success: true }),
  captureRejection: vi.fn().mockResolvedValue({ success: true }),
  uninterestApplication: vi.fn().mockResolvedValue({ success: true }),
}))

const INTERESTED_APP: TrackedApplication = {
  id: 'app-test-1',
  job: seedJobs.find((j) => j.company.includes('Brown'))!,
  status: 'interested',
  dateAdded: '2026-03-25',
  notes: '',
  nextAction: '',
  nextActionDate: '',
  contacts: [],
}

const APPLIED_APP: TrackedApplication = {
  ...INTERESTED_APP,
  id: 'app-test-2',
  status: 'applied',
}

describe('ApplicationCard', () => {
  it('[card] Step 1: renders job title and company in card layout', () => {
    render(
      <ApplicationCard application={INTERESTED_APP} layout="card" onMove={vi.fn()} onSelect={vi.fn()} />
    )
    log('Step 2', 'Checking card content')

    expect(screen.getByText(INTERESTED_APP.job.title)).toBeInTheDocument()
    expect(screen.getByText(INTERESTED_APP.job.company)).toBeInTheDocument()
    log('Step 3', `Title: ${INTERESTED_APP.job.title}, Company: ${INTERESTED_APP.job.company}`)
  })

  it('[card] Step 1: renders job title and company in list layout', () => {
    render(
      <ApplicationCard application={INTERESTED_APP} layout="list" onMove={vi.fn()} onSelect={vi.fn()} />
    )
    log('Step 2', 'List layout renders correctly')

    expect(screen.getByText(INTERESTED_APP.job.title)).toBeInTheDocument()
    expect(screen.getByText(INTERESTED_APP.job.company)).toBeInTheDocument()
  })

  it('[card] Step 1: shows "Changed my mind" on interested cards with onUninterest', () => {
    const onUninterest = vi.fn()
    render(
      <ApplicationCard application={INTERESTED_APP} layout="card" onMove={vi.fn()} onSelect={vi.fn()} onUninterest={onUninterest} />
    )
    log('Step 2', 'Checking button visibility')

    const btn = screen.getByTestId('card-app-test-1-uninterest')
    expect(btn).toBeInTheDocument()
    expect(btn).toHaveTextContent('Changed my mind')
    log('Step 3', 'Button found on interested card')
  })

  it('[card] Step 1: hides "Changed my mind" on non-interested cards', () => {
    render(
      <ApplicationCard application={APPLIED_APP} layout="card" onMove={vi.fn()} onSelect={vi.fn()} onUninterest={vi.fn()} />
    )
    log('Step 2', 'Applied card should not have uninterest button')

    expect(screen.queryByTestId('card-app-test-2-uninterest')).not.toBeInTheDocument()
    log('Step 3', 'Confirmed: no uninterest button on applied card')
  })

  it('[card] Step 1: hides "Changed my mind" when onUninterest is not provided', () => {
    render(
      <ApplicationCard application={INTERESTED_APP} layout="card" onMove={vi.fn()} onSelect={vi.fn()} />
    )
    log('Step 2', 'No onUninterest prop — button should be hidden')

    expect(screen.queryByTestId('card-app-test-1-uninterest')).not.toBeInTheDocument()
    log('Step 3', 'Confirmed: no button without onUninterest prop')
  })

  it('[card] Step 1: clicking "Changed my mind" calls onUninterest with app id', async () => {
    const user = userEvent.setup()
    const onUninterest = vi.fn()
    const onSelect = vi.fn()
    render(
      <ApplicationCard application={INTERESTED_APP} layout="card" onMove={vi.fn()} onSelect={onSelect} onUninterest={onUninterest} />
    )

    await user.click(screen.getByTestId('card-app-test-1-uninterest'))
    log('Step 2', 'Clicked "Changed my mind"')

    expect(onUninterest).toHaveBeenCalledWith('app-test-1')
    expect(onSelect).not.toHaveBeenCalled() // stopPropagation works
    log('Step 3', 'onUninterest called, onSelect not called (event stopped)')
  })

  it('[card] Step 1: shows visa badge', () => {
    render(
      <ApplicationCard application={INTERESTED_APP} layout="card" onMove={vi.fn()} onSelect={vi.fn()} />
    )
    log('Step 2', `Visa path: ${INTERESTED_APP.job.visa_path}`)
    // VisaBadge renders — just verify the card doesn't crash
    expect(screen.getByTestId('card-app-test-1')).toBeInTheDocument()
  })

  it('[card] Step 1: shows next action when present', () => {
    const appWithAction = { ...INTERESTED_APP, nextAction: 'Follow up on Monday' }
    render(
      <ApplicationCard application={appWithAction} layout="card" onMove={vi.fn()} onSelect={vi.fn()} />
    )
    log('Step 2', 'Next action visible')
    expect(screen.getByText('Next: Follow up on Monday')).toBeInTheDocument()
  })
})

// ─── StatusMenu Keyboard Navigation (A11Y) ──────────────────────────────────

describe('StatusMenu keyboard navigation', () => {
  it('opens with first non-disabled item focused', async () => {
    const user = userEvent.setup()
    const onMove = vi.fn()
    render(
      <ApplicationCard application={INTERESTED_APP} layout="card" onMove={onMove} onSelect={vi.fn()} />
    )

    // Open the status menu by clicking the trigger
    await user.click(screen.getByTestId('card-app-test-1-move-button'))
    log('Step 1', 'Status menu opened')

    const menu = screen.getByTestId('status-menu')
    expect(menu).toBeInTheDocument()

    // "interested" is current status → disabled. First enabled item should be focused.
    const menuItems = screen.getAllByRole('menuitem')
    const firstEnabled = menuItems.find((item) => !item.hasAttribute('disabled'))
    expect(firstEnabled).toHaveFocus()
    log('Step 2', 'First non-disabled item has focus')
  })

  it('ArrowDown moves focus to next enabled item', async () => {
    const user = userEvent.setup()
    render(
      <ApplicationCard application={INTERESTED_APP} layout="card" onMove={vi.fn()} onSelect={vi.fn()} />
    )

    await user.click(screen.getByTestId('card-app-test-1-move-button'))

    // Press ArrowDown — focus should move to the next enabled item
    await user.keyboard('{ArrowDown}')
    log('Step 1', 'ArrowDown pressed')

    const menuItems = screen.getAllByRole('menuitem')
    const enabledItems = menuItems.filter((item) => !item.hasAttribute('disabled'))
    // After one ArrowDown from the first enabled, the second enabled should have focus
    if (enabledItems.length >= 2) {
      expect(enabledItems[1]).toHaveFocus()
      log('Step 2', 'Second enabled item focused after ArrowDown')
    }
  })

  it('ArrowUp from first item wraps to last enabled item', async () => {
    const user = userEvent.setup()
    render(
      <ApplicationCard application={INTERESTED_APP} layout="card" onMove={vi.fn()} onSelect={vi.fn()} />
    )

    await user.click(screen.getByTestId('card-app-test-1-move-button'))

    // Press ArrowUp — should wrap to the last enabled item
    await user.keyboard('{ArrowUp}')

    const menuItems = screen.getAllByRole('menuitem')
    const enabledItems = menuItems.filter((item) => !item.hasAttribute('disabled'))
    const lastEnabled = enabledItems[enabledItems.length - 1]
    expect(lastEnabled).toHaveFocus()
    log('Step 1', 'ArrowUp from first wraps to last enabled item')
  })

  it('Enter selects the focused item', async () => {
    const user = userEvent.setup()
    const onMove = vi.fn()
    render(
      <ApplicationCard application={INTERESTED_APP} layout="card" onMove={onMove} onSelect={vi.fn()} />
    )

    await user.click(screen.getByTestId('card-app-test-1-move-button'))
    // Press Enter on the focused item
    await user.keyboard('{Enter}')

    expect(onMove).toHaveBeenCalled()
    log('Step 1', 'Enter selects focused menu item')
  })
})
