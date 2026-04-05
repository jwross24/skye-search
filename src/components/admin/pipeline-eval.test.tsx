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
  source_metrics: {
    'query:postdoc ocean color remote sensing': {
      discovered: 20, scored: 18, matched: 14, relevant: 5, us_canada: 4,
      precision: 0.278,  // worst — 5/18
      us_canada_rate: 0.8,
    },
    'seed:https://usajobs.gov/search': {
      discovered: 30, scored: 30, matched: 28, relevant: 25, us_canada: 25,
      precision: 0.833,  // best — 25/30
      us_canada_rate: 1.0,
    },
    'rss:ajo': {
      discovered: 10, scored: 8, matched: 6, relevant: 4, us_canada: 3,
      precision: 0.5,    // middle — 4/8
      us_canada_rate: 0.75,
    },
  },
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

  it('renders Source Performance section when source_metrics is non-empty', async () => {
    render(<PipelineEval />)

    // Wait for data to load and check for the collapsible summary
    expect(await screen.findByText('Source Performance')).toBeTruthy()
  })

  it('shows query count in Source Performance summary so users know what the panel contains before opening', async () => {
    render(<PipelineEval />)

    // Summary shows "· 3 queries" (pluralized) next to the label
    expect(await screen.findByText(/· 3 queries/)).toBeTruthy()
  })

  it('Source Performance panel is open by default so worst performers are immediately visible', async () => {
    const { container } = render(<PipelineEval />)
    await screen.findByText('Source Performance')

    const details = container.querySelector('details')
    expect(details).not.toBeNull()
    // hasAttribute check works regardless of jsdom quirks with the boolean `open` attribute
    expect(details!.hasAttribute('open')).toBe(true)
  })

  it('Source Performance table rows are sorted by precision ascending (worst first)', async () => {
    const { container } = render(<PipelineEval />)

    // Wait for data to load
    await screen.findByText('Source Performance')

    // Open the details element
    const details = container.querySelector('details')
    expect(details).not.toBeNull()
    details!.setAttribute('open', '')

    // Re-render to get updated DOM with details open
    const { container: c2 } = render(<PipelineEval />)
    await screen.findAllByText('Source Performance')
    const details2 = c2.querySelector('details')
    details2!.setAttribute('open', '')

    // Check rows are present via the full source detail strings
    const rows = c2.querySelectorAll('tbody tr')
    expect(rows.length).toBe(3)

    // First row should be the worst precision (query:postdoc..., 27.8%)
    const firstRowText = rows[0].textContent ?? ''
    expect(firstRowText).toContain('query:postdoc ocean color remote sensing')

    // Last row should be the best precision (seed:..., 83.3%)
    const lastRowText = rows[2].textContent ?? ''
    expect(lastRowText).toContain('seed:https://usajobs.gov/search')
  })

  it('does not render Source Performance panel when source_metrics is empty', async () => {
    const dataWithEmpty = { ...mockData, source_metrics: {} }
    mockFetchResponse.mockReturnValue(dataWithEmpty)
    vi.mocked(fetch).mockResolvedValue({ ok: true, json: () => Promise.resolve(dataWithEmpty) } as Response)

    render(<PipelineEval />)

    // Wait for data to settle (other elements will render)
    await screen.findByText('Posting Precision')

    // Source Performance should NOT appear
    expect(screen.queryByText('Source Performance')).toBeNull()
  })

  it('shows precision percentages color-coded in the Source Performance table', async () => {
    const { container } = render(<PipelineEval />)
    await screen.findByText('Source Performance')

    // Open the details
    const details = container.querySelector('details')
    details!.setAttribute('open', '')

    // Force a re-render with details open by re-rendering
    const { container: c2 } = render(<PipelineEval />)
    await screen.findAllByText('Source Performance')
    c2.querySelector('details')!.setAttribute('open', '')

    // query row precision 27.8% → should render as red (text-red-400)
    const rows = c2.querySelectorAll('tbody tr')
    const firstPrecisionCell = rows[0].querySelectorAll('td')[3]
    expect(firstPrecisionCell.className).toContain('text-red-400')
  })
})
