import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DailyBatch } from './daily-batch'
import { seedJobs, seedImmigrationStatus } from '@/db/seed'
import type { UserState } from '@/lib/urgency-scoring'

const userState: UserState = {
  days_remaining: 150 - seedImmigrationStatus.initial_days_used,
  is_employed: false,
  offer_accepted_not_started: false,
  employment_end_date: null,
  in_grace_period: false,
  today: '2026-03-24',
}

describe('DailyBatch', () => {
  it('renders exactly 8 job cards in default batch', () => {
    render(<DailyBatch jobs={seedJobs} userState={userState} />)
    const cards = screen.getAllByTestId(/^pick-card-\d+$/)
    console.log(`[Test] Rendered ${cards.length} pick cards`)
    expect(cards.length).toBe(8)
  })

  it('each card shows title, company, visa path badge', () => {
    render(<DailyBatch jobs={seedJobs} userState={userState} />)
    const badges = screen.getAllByLabelText(/cap-exempt|cap-subject|OPT compatible|Canadian|unknown/i)
    console.log(`[Test] Visa badges found: ${badges.length}`)
    expect(badges.length).toBeGreaterThanOrEqual(8)
  })

  it('shows Interested, Not for me, and Save buttons on each card', () => {
    render(<DailyBatch jobs={seedJobs} userState={userState} />)
    const interested = screen.getAllByRole('button', { name: /Interested/i })
    const notForMe = screen.getAllByRole('button', { name: /Not for me/i })
    const save = screen.getAllByRole('button', { name: /Save/i })

    console.log(`[Test] Buttons: ${interested.length} Interested, ${notForMe.length} Not for me, ${save.length} Save`)
    expect(interested.length).toBe(8)
    expect(notForMe.length).toBe(8)
    expect(save.length).toBe(8)
  })

  it('Interested button marks job and shows confirmation', async () => {
    const user = userEvent.setup()
    render(<DailyBatch jobs={seedJobs} userState={userState} />)

    const interestedButtons = screen.getAllByRole('button', { name: /Interested/i })
    console.log(`[Test] Before vote: ${interestedButtons.length} Interested buttons`)

    await user.click(interestedButtons[0])

    const confirmation = screen.getByText('Added to your tracker')
    console.log(`[Test] After vote: found "${confirmation.textContent}"`)
    expect(confirmation).toBeDefined()
  })

  it('Not for me shows tag picker', async () => {
    const user = userEvent.setup()
    render(<DailyBatch jobs={seedJobs} userState={userState} />)

    const notForMeButtons = screen.getAllByRole('button', { name: /Not for me/i })
    await user.click(notForMeButtons[0])

    // Tag picker should appear
    const wrongField = screen.getByText('Wrong field')
    const wrongLocation = screen.getByText('Wrong location')
    console.log(`[Test] Tag picker visible with: Wrong field, Wrong location`)
    expect(wrongField).toBeDefined()
    expect(wrongLocation).toBeDefined()
  })

  it('selecting a tag dismisses the card', async () => {
    const user = userEvent.setup()
    render(<DailyBatch jobs={seedJobs} userState={userState} />)

    const notForMeButtons = screen.getAllByRole('button', { name: /Not for me/i })
    await user.click(notForMeButtons[0])

    const wrongField = screen.getByText('Wrong field')
    await user.click(wrongField)

    // Card should be dismissed
    const noted = screen.getByText(/Got it/)
    console.log(`[Test] After tag select: "${noted.textContent}"`)
    expect(noted).toBeDefined()
  })

  it('Save for later shows confirmation', async () => {
    const user = userEvent.setup()
    render(<DailyBatch jobs={seedJobs} userState={userState} />)

    const saveButtons = screen.getAllByRole('button', { name: /Save/i })
    await user.click(saveButtons[0])

    const saved = screen.getByText('Saved for later')
    console.log(`[Test] After save: "${saved.textContent}"`)
    expect(saved).toBeDefined()
  })

  it('shows "That\'s enough for today" button', () => {
    render(<DailyBatch jobs={seedJobs} userState={userState} />)
    const exitButton = screen.getByRole('button', { name: /enough for today/i })
    expect(exitButton).toBeDefined()
  })

  it('clicking "enough for today" shows exit message with Keep going option', async () => {
    const user = userEvent.setup()
    render(<DailyBatch jobs={seedJobs} userState={userState} />)

    const exitButton = screen.getByRole('button', { name: /enough for today/i })
    await user.click(exitButton)

    expect(screen.getByText(/Taking a break/i)).toBeDefined()
    expect(screen.getByText(/picks still waiting/i)).toBeDefined()
    const keepGoing = screen.getByRole('button', { name: /Keep going/i })
    console.log(`[Test] Exit state: "Taking a break" with Keep going button`)
    expect(keepGoing).toBeDefined()
  })

  it('shows progress count with tabular nums', () => {
    render(<DailyBatch jobs={seedJobs} userState={userState} />)
    const progress = screen.getByText(/0 of 8 reviewed/i)
    console.log(`[Test] Progress: "${progress.textContent}"`)
    expect(progress).toBeDefined()
  })

  it('renders empty state when no jobs', () => {
    render(<DailyBatch jobs={[]} userState={userState} />)
    expect(screen.getByText('No picks today')).toBeDefined()
  })

  it('expanded view shows why_fits and skills', async () => {
    const user = userEvent.setup()
    render(<DailyBatch jobs={seedJobs} userState={userState} />)

    // Click the card body to expand (find the first card's expand button)
    const cards = screen.getAllByTestId(/^pick-card-\d+$/)
    const firstCardButton = cards[0].querySelector('button[type="button"]')
    if (firstCardButton) {
      await user.click(firstCardButton)
    }

    // Should show skills tags
    const skillTags = screen.queryAllByText(/Python|Remote Sensing|Machine Learning/i)
    console.log(`[Test] Expanded view skill tags: ${skillTags.length}`)
    expect(skillTags.length).toBeGreaterThan(0)
  })
})

describe('Daily batch scoring integration', () => {
  it('batch uses top 8 jobs by urgency score', () => {
    render(<DailyBatch jobs={seedJobs} userState={userState} />)
    // Should have exactly 8 cards, not 34
    const cards = screen.getAllByTestId(/^pick-card-\d+$/)
    expect(cards.length).toBe(8)
  })

  it('progress updates as cards are voted on', async () => {
    const user = userEvent.setup()
    render(<DailyBatch jobs={seedJobs} userState={userState} />)

    expect(screen.getByText(/0 of 8 reviewed/i)).toBeDefined()

    // Vote on first card
    const interestedButtons = screen.getAllByRole('button', { name: /Interested/i })
    await user.click(interestedButtons[0])

    expect(screen.getByText(/1 of 8 reviewed/i)).toBeDefined()
    console.log(`[Test] Progress updated: 0 → 1 of 8`)
  })
})
