import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import OfflinePage from './page'

function log(step: string, detail: string) {
  process.stdout.write(`  [offline-page] Step ${step}: ${detail}\n`)
}

describe('Offline page', () => {
  it('shows offline message with warm tone', () => {
    log('1', 'Rendering offline page')
    render(<OfflinePage />)

    log('2', 'Checking content')
    expect(screen.getByText("You're offline right now")).toBeInTheDocument()
    expect(screen.getByText(/check your connection/)).toBeInTheDocument()
    expect(screen.getByText('Try again')).toBeInTheDocument()
  })

  it('Try again button calls window.location.reload', async () => {
    const reloadMock = vi.fn()
    Object.defineProperty(window, 'location', {
      value: { reload: reloadMock },
      configurable: true,
      writable: true,
    })

    log('1', 'Rendering offline page')
    render(<OfflinePage />)

    log('2', 'Clicking Try again')
    await userEvent.click(screen.getByText('Try again'))

    log('3', 'Verifying reload was called')
    expect(reloadMock).toHaveBeenCalledOnce()
  })
})
