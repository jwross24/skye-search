import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

// Mock fetch for API call
const mockFetchResponse = vi.fn()
vi.stubGlobal('fetch', vi.fn(() =>
  Promise.resolve({ ok: true, json: () => Promise.resolve(mockFetchResponse()) }),
))

import { PipelineEval } from './pipeline-eval'

const mockData = {
  period: '30d',
  computed_at: '2026-04-03T00:00:00Z',
  metrics: {
    posting_precision: { value: 0.92, target: 0.95, met: false, detail: { total_discovered: 100, scored: 80, real_jobs: 74 } },
    us_canada_rate: { value: 0.97, target: 0.95, met: true, detail: { total_with_location: 74, us_canada: 72 } },
    visa_known_rate: { value: 0.85, target: 0.80, met: true, detail: { total_jobs: 74, visa_known: 63 } },
    interested_rate: { value: 0.35, target: 0.30, met: true, detail: { applications: 7, votes: 13 } },
    duplicate_rate: { value: 0.03, target: 0.05, met: true, detail: { total_jobs: 74, duplicates: 2 } },
  },
  source_breakdown: { query: 50, seed: 25, rss: 5 },
}

beforeEach(() => {
  vi.clearAllMocks()
  mockFetchResponse.mockReturnValue(mockData)
  // Default fetch mock returns ok=true
  vi.mocked(fetch).mockResolvedValue({ ok: true, json: () => Promise.resolve(mockFetchResponse()) } as Response)
})

describe('PipelineEval', () => {
  it('renders all 5 metric labels', async () => {
    render(<PipelineEval />)

    expect(await screen.findByText('Posting Precision')).toBeTruthy()
    expect(screen.getByText('US/Canada Rate')).toBeTruthy()
    expect(screen.getByText('Visa Path Known')).toBeTruthy()
    expect(screen.getByText('Interested Rate')).toBeTruthy()
    expect(screen.getByText('Duplicate Rate')).toBeTruthy()
  })

  it('shows targets met count', async () => {
    render(<PipelineEval />)

    expect(await screen.findByText('4/5 targets met')).toBeTruthy()
  })

  it('displays source breakdown badges', async () => {
    render(<PipelineEval />)

    expect(await screen.findByText('query: 50')).toBeTruthy()
    expect(screen.getByText('seed: 25')).toBeTruthy()
    expect(screen.getByText('rss: 5')).toBeTruthy()
  })

  it('shows error message when fetch fails', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: false, status: 401 } as Response)
    render(<PipelineEval />)

    expect(await screen.findByText(/Couldn't load eval data/)).toBeTruthy()
  })
})
