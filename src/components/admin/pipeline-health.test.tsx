import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PipelineHealth } from './pipeline-health'

const mockData = {
  discovery: { status: 'green', lastRun: new Date().toISOString(), completed: 10, failed: 0 },
  scoring: { status: 'green', lastRun: new Date().toISOString(), scored: 5, failed: 0, total: 5 },
  queue: { status: 'green', pending: 0, deadLettered: 0, oldestPendingMinutes: null },
  unemployment: {
    status: 'green',
    lastCheckpoint: { checkpoint_date: '2026-04-05', unemployment_days_used_cumulative: 30 },
    lastCronRun: { execution_date: '2026-04-05', status: 'completed' },
  },
  alerts: { status: 'green', recentCount: 2, lastSent: new Date().toISOString() },
  linkValidation: { status: 'green', active: 42, unvalidated: 5, deadLink: 3, closed: 2, timeout: 1, lastRun: new Date().toISOString() },
}

describe('PipelineHealth', () => {
  it('renders all 6 health cards when data is provided', () => {
    render(<PipelineHealth data={mockData} loading={false} />)

    expect(screen.getByText('Discovery')).toBeInTheDocument()
    expect(screen.getByText('Scoring')).toBeInTheDocument()
    expect(screen.getByText('Queue')).toBeInTheDocument()
    expect(screen.getByText('Unemployment Cron')).toBeInTheDocument()
    expect(screen.getByText('Alerts')).toBeInTheDocument()
    expect(screen.getByText('Link Freshness')).toBeInTheDocument()
  })

  it('renders skeleton cards when loading', () => {
    const { container } = render(<PipelineHealth data={null} loading={true} />)
    // 6 skeleton cards rendered
    const skeletons = container.querySelectorAll('[class*="bg-zinc-900"]')
    expect(skeletons.length).toBe(6)
  })

  it('shows link freshness metric with active and stale counts', () => {
    render(<PipelineHealth data={mockData} loading={false} />)
    expect(screen.getByText('42 active · 5 stale')).toBeInTheDocument()
  })

  it('handles missing linkValidation gracefully', () => {
    const { linkValidation: _, ...dataWithout } = mockData
    render(<PipelineHealth data={dataWithout as typeof mockData} loading={false} />)

    expect(screen.getByText('Discovery')).toBeInTheDocument()
    expect(screen.queryByText('Link Freshness')).not.toBeInTheDocument()
  })

  it('shows "never run" when linkValidation.lastRun is null', () => {
    const data = { ...mockData, linkValidation: { ...mockData.linkValidation, lastRun: null } }
    render(<PipelineHealth data={data} loading={false} />)
    expect(screen.getByText(/unchecked · never run/)).toBeInTheDocument()
  })

  it('shows dead-lettered count in queue detail when present', () => {
    const data = { ...mockData, queue: { ...mockData.queue, deadLettered: 3 } }
    render(<PipelineHealth data={data} loading={false} />)
    expect(screen.getByText('3 dead-lettered')).toBeInTheDocument()
  })

  it('shows scoring failures when present', () => {
    const data = { ...mockData, scoring: { ...mockData.scoring, failed: 2 } }
    render(<PipelineHealth data={data} loading={false} />)
    expect(screen.getByText('2 failed')).toBeInTheDocument()
  })
})
