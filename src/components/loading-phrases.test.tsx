import { describe, it, expect, vi } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { LoadingPhrases } from './loading-phrases'

describe('LoadingPhrases', () => {
  it('renders a calming domain-specific phrase', () => {
    render(<LoadingPhrases />)
    expect(
      screen.getByText('Finding companies that sponsor STEM OPT...'),
    ).toBeDefined()
  })

  it('cycles to next phrase after interval', () => {
    vi.useFakeTimers()
    render(<LoadingPhrases />)

    act(() => {
      vi.advanceTimersByTime(3000)
    })

    expect(screen.getByText('Checking your timeline...')).toBeDefined()
    vi.useRealTimers()
  })

  it('does not show generic spinner text', () => {
    render(<LoadingPhrases />)
    expect(screen.queryByText('Loading...')).toBeNull()
  })
})
