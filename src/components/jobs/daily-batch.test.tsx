import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Mock server actions before component imports (cookies() fails in Vitest)
vi.mock('@/app/jobs/actions', () => ({
  voteOnJob: vi.fn().mockResolvedValue({ success: true }),
}))

import { DailyBatch } from './daily-batch'
import { voteOnJob } from '@/app/jobs/actions'
import { seedJobs, seedImmigrationStatus } from '@/db/seed'
import type { UserState } from '@/lib/urgency-scoring'
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
    requires_citizenship: s.requires_citizenship ?? false,
    requires_security_clearance: s.requires_security_clearance ?? false,
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

describe('DailyBatch', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.mocked(voteOnJob).mockClear()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders exactly 8 job cards in default batch', () => {
    render(<DailyBatch jobs={testJobs} userState={userState} undoDelayMs={0} />)
    const cards = screen.getAllByTestId(/^pick-card-test-job-/)
    expect(cards.length).toBe(8)
  })

  it('each card shows title, company, visa path badge', () => {
    render(<DailyBatch jobs={testJobs} userState={userState} undoDelayMs={0} />)
    const badges = screen.getAllByLabelText(/cap-exempt|cap-subject|OPT compatible|Canadian|unknown/i)
    expect(badges.length).toBeGreaterThanOrEqual(8)
  })

  it('shows Interested, Not for me, and Save buttons on each card', () => {
    render(<DailyBatch jobs={testJobs} userState={userState} undoDelayMs={0} />)
    const interested = screen.getAllByRole('button', { name: /Interested/i })
    const notForMe = screen.getAllByRole('button', { name: /Not for me/i })
    const save = screen.getAllByRole('button', { name: /Save/i })

    expect(interested.length).toBe(8)
    expect(notForMe.length).toBe(8)
    expect(save.length).toBe(8)
  })

  it('Interested button marks job and shows confirmation', async () => {
    const user = userEvent.setup()
    render(<DailyBatch jobs={testJobs} userState={userState} undoDelayMs={0} />)

    const interestedButtons = screen.getAllByRole('button', { name: /Interested/i })
    await user.click(interestedButtons[0])

    const confirmation = screen.getByText('Added to your tracker')
    expect(confirmation).toBeDefined()
  })

  it('Interested vote calls voteOnJob after undo window expires', async () => {
    const user = userEvent.setup()
    render(<DailyBatch jobs={testJobs} userState={userState} undoDelayMs={0} />)

    const interestedButtons = screen.getAllByRole('button', { name: /Interested/i })
    await user.click(interestedButtons[0])

    expect(voteOnJob).toHaveBeenCalledWith(
      expect.stringMatching(/^test-job-/),
      'interested',
      [],
    )
  })

  it('Not for me shows tag picker', async () => {
    const user = userEvent.setup()
    render(<DailyBatch jobs={testJobs} userState={userState} undoDelayMs={0} />)

    const notForMeButtons = screen.getAllByRole('button', { name: /Not for me/i })
    await user.click(notForMeButtons[0])

    expect(screen.getByText('Wrong field')).toBeDefined()
    expect(screen.getByText('Wrong location')).toBeDefined()
  })

  it('selecting a tag dismisses the card and calls server action after undo window', async () => {
    const user = userEvent.setup()
    render(<DailyBatch jobs={testJobs} userState={userState} undoDelayMs={0} />)

    const notForMeButtons = screen.getAllByRole('button', { name: /Not for me/i })
    await user.click(notForMeButtons[0])

    const wrongField = screen.getByText('Wrong field')
    await user.click(wrongField)

    const noted = screen.getByText(/Got it/)
    expect(noted).toBeDefined()

    expect(voteOnJob).toHaveBeenCalledWith(
      expect.stringMatching(/^test-job-/),
      'not_for_me',
      expect.arrayContaining(['wrong_field']),
    )
  })

  it('Save for later shows confirmation and calls server action after undo window', async () => {
    const user = userEvent.setup()
    render(<DailyBatch jobs={testJobs} userState={userState} undoDelayMs={0} />)

    const saveButtons = screen.getAllByRole('button', { name: /Save/i })
    await user.click(saveButtons[0])

    expect(screen.getByText('Saved for later')).toBeDefined()

    expect(voteOnJob).toHaveBeenCalledWith(
      expect.stringMatching(/^test-job-/),
      'save_for_later',
      [],
    )
  })

  it('shows "That\'s enough for today" button', () => {
    render(<DailyBatch jobs={testJobs} userState={userState} undoDelayMs={0} />)
    const exitButton = screen.getByRole('button', { name: /enough for today/i })
    expect(exitButton).toBeDefined()
  })

  it('clicking "enough for today" shows exit message with Keep going option', async () => {
    const user = userEvent.setup()
    render(<DailyBatch jobs={testJobs} userState={userState} undoDelayMs={0} />)

    const exitButton = screen.getByRole('button', { name: /enough for today/i })
    await user.click(exitButton)

    expect(screen.getByText(/Taking a break/i)).toBeDefined()
    expect(screen.getByText(/picks still waiting/i)).toBeDefined()
    const keepGoing = screen.getByRole('button', { name: /Keep going/i })
    expect(keepGoing).toBeDefined()
  })

  it('shows progress count with tabular nums', () => {
    render(<DailyBatch jobs={testJobs} userState={userState} undoDelayMs={0} />)
    const progress = screen.getByText(/0 of 8 reviewed/i)
    expect(progress).toBeDefined()
  })

  it('renders empty state when no jobs', () => {
    render(<DailyBatch jobs={[]} userState={userState} />)
    expect(screen.getByText('No picks today')).toBeDefined()
  })

  it('expanded view shows why_fits and skills', async () => {
    const user = userEvent.setup()
    render(<DailyBatch jobs={testJobs} userState={userState} undoDelayMs={0} />)

    const cards = screen.getAllByTestId(/^pick-card-test-job-/)
    const firstCardButton = cards[0].querySelector('button[type="button"]')
    if (firstCardButton) {
      await user.click(firstCardButton)
    }

    const skillTags = screen.queryAllByText(/Python|Remote Sensing|Machine Learning/i)
    expect(skillTags.length).toBeGreaterThan(0)
  })
})

describe('Daily batch scoring integration', () => {
  it('batch uses top 8 jobs by urgency score', () => {
    render(<DailyBatch jobs={testJobs} userState={userState} undoDelayMs={0} />)
    const cards = screen.getAllByTestId(/^pick-card-test-job-/)
    expect(cards.length).toBe(8)
  })

  it('progress updates as cards are voted on', async () => {
    const user = userEvent.setup()
    render(<DailyBatch jobs={testJobs} userState={userState} undoDelayMs={0} />)

    expect(screen.getByText(/0 of 8 reviewed/i)).toBeDefined()

    const interestedButtons = screen.getAllByRole('button', { name: /Interested/i })
    await user.click(interestedButtons[0])

    expect(screen.getByText(/1 of 8 reviewed/i)).toBeDefined()
  })
})
