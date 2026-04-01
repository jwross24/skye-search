import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BreakModeSection } from './break-mode-section'

function log(step: string, detail: string) {
  process.stdout.write(`  [break-mode] ${step}: ${detail}\n`)
}

vi.mock('@/app/settings/actions', () => ({
  activateBreakMode: vi.fn().mockResolvedValue({ success: true, breakModeUntil: '2026-04-04T00:00:00Z' }),
  deactivateBreakMode: vi.fn().mockResolvedValue({ success: true }),
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('BreakModeSection — idle (not on break)', () => {
  it('[break] Step 1: renders "Take a break" button when not on break', () => {
    render(<BreakModeSection breakModeUntil={null} daysRemaining={119} />)
    log('Step 2', 'Checking idle state')

    expect(screen.getByRole('heading', { name: /take a break/i })).toBeInTheDocument()
    expect(screen.getByTestId('break-mode-toggle')).toBeInTheDocument()
    expect(screen.getByText(/pause daily picks/i)).toBeInTheDocument()
    log('Step 3', 'Toggle button and description visible')
  })

  it('[break] Step 1: clicking toggle shows duration picker', async () => {
    const user = userEvent.setup()
    render(<BreakModeSection breakModeUntil={null} daysRemaining={119} />)

    await user.click(screen.getByTestId('break-mode-toggle'))
    log('Step 2', 'Duration picker opened')

    expect(screen.getByText('How long?')).toBeInTheDocument()
    expect(screen.getByTestId('break-1d')).toBeInTheDocument()
    expect(screen.getByTestId('break-3d')).toBeInTheDocument()
    expect(screen.getByTestId('break-7d')).toBeInTheDocument()
    expect(screen.getByTestId('confirm-break')).toBeInTheDocument()
    log('Step 3', 'All duration options and confirm button visible')
  })

  it('[break] Step 1: selecting duration and confirming calls activateBreakMode', async () => {
    const { activateBreakMode } = await import('@/app/settings/actions')
    const user = userEvent.setup()
    render(<BreakModeSection breakModeUntil={null} daysRemaining={119} />)

    await user.click(screen.getByTestId('break-mode-toggle'))
    await user.click(screen.getByTestId('break-5d'))
    log('Step 2', 'Selected 5 days')

    await user.click(screen.getByTestId('confirm-break'))
    log('Step 3', 'Clicked Start break')

    expect(activateBreakMode).toHaveBeenCalledWith(5)
    log('Step 4', 'activateBreakMode called with 5')
  })

  it('[break] Step 1: "Never mind" closes the duration picker', async () => {
    const user = userEvent.setup()
    render(<BreakModeSection breakModeUntil={null} daysRemaining={119} />)

    await user.click(screen.getByTestId('break-mode-toggle'))
    expect(screen.getByText('How long?')).toBeInTheDocument()

    await user.click(screen.getByText('Never mind'))
    log('Step 2', 'Clicked Never mind')

    expect(screen.queryByText('How long?')).not.toBeInTheDocument()
    expect(screen.getByTestId('break-mode-toggle')).toBeInTheDocument()
    log('Step 3', 'Back to idle state')
  })
})

describe('BreakModeSection — safety thresholds', () => {
  it('[break] Step 1: shows warning at <30 days remaining', async () => {
    const user = userEvent.setup()
    render(<BreakModeSection breakModeUntil={null} daysRemaining={25} />)

    await user.click(screen.getByTestId('break-mode-toggle'))
    log('Step 2', 'Opened duration picker with 25 days remaining')

    expect(screen.getByText(/25 days/)).toBeInTheDocument()
    expect(screen.getByText(/clock keeps running/i)).toBeInTheDocument()
    // All 5 duration options should still be available
    expect(screen.getByTestId('break-7d')).toBeInTheDocument()
    log('Step 3', 'Warning shown, all durations available')
  })

  it('[break] Step 1: limits to 2 days at <15 days remaining', async () => {
    const user = userEvent.setup()
    render(<BreakModeSection breakModeUntil={null} daysRemaining={12} />)

    await user.click(screen.getByTestId('break-mode-toggle'))
    log('Step 2', 'Opened duration picker with 12 days remaining')

    expect(screen.getByText(/12 days/)).toBeInTheDocument()
    expect(screen.getByTestId('break-1d')).toBeInTheDocument()
    expect(screen.getByTestId('break-2d')).toBeInTheDocument()
    // 3, 5, 7 should NOT be available
    expect(screen.queryByTestId('break-3d')).not.toBeInTheDocument()
    expect(screen.queryByTestId('break-5d')).not.toBeInTheDocument()
    expect(screen.queryByTestId('break-7d')).not.toBeInTheDocument()
    log('Step 3', 'Only 1-2 day options available (max 2 at <15 days)')
  })

  it('[break] Step 1: no warning when >30 days remaining', async () => {
    const user = userEvent.setup()
    render(<BreakModeSection breakModeUntil={null} daysRemaining={119} />)

    await user.click(screen.getByTestId('break-mode-toggle'))
    log('Step 2', 'Opened duration picker with 119 days remaining')

    expect(screen.queryByText(/days.*remaining/i)).not.toBeInTheDocument()
    log('Step 3', 'No warning shown (correct)')
  })
})

describe('BreakModeSection — on break', () => {
  const futureBreak = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()

  it('[break] Step 1: shows break status when on break', () => {
    render(<BreakModeSection breakModeUntil={futureBreak} daysRemaining={119} />)
    log('Step 2', 'Checking on-break state')

    expect(screen.getByRole('heading', { name: /taking a break/i })).toBeInTheDocument()
    expect(screen.getByText(/break runs until/i)).toBeInTheDocument()
    expect(screen.getByText(/critical immigration updates/i)).toBeInTheDocument()
    expect(screen.getByText(/ready to come back/i)).toBeInTheDocument()
    log('Step 3', 'Break status, end date, and resume button visible')
  })

  it('[break] Step 1: clicking resume calls deactivateBreakMode', async () => {
    const { deactivateBreakMode } = await import('@/app/settings/actions')
    const user = userEvent.setup()
    render(<BreakModeSection breakModeUntil={futureBreak} daysRemaining={119} />)

    await user.click(screen.getByText(/ready to come back/i))
    log('Step 2', 'Clicked "I\'m ready to come back"')

    expect(deactivateBreakMode).toHaveBeenCalled()
    log('Step 3', 'deactivateBreakMode called')
  })

  it('[break] Step 1: shows idle state when break has expired', () => {
    const pastBreak = '2020-01-01T00:00:00Z'
    render(<BreakModeSection breakModeUntil={pastBreak} daysRemaining={119} />)
    log('Step 2', 'Break expired — should show idle state')

    expect(screen.getByRole('heading', { name: /take a break/i })).toBeInTheDocument()
    expect(screen.getByTestId('break-mode-toggle')).toBeInTheDocument()
    log('Step 3', 'Correctly showing idle state (break expired)')
  })
})
