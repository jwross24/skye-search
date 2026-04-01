/**
 * Unit tests for DataExportSection component.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DataExportSection } from './data-export-section'

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('DataExportSection', () => {
  it('[data-export] Step 1: renders download button and description', () => {
    render(<DataExportSection />)
    console.log('[data-export] Step 2: Checking button and text')

    expect(screen.getByRole('button', { name: /download everything/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /your data/i })).toBeInTheDocument()
    expect(screen.getByText(/it's your data, always/i)).toBeInTheDocument()
  })

  it('[data-export] Step 1: clicking button shows loading state', async () => {
    const user = userEvent.setup()

    // Never-resolving fetch to capture loading state
    let resolveFetch!: (value: Response) => void
    vi.spyOn(globalThis, 'fetch').mockReturnValue(
      new Promise(resolve => { resolveFetch = resolve })
    )

    render(<DataExportSection />)
    const button = screen.getByRole('button', { name: /download everything/i })
    await user.click(button)
    console.log('[data-export] Step 2: Checking loading state')

    expect(screen.getByText(/preparing your archive/i)).toBeInTheDocument()
    expect(button).toBeDisabled()

    // Clean up
    resolveFetch(new Response(new Blob(['fake']), {
      headers: { 'Content-Type': 'application/zip' },
    }))
  })

  it('[data-export] Step 1: shows error message on failure', async () => {
    const user = userEvent.setup()
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: 'Not authenticated' }), { status: 401 })
    )

    render(<DataExportSection />)
    await user.click(screen.getByRole('button', { name: /download everything/i }))
    console.log('[data-export] Step 2: Checking error state')

    expect(await screen.findByText(/not authenticated/i)).toBeInTheDocument()
  })

  it('[data-export] Step 1: shows success state after download', async () => {
    const user = userEvent.setup()
    const mockBlob = new Blob(['fake-zip'], { type: 'application/zip' })
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(mockBlob, {
        headers: {
          'Content-Disposition': 'attachment; filename="skye-search-export-2026-04-01.zip"',
          'Content-Type': 'application/zip',
        },
      })
    )

    render(<DataExportSection />)
    await user.click(screen.getByRole('button', { name: /download everything/i }))
    console.log('[data-export] Step 2: Checking success state')

    expect(await screen.findByText(/downloaded!/i)).toBeInTheDocument()
  })
})
