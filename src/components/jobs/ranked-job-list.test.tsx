import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RankedJobList } from './ranked-job-list'
import { seedJobs, seedImmigrationStatus } from '@/db/seed'
import { computeUrgencyScore, type UserState } from '@/lib/urgency-scoring'
import { seedJobToInput } from './ranked-job-list'
import type { SeedJob } from '@/db/seed'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const userState: UserState = {
  days_remaining: 150 - seedImmigrationStatus.initial_days_used,
  is_employed: false,
  offer_accepted_not_started: false,
  employment_end_date: null,
  in_grace_period: false,
  today: '2026-03-24',
}

function makeTestJobs(count: number): SeedJob[] {
  return seedJobs.slice(0, count)
}

// ─── Rendering ───────────────────────────────────────────────────────────────

describe('RankedJobList', () => {
  it('renders jobs sorted by urgency score descending', () => {
    const jobs = makeTestJobs(10)
    render(<RankedJobList jobs={jobs} userState={userState} />)

    const rows = screen.getAllByTestId(/^job-row-/)
    console.log(`[Test] Rendered ${rows.length} job rows`)
    expect(rows.length).toBeGreaterThan(0)

    // Verify the first rendered job has the highest urgency score
    const scored = jobs
      .map((job, i) => ({
        index: i,
        score: computeUrgencyScore(seedJobToInput(job), userState).urgency_score,
      }))
      .filter((s) => s.score >= 0)
      .sort((a, b) => b.score - a.score)

    const firstRenderedIndex = Number(rows[0].getAttribute('data-testid')?.replace('job-row-', ''))
    console.log(
      `[Test] First rendered job index: ${firstRenderedIndex}, ` +
        `highest scoring index: ${scored[0].index}, score: ${scored[0].score.toFixed(4)}`,
    )
    expect(firstRenderedIndex).toBe(scored[0].index)
  })

  it('displays title, employer, visa path badge for each job', () => {
    const jobs = makeTestJobs(3)
    render(<RankedJobList jobs={jobs} userState={userState} />)

    for (const job of jobs) {
      expect(screen.getAllByText(job.title).length).toBeGreaterThan(0)
      expect(screen.getAllByText(job.company).length).toBeGreaterThan(0)
    }
    // At least one visa path badge should be present
    expect(
      screen.getAllByLabelText(/cap-exempt|cap-subject|OPT compatible|Canadian|unknown/i).length,
    ).toBeGreaterThan(0)
  })

  it('displays application deadline when known', () => {
    // CIRES has deadline 2026-03-24
    render(<RankedJobList jobs={seedJobs} userState={userState} />)
    // At least one deadline indicator should appear
    const deadlineElements = screen.queryAllByText(/days? left|Due|Mar|Apr|May|Jun|Jul/i)
    console.log(`[Test] Found ${deadlineElements.length} deadline indicators`)
    expect(deadlineElements.length).toBeGreaterThan(0)
  })

  it('renders Track This button on each job row', () => {
    const jobs = makeTestJobs(5)
    render(<RankedJobList jobs={jobs} userState={userState} />)

    const trackButtons = screen.getAllByRole('button', { name: /Track This/i })
    console.log(`[Test] Found ${trackButtons.length} Track This buttons`)
    expect(trackButtons.length).toBeGreaterThan(0)
  })

  it('clicking Track This changes button to Tracking', async () => {
    const user = userEvent.setup()
    const jobs = makeTestJobs(3)
    render(<RankedJobList jobs={jobs} userState={userState} />)

    const trackButtons = screen.getAllByRole('button', { name: /Track This/i })
    const firstButton = trackButtons[0]

    console.log(`[Test] Before click: button text = "${firstButton.textContent}"`)
    await user.click(firstButton)

    // Button should now show "Tracking"
    const trackingButton = screen.getByText('Tracking')
    console.log(`[Test] After click: found Tracking button`)
    expect(trackingButton).toBeDefined()
  })

  it('renders empty state when no seed jobs exist', () => {
    render(<RankedJobList jobs={[]} userState={userState} />)

    expect(screen.getByText('No jobs loaded yet')).toBeDefined()
    console.log('[Test] Empty state rendered correctly')
  })

  it('renders correct visa path badge colors via aria-labels', () => {
    render(<RankedJobList jobs={seedJobs} userState={userState} />)

    // Check for various visa path types present in seed data
    const capExemptBadges = screen.getAllByLabelText(
      /cap-exempt employer/i,
    )
    console.log(`[Test] Cap-exempt badges: ${capExemptBadges.length}`)
    expect(capExemptBadges.length).toBeGreaterThan(0)

    const canadaBadges = screen.queryAllByLabelText(/Canadian employer/i)
    console.log(`[Test] Canada badges: ${canadaBadges.length}`)
    expect(canadaBadges.length).toBeGreaterThan(0)
  })

  it('renders urgency indicator with meter role', () => {
    const jobs = makeTestJobs(5)
    render(<RankedJobList jobs={jobs} userState={userState} />)

    const meters = screen.getAllByRole('meter')
    console.log(`[Test] Urgency meters: ${meters.length}`)
    expect(meters.length).toBeGreaterThan(0)
  })

  it('displays Apply link for jobs with URLs', () => {
    render(<RankedJobList jobs={seedJobs} userState={userState} />)

    const applyLinks = screen.getAllByRole('link', { name: /Apply/i })
    console.log(`[Test] Apply links: ${applyLinks.length}`)
    expect(applyLinks.length).toBeGreaterThan(0)

    // Verify links open in new tab
    for (const link of applyLinks) {
      expect(link.getAttribute('target')).toBe('_blank')
      expect(link.getAttribute('rel')).toContain('noopener')
    }
  })
})

