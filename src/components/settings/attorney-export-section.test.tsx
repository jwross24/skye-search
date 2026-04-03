import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.stubGlobal('fetch', vi.fn(() =>
  Promise.resolve({
    ok: true,
    headers: new Headers({ 'Content-Disposition': 'attachment; filename="attorney-export-2026-04-03.json"' }),
    blob: () => Promise.resolve(new Blob(['{}'], { type: 'application/json' })),
  }),
))

// Mock URL.createObjectURL and document.createElement('a')
vi.stubGlobal('URL', {
  createObjectURL: vi.fn(() => 'blob:mock'),
  revokeObjectURL: vi.fn(),
})

import { AttorneyExportSection } from './attorney-export-section'

describe('AttorneyExportSection', () => {
  it('renders the export button', () => {
    render(<AttorneyExportSection />)
    expect(screen.getByRole('button', { name: /export for attorney/i })).toBeTruthy()
  })

  it('shows description with USCIS compliance mention', () => {
    render(<AttorneyExportSection />)
    expect(screen.getByText(/USCIS compliance/)).toBeTruthy()
    expect(screen.getByText(/source/)).toBeTruthy()
  })

  it('triggers download on click', async () => {
    const user = userEvent.setup()
    render(<AttorneyExportSection />)

    await user.click(screen.getByRole('button', { name: /export for attorney/i }))

    expect(fetch).toHaveBeenCalledWith('/api/attorney-export')
    expect(await screen.findByText(/Downloaded!/)).toBeTruthy()
  })

  it('shows error on failure', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: 'Export failed' }),
    } as Response)

    const user = userEvent.setup()
    render(<AttorneyExportSection />)

    await user.click(screen.getByRole('button', { name: /export for attorney/i }))

    expect(await screen.findByText(/Export failed/)).toBeTruthy()
  })
})
