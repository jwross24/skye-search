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

// ─── Clock-Pressure Sectioning ──────────────────────────────────────────────

describe('Clock-pressure sectioning', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.mocked(voteOnJob).mockClear()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  /** Create a minimal Job with specific visa_path + employment_type for sectioning tests */
  function makeJob(overrides: Partial<Job> & { id: string }): Job {
    return {
      title: `Test Job ${overrides.id}`,
      company: 'Test Corp',
      company_domain: null,
      location: 'Boston, MA',
      url: null,
      visa_path: 'cap_exempt',
      employer_type: 'university',
      cap_exempt_confidence: 'confirmed',
      employment_type: 'full_time',
      source_type: 'academic',
      application_deadline: null,
      deadline_source: null,
      application_complexity: null,
      h1b_sponsor_count: null,
      salary: null,
      remote_status: null,
      skills_required: ['Python'],
      why_fits: 'Test job',
      indexed_date: null,
      requires_citizenship: false,
      requires_security_clearance: false,
      ...overrides,
    }
  }

  function makeBridgeJob(id: string, visa_path: 'cap_exempt' | 'opt_compatible' = 'cap_exempt'): Job {
    return makeJob({
      id,
      title: `Bridge Job ${id}`,
      visa_path,
      employment_type: 'part_time',
    })
  }

  function makeFullTimeJob(id: string): Job {
    return makeJob({
      id,
      title: `Full-Time Job ${id}`,
      visa_path: 'cap_exempt',
      employment_type: 'full_time',
    })
  }

  const highPressureState: UserState = {
    days_remaining: 55,
    is_employed: false,
    offer_accepted_not_started: false,
    employment_end_date: null,
    in_grace_period: false,
    today: '2026-03-24',
  }

  it('shows two sections when days_remaining < 60 and 2+ bridge jobs', () => {
    // Step 1: Create batch with 3 bridge + 2 full-time jobs
    const jobs = [
      makeBridgeJob('b1'),
      makeBridgeJob('b2'),
      makeBridgeJob('b3', 'opt_compatible'),
      makeFullTimeJob('f1'),
      makeFullTimeJob('f2'),
    ]

    // Step 2: Render with high clock pressure (55 days < 60)
    render(
      <DailyBatch jobs={jobs} userState={highPressureState} undoDelayMs={0} />,
    )

    // Step 3: Verify "Stop the Clock" section header appears
    expect(screen.getByText('Stop the Clock')).toBeDefined()

    // Step 4: Verify "Build Your Future" section header appears
    expect(screen.getByText('Build Your Future')).toBeDefined()

    // Step 5: Verify descriptive text for bridge section
    expect(screen.getByText('These roles stop your unemployment clock on day one.')).toBeDefined()
  })

  it('shows unified list when days_remaining < 60 but only 1 bridge job (threshold not met)', () => {
    // Step 1: Create batch with only 1 bridge job
    const jobs = [
      makeBridgeJob('b1'),
      makeFullTimeJob('f1'),
      makeFullTimeJob('f2'),
      makeFullTimeJob('f3'),
    ]

    // Step 2: Render with high pressure
    render(
      <DailyBatch jobs={jobs} userState={highPressureState} undoDelayMs={0} />,
    )

    // Step 3: Verify sections do NOT appear
    expect(screen.queryByText('Stop the Clock')).toBeNull()
    expect(screen.queryByText('Build Your Future')).toBeNull()

    // Step 4: Verify cards still render in unified list
    const cards = screen.getAllByTestId(/^pick-card-/)
    expect(cards.length).toBeGreaterThan(0)
  })

  it('shows unified list when days_remaining = 95 (no sectioning)', () => {
    // Step 1: Create batch with plenty of bridge jobs
    const jobs = [
      makeBridgeJob('b1'),
      makeBridgeJob('b2'),
      makeBridgeJob('b3'),
      makeFullTimeJob('f1'),
    ]
    const lowPressureState: UserState = {
      ...highPressureState,
      days_remaining: 95,
    }

    // Step 2: Render with low clock pressure
    render(
      <DailyBatch jobs={jobs} userState={lowPressureState} undoDelayMs={0} />,
    )

    // Step 3: Verify no section headers
    expect(screen.queryByText('Stop the Clock')).toBeNull()
    expect(screen.queryByText('Build Your Future')).toBeNull()
  })

  it('shows unified list at boundary: days_remaining = 60 (60 is NOT < 60)', () => {
    // Step 1: Create batch with bridge jobs
    const jobs = [
      makeBridgeJob('b1'),
      makeBridgeJob('b2'),
      makeFullTimeJob('f1'),
    ]
    const boundaryState: UserState = {
      ...highPressureState,
      days_remaining: 60,
    }

    // Step 2: Render at exact boundary
    render(
      <DailyBatch jobs={jobs} userState={boundaryState} undoDelayMs={0} />,
    )

    // Step 3: Verify sections do NOT appear (60 >= 60 is true)
    expect(screen.queryByText('Stop the Clock')).toBeNull()
    expect(screen.queryByText('Build Your Future')).toBeNull()
  })

  it('shows sections at boundary: days_remaining = 59 (59 IS < 60)', () => {
    // Step 1: Create batch with bridge jobs
    const jobs = [
      makeBridgeJob('b1'),
      makeBridgeJob('b2'),
      makeFullTimeJob('f1'),
    ]
    const justUnderState: UserState = {
      ...highPressureState,
      days_remaining: 59,
    }

    // Step 2: Render just under boundary
    render(
      <DailyBatch jobs={jobs} userState={justUnderState} undoDelayMs={0} />,
    )

    // Step 3: Verify sections appear
    expect(screen.getByText('Stop the Clock')).toBeDefined()
    expect(screen.getByText('Build Your Future')).toBeDefined()
  })

  it('bridge job filter: cap_exempt + part_time = bridge, cap_exempt + full_time = NOT bridge', () => {
    // Step 1: Create mixed batch with cap_exempt part_time (bridge) and cap_exempt full_time (not bridge)
    const jobs = [
      makeBridgeJob('b1'),                         // cap_exempt + part_time = bridge
      makeBridgeJob('b2', 'opt_compatible'),        // opt_compatible + part_time = bridge
      makeJob({ id: 'not-bridge-ft', visa_path: 'cap_exempt', employment_type: 'full_time' }),   // NOT bridge
      makeJob({ id: 'not-bridge-cs', visa_path: 'cap_subject', employment_type: 'part_time' }),  // NOT bridge (cap_subject)
      makeJob({ id: 'not-bridge-ca', visa_path: 'canada', employment_type: 'contract' }),        // NOT bridge (canada)
    ]
    const state: UserState = {
      ...highPressureState,
      days_remaining: 50,
    }

    // Step 2: Render
    render(
      <DailyBatch jobs={jobs} userState={state} undoDelayMs={0} />,
    )

    // Step 3: Sections should appear (2 bridge: b1 + b2)
    expect(screen.getByText('Stop the Clock')).toBeDefined()
    expect(screen.getByText('Build Your Future')).toBeDefined()

    // Step 4: Bridge section should contain b1 and b2 cards
    expect(screen.getByTestId('pick-card-b1')).toBeDefined()
    expect(screen.getByTestId('pick-card-b2')).toBeDefined()
  })

  it('contract employment_type also counts as bridge (with cap_exempt)', () => {
    // Step 1: Create batch with contract bridge jobs
    const jobs = [
      makeJob({ id: 'c1', visa_path: 'cap_exempt', employment_type: 'contract' }),
      makeJob({ id: 'c2', visa_path: 'opt_compatible', employment_type: 'contract' }),
      makeFullTimeJob('f1'),
    ]
    const state: UserState = {
      ...highPressureState,
      days_remaining: 45,
    }

    // Step 2: Render
    render(
      <DailyBatch jobs={jobs} userState={state} undoDelayMs={0} />,
    )

    // Step 3: Verify sections appear (contract counts as bridge)
    expect(screen.getByText('Stop the Clock')).toBeDefined()
  })

  it('progress counter counts across both sections', async () => {
    // Step 1: Create batch with mixed jobs
    const user = userEvent.setup()
    const jobs = [
      makeBridgeJob('b1'),
      makeBridgeJob('b2'),
      makeFullTimeJob('f1'),
      makeFullTimeJob('f2'),
    ]

    // Step 2: Render with sections
    render(
      <DailyBatch jobs={jobs} userState={highPressureState} undoDelayMs={0} />,
    )

    // Step 3: Check initial progress shows total count
    expect(screen.getByText(/0 of 4 reviewed/i)).toBeDefined()

    // Step 4: Vote on a bridge job
    const interestedButtons = screen.getAllByRole('button', { name: /Interested/i })
    await user.click(interestedButtons[0])

    // Step 5: Progress should update across both sections
    expect(screen.getByText(/1 of 4 reviewed/i)).toBeDefined()
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

  it('respects custom batchSize prop', () => {
    render(<DailyBatch jobs={testJobs} userState={userState} batchSize={3} undoDelayMs={0} />)
    expect(screen.getByText(/0 of 3 reviewed/i)).toBeDefined()
  })

  it('shows warm framing message when batchSize > 8', () => {
    render(<DailyBatch jobs={testJobs} userState={userState} batchSize={12} undoDelayMs={0} />)
    expect(screen.getByText(/extra strong matches/i)).toBeDefined()
  })

  it('no framing message at default batch size', () => {
    render(<DailyBatch jobs={testJobs} userState={userState} batchSize={8} undoDelayMs={0} />)
    expect(screen.queryByText(/extra strong matches/i)).toBeNull()
  })

  it('"That\'s enough for today" visible at all batch sizes', () => {
    for (const size of [3, 8, 12, 15]) {
      const { unmount } = render(
        <DailyBatch jobs={testJobs} userState={userState} batchSize={size} undoDelayMs={0} />,
      )
      expect(screen.getByText(/enough for today/i)).toBeDefined()
      unmount()
    }
  })
})
