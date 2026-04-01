import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { UndoToast } from './undo-toast'

describe('UndoToast', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders correct message for interested vote', () => {
    render(
      <UndoToast decision="interested" onUndo={vi.fn()} onExpire={vi.fn()} />,
    )
    expect(screen.getByText('Added to your tracker')).toBeTruthy()
    expect(screen.getByText('Undo')).toBeTruthy()
  })

  it('renders correct message for not_for_me vote', () => {
    render(
      <UndoToast decision="not_for_me" onUndo={vi.fn()} onExpire={vi.fn()} />,
    )
    expect(screen.getByText('Dismissed')).toBeTruthy()
  })

  it('renders correct message for save_for_later vote', () => {
    render(
      <UndoToast decision="save_for_later" onUndo={vi.fn()} onExpire={vi.fn()} />,
    )
    expect(screen.getByText('Saved for later')).toBeTruthy()
  })

  it('calls onUndo when Undo is clicked', async () => {
    vi.useRealTimers() // need real timers for userEvent
    const onUndo = vi.fn()
    const user = userEvent.setup()
    render(
      <UndoToast decision="interested" onUndo={onUndo} onExpire={vi.fn()} />,
    )

    await user.click(screen.getByText('Undo'))
    expect(onUndo).toHaveBeenCalledOnce()
  })

  it('calls onExpire after duration elapses', () => {
    const onExpire = vi.fn()
    render(
      <UndoToast decision="interested" onUndo={vi.fn()} onExpire={onExpire} duration={4000} />,
    )

    expect(onExpire).not.toHaveBeenCalled()
    vi.advanceTimersByTime(4100)
    expect(onExpire).toHaveBeenCalledOnce()
  })

  it('does not call onExpire before duration', () => {
    const onExpire = vi.fn()
    render(
      <UndoToast decision="interested" onUndo={vi.fn()} onExpire={onExpire} duration={4000} />,
    )

    vi.advanceTimersByTime(3000)
    expect(onExpire).not.toHaveBeenCalled()
  })
})
