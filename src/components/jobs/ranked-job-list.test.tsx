import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RankedJobList } from './ranked-job-list'
import { seedJobs, seedImmigrationStatus } from '@/db/seed'
import { computeUrgencyScore, jobToInput, type UserState } from '@/lib/urgency-scoring'
import type { Job } from '@/types/job'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function seedToJobs(seeds: typeof seedJobs): Job[] {
  return seeds.map((s, i) => ({
    id: `test-job-${i}`,
    title: s.title,
    company: s.company,
    company_domain: s.company_domain,
    location: s.location,
    url: s.url,
    visa_path: s.visa_path,
    employer_type: s.employer_type,
    cap_exempt_confidence: s.cap_exempt_confidence,
    employment_type: s.employment_type,
    source_type: s.source_type,
    application_deadline: s.application_deadline,
    deadline_source: s.deadline_source,
    application_complexity: s.application_complexity,
    h1b_sponsor_count: s.h1b_sponsor_count,
    salary: s.salary,
    remote_status: s.remote_status,
    skills_required: s.skills_required,
    why_fits: s.why_fits,
    indexed_date: null,
    requires_citizenship: false,
    requires_security_clearance: false,
  }))
}

const testJobs = seedToJobs(seedJobs)

const userState: UserState = {
  days_remaining: 150 - seedImmigrationStatus.initial_days_used,
  is_employed: false,
  offer_accepted_not_started: false,
  employment_end_date: null,
  in_grace_period: false,
  today: '2026-03-24',
}

function makeTestJobs(count: number): Job[] {
  return testJobs.slice(0, count)
}

// ─── Rendering ───────────────────────────────────────────────────────────────

describe('RankedJobList', () => {
  it('renders jobs sorted by urgency score descending', () => {
    const jobs = makeTestJobs(10)
    render(<RankedJobList jobs={jobs} userState={userState} />)

    const rows = screen.getAllByTestId(/^job-row-/)
    expect(rows.length).toBeGreaterThan(0)

    // Compute expected order and verify the highest-scored job appears first
    const scored = jobs
      .map((job) => ({
        title: job.title,
        score: computeUrgencyScore(jobToInput(job, userState.today), userState).urgency_score,
      }))
      .filter((s) => s.score >= 0)
      .sort((a, b) => b.score - a.score)

    // The first rendered row should contain the highest-scored job's title
    expect(rows[0].textContent).toContain(scored[0].title)
  })

  it('displays title, employer, visa path badge for each job', () => {
    const jobs = makeTestJobs(3)
    render(<RankedJobList jobs={jobs} userState={userState} />)

    for (const job of jobs) {
      expect(screen.getAllByText(job.title).length).toBeGreaterThan(0)
      expect(screen.getAllByText(job.company).length).toBeGreaterThan(0)
    }
    expect(
      screen.getAllByLabelText(/cap-exempt|cap-subject|OPT compatible|Canadian|unknown/i).length,
    ).toBeGreaterThan(0)
  })

  it('displays application deadline when known', () => {
    render(<RankedJobList jobs={testJobs} userState={userState} />)
    const deadlineElements = screen.queryAllByText(/days? left|Due|Mar|Apr|May|Jun|Jul/i)
    expect(deadlineElements.length).toBeGreaterThan(0)
  })

  it('renders Track This button on each job row', () => {
    const jobs = makeTestJobs(5)
    render(<RankedJobList jobs={jobs} userState={userState} />)

    const trackButtons = screen.getAllByRole('button', { name: /Track This/i })
    expect(trackButtons.length).toBeGreaterThan(0)
  })

  it('clicking Track This changes button to Tracking', async () => {
    const user = userEvent.setup()
    const jobs = makeTestJobs(3)
    render(<RankedJobList jobs={jobs} userState={userState} />)

    const trackButtons = screen.getAllByRole('button', { name: /Track This/i })
    await user.click(trackButtons[0])

    const trackingButton = screen.getByText('Tracking')
    expect(trackingButton).toBeDefined()
  })

  it('renders empty state when no jobs exist', () => {
    render(<RankedJobList jobs={[]} userState={userState} />)
    expect(screen.getByText('No jobs loaded yet')).toBeDefined()
  })

  it('renders correct visa path badge colors via aria-labels', () => {
    render(<RankedJobList jobs={testJobs} userState={userState} />)

    const capExemptBadges = screen.getAllByLabelText(/cap-exempt/i)
    expect(capExemptBadges.length).toBeGreaterThan(0)

    const canadaBadges = screen.queryAllByLabelText(/Canadian employer/i)
    expect(canadaBadges.length).toBeGreaterThan(0)
  })

  it('renders urgency indicator with meter role', () => {
    const jobs = makeTestJobs(5)
    render(<RankedJobList jobs={jobs} userState={userState} />)

    const meters = screen.getAllByRole('meter')
    expect(meters.length).toBeGreaterThan(0)
  })

  it('displays Apply link for jobs with URLs', () => {
    render(<RankedJobList jobs={testJobs} userState={userState} />)

    const applyLinks = screen.getAllByRole('link', { name: /Apply/i })
    expect(applyLinks.length).toBeGreaterThan(0)

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
    render(<RankedJobList jobs={testJobs} userState={userState} />)

    const allRowsBefore = screen.getAllByTestId(/^job-row-/)

    const bridgeButton = screen.getByRole('button', { name: /Bridge Jobs/i })
    await user.click(bridgeButton)

    const rowsAfter = screen.queryAllByTestId(/^job-row-/)
    const bridgeJobs = testJobs.filter(
      (j) => j.visa_path === 'cap_exempt' && j.employment_type === 'part_time',
    )

    if (bridgeJobs.length === 0) {
      expect(screen.getByText(/No bridge positions/i)).toBeDefined()
    } else {
      expect(rowsAfter.length).toBe(bridgeJobs.length)
    }

    // Sanity: there were more jobs before filtering
    expect(allRowsBefore.length).toBeGreaterThan(rowsAfter.length)
  })
})

// ─── Scoring Integration ─────────────────────────────────────────────────────

describe('Scoring integration', () => {
  it('ranked list reflects urgency scoring algorithm output', () => {
    const jobs = makeTestJobs(10)
    render(<RankedJobList jobs={jobs} userState={userState} />)

    // Compute expected order by title
    const expected = jobs
      .map((job) => ({
        title: job.title,
        score: computeUrgencyScore(jobToInput(job, userState.today), userState).urgency_score,
      }))
      .filter((s) => s.score >= 0)
      .sort((a, b) => b.score - a.score)

    const rows = screen.getAllByTestId(/^job-row-/)

    // Verify first few rendered jobs match expected order by title
    for (let i = 0; i < Math.min(3, rows.length, expected.length); i++) {
      expect(rows[i].textContent).toContain(expected[i].title)
    }
  })

  it('immigration context displays for cap-exempt jobs', () => {
    render(<RankedJobList jobs={testJobs} userState={userState} />)

    const contexts = screen.queryAllByText(
      /cap-exempt|cooperative institute|Gov contractor|Express Entry|Sponsored.*H1-B|Stops unemployment/i,
    )
    expect(contexts.length).toBeGreaterThan(5)
  })
})
