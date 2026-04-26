import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { AiHealth } from './ai-health'

const mockFetch = vi.fn()

beforeEach(() => {
  vi.stubGlobal('fetch', mockFetch)
  mockFetch.mockReset()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('AiHealth', () => {
  it('renders skeleton in loading state', () => {
    // Never-resolving fetch keeps the component in loading.
    mockFetch.mockReturnValue(new Promise(() => {}))

    const { container } = render(<AiHealth />)

    // Skeleton primitive renders divs with the data-slot="skeleton" attribute
    // (see src/components/ui/skeleton.tsx). At least one must exist.
    const skeletons = container.querySelectorAll('[data-slot="skeleton"]')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('shows AI: ok with latency after successful probe', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          ok: true,
          latency_ms: 142,
          checked_at: '2026-04-26T12:34:56.000Z',
        }),
    })

    render(<AiHealth />)

    await waitFor(() => {
      expect(screen.getByText('AI: ok')).toBeInTheDocument()
    })
    expect(screen.getByText(/142ms/)).toBeInTheDocument()
  })

  it('shows AI: invalid key when probe returns invalid_key', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          ok: false,
          error: 'invalid_key',
          latency_ms: 87,
          checked_at: '2026-04-26T12:34:56.000Z',
        }),
    })

    render(<AiHealth />)

    await waitFor(() => {
      expect(screen.getByText('AI: invalid key')).toBeInTheDocument()
    })
  })

  it('shows AI: rate-limited when probe returns rate_limited', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          ok: false,
          error: 'rate_limited',
          latency_ms: 50,
          checked_at: '2026-04-26T12:34:56.000Z',
        }),
    })

    render(<AiHealth />)

    await waitFor(() => {
      expect(screen.getByText('AI: rate-limited')).toBeInTheDocument()
    })
  })

  it('shows AI: unreachable when probe returns network', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          ok: false,
          error: 'network',
          latency_ms: 5000,
          checked_at: '2026-04-26T12:34:56.000Z',
        }),
    })

    render(<AiHealth />)

    await waitFor(() => {
      expect(screen.getByText('AI: unreachable')).toBeInTheDocument()
    })
  })

  it('shows AI: probe failed when fetch itself rejects', async () => {
    mockFetch.mockRejectedValueOnce(new Error('network down'))

    render(<AiHealth />)

    await waitFor(() => {
      expect(screen.getByText('AI: probe failed')).toBeInTheDocument()
    })
  })
})