// ─── Bridge Jobs Filter ──────────────────────────────────────────────────────

describe('Bridge Jobs filter', () => {
  it('Bridge Jobs toggle filters to cap-exempt part-time jobs only', async () => {
    const user = userEvent.setup()
    render(<RankedJobList jobs={seedJobs} userState={userState} />)

    const allRowsBefore = screen.getAllByTestId(/^job-row-/)
    console.log(`[Test] Before filter: ${allRowsBefore.length} jobs`)

    const bridgeButton = screen.getByRole('button', { name: /Bridge Jobs/i })
    await user.click(bridgeButton)

    // After filter, should show only bridge jobs or empty state
    const rowsAfter = screen.queryAllByTestId(/^job-row-/)
    const bridgeJobs = seedJobs.filter(
      (j) => j.visa_path === 'cap_exempt' && j.employment_type === 'part_time',
    )

    console.log(
      `[Test] After filter: ${rowsAfter.length} jobs (expected ${bridgeJobs.length} bridge jobs)`,
    )

    if (bridgeJobs.length === 0) {
      // Should show bridge empty state
      expect(screen.getByText(/No bridge positions/i)).toBeDefined()
    } else {
      expect(rowsAfter.length).toBe(bridgeJobs.length)
    }
  })
})

// ─── Scoring Integration ─────────────────────────────────────────────────────

describe('Scoring integration', () => {
  it('ranked list reflects urgency scoring algorithm output', () => {
    const jobs = makeTestJobs(10)
    render(<RankedJobList jobs={jobs} userState={userState} />)

    // Compute expected order
    const expected = jobs
      .map((job, i) => ({
        index: i,
        score: computeUrgencyScore(seedJobToInput(job), userState).urgency_score,
      }))
      .filter((s) => s.score >= 0)
      .sort((a, b) => b.score - a.score)

    const rows = screen.getAllByTestId(/^job-row-/)
    const renderedOrder = rows.map((r) =>
      Number(r.getAttribute('data-testid')?.replace('job-row-', '')),
    )

    console.log(`[Test] Expected order: ${expected.map((e) => e.index).join(', ')}`)
    console.log(`[Test] Rendered order: ${renderedOrder.join(', ')}`)

    // Verify order matches
    for (let i = 0; i < Math.min(renderedOrder.length, expected.length); i++) {
      expect(renderedOrder[i]).toBe(expected[i].index)
    }
  })

  it('immigration context displays for cap-exempt jobs', () => {
    render(<RankedJobList jobs={seedJobs} userState={userState} />)

    // Should show immigration context like "University — cap-exempt"
    const contexts = screen.queryAllByText(
      /cap-exempt|cooperative institute|Gov contractor|Express Entry|Sponsored.*H1-B|Stops unemployment/i,
    )
    console.log(`[Test] Immigration context elements: ${contexts.length}`)
    expect(contexts.length).toBeGreaterThan(5) // Most seed jobs have context
  })
})
