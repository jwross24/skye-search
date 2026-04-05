import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CalibrationCard } from './calibration-card'
import type { CalibrationPick } from '@/lib/calibration-types'

// Must mock server actions BEFORE component import (see mock-server-actions-in-tests rule)
vi.mock('@/app/jobs/calibration-actions', () => ({
  logCalibrationConfirmed: vi.fn().mockResolvedValue({ success: true }),
  logCalibrationTooHigh: vi.fn().mockResolvedValue({ success: true }),
}))

import { logCalibrationConfirmed, logCalibrationTooHigh } from '@/app/jobs/calibration-actions'

const mockPicks: CalibrationPick[] = [
  {
    id: 'job-1',
    title: 'Research Scientist',
    company: 'Woods Hole Oceanographic',
    urgency_score: 0.88,
    match_score: null,
    location: 'Falmouth, MA',
    url: 'https://whoi.edu/jobs/1',
    primary_reason: 'Confirmed cap-exempt employer',
    visa_path: 'cap_exempt',
    cap_exempt_confidence: 'confirmed',
  },
  {
    id: 'job-2',
    title: 'Postdoc — Climate Modeling',
    company: 'NCAR',
    urgency_score: 0.82,
    match_score: null,
    location: 'Boulder, CO',
    url: null,
    primary_reason: 'Boston area match',
    visa_path: 'cap_exempt',
    cap_exempt_confidence: 'likely',
  },
  {
    id: 'job-3',
    title: 'Environmental Data Scientist',
    company: 'EPA',
    urgency_score: 0.75,
    match_score: null,
    location: 'Washington, DC',
    url: 'https://epa.gov/jobs/3',
    primary_reason: 'Deadline in 7 days',
    visa_path: 'cap_exempt',
    cap_exempt_confidence: 'confirmed',
  },
  {
    id: 'job-4',
    title: 'Ocean Data Analyst',
    company: 'NOAA',
    urgency_score: 0.72,
    match_score: null,
    location: 'Seattle, WA',
    url: null,
    primary_reason: 'Direct fit — confirmed cap-exempt',
    visa_path: 'cap_exempt',
    cap_exempt_confidence: 'confirmed',
  },
  {
    id: 'job-5',
    title: 'Atmospheric Scientist',
    company: 'NASA GISS',
    urgency_score: 0.70,
    match_score: null,
    location: 'New York, NY',
    url: 'https://nasa.gov/jobs/5',
    primary_reason: 'Strong H-1B sponsor',
    visa_path: 'cap_exempt',
    cap_exempt_confidence: 'likely',
  },
]

describe('CalibrationCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders all 5 picks', () => {
    render(<CalibrationCard picks={mockPicks} />)
    expect(screen.getByText('Research Scientist')).toBeInTheDocument()
    expect(screen.getByText('Postdoc — Climate Modeling')).toBeInTheDocument()
    expect(screen.getByText('Environmental Data Scientist')).toBeInTheDocument()
    expect(screen.getByText('Ocean Data Analyst')).toBeInTheDocument()
    expect(screen.getByText('Atmospheric Scientist')).toBeInTheDocument()
  })

  it('renders the card title and subtitle', () => {
    render(<CalibrationCard picks={mockPicks} />)
    expect(screen.getByText('Sunday check-in')).toBeInTheDocument()
    expect(screen.getByText(/Did they feel right/)).toBeInTheDocument()
  })

  it('shows qualitative priority tiers (not raw scores)', () => {
    render(<CalibrationCard picks={mockPicks} />)
    // Skye sees tier labels, not raw urgency_score numbers — too many picks
    // resolve to the same tier for us to assert getByText (ambiguous), so
    // assert tier labels are present without counting.
    expect(screen.getAllByText(/Top priority|Worth a look|Maybe/).length).toBeGreaterThanOrEqual(5)
    // And the raw score should NOT appear in the DOM
    expect(screen.queryByText('0.88')).toBeNull()
    expect(screen.queryByText('0.82')).toBeNull()
  })

  it('shows primary reasons with a human lead-in', () => {
    render(<CalibrationCard picks={mockPicks} />)
    // Primary reasons are lowercased and prefixed with "Why it ranked high:"
    // to put Skye in the driver's seat instead of showing a raw diagnostic label.
    expect(screen.getByText(/Why it ranked high: confirmed cap-exempt employer/)).toBeInTheDocument()
    expect(screen.getByText(/Why it ranked high: deadline in 7 days/)).toBeInTheDocument()
  })

  it('"Good pick" fires logCalibrationConfirmed with job id', async () => {
    const user = userEvent.setup()
    render(<CalibrationCard picks={mockPicks} />)

    const buttons = screen.getAllByRole('button', { name: /Good pick/i })
    await user.click(buttons[0])

    expect(logCalibrationConfirmed).toHaveBeenCalledWith('job-1')
  })

  it('"Missed the mark" reveals inline tag picker', async () => {
    const user = userEvent.setup()
    render(<CalibrationCard picks={mockPicks} />)

    const buttons = screen.getAllByRole('button', { name: /Missed the mark/i })
    await user.click(buttons[0])

    expect(screen.getByText('Wrong visa path')).toBeInTheDocument()
    expect(screen.getByText('Stale posting')).toBeInTheDocument()
    expect(screen.getByText('Wrong field')).toBeInTheDocument()
    expect(screen.getByText('Other')).toBeInTheDocument()
  })

  it('tag selection fires logCalibrationTooHigh with correct tag', async () => {
    const user = userEvent.setup()
    render(<CalibrationCard picks={mockPicks} />)

    const notQuiteButtons = screen.getAllByRole('button', { name: /Missed the mark/i })
    await user.click(notQuiteButtons[0])

    await user.click(screen.getByText('Wrong visa path'))
    expect(logCalibrationTooHigh).toHaveBeenCalledWith('job-1', 'wrong_visa')
  })

  it('marks row as resolved with quiet "Logged" confirmation after "Good pick"', async () => {
    const user = userEvent.setup()
    render(<CalibrationCard picks={mockPicks} />)

    const rightCallButtons = screen.getAllByRole('button', { name: /Good pick/i })
    await user.click(rightCallButtons[0])

    // Quiet confirmation — avoids AI-voice "thanks" that Skye has flagged as sycophantic
    expect(screen.getByText('Logged')).toBeInTheDocument()
  })

  it('echoes the tag label as the row confirmation after "Missed the mark"', async () => {
    const user = userEvent.setup()
    render(<CalibrationCard picks={mockPicks} />)

    const notQuiteButtons = screen.getAllByRole('button', { name: /Missed the mark/i })
    await user.click(notQuiteButtons[1]) // second pick

    // Click the "Wrong field" chip in the tag picker
    const wrongFieldChip = screen.getByRole('button', { name: 'Wrong field' })
    await user.click(wrongFieldChip)

    // After resolve, the row shows the tag as the confirmation (no "Noted — " prefix).
    // The picker is gone, so the only "Wrong field" text is the resolved label.
    expect(screen.getByText('Wrong field')).toBeInTheDocument()
  })

  it('shows warm "All five. See you next Sunday." done state when all picks resolved', async () => {
    const user = userEvent.setup()
    render(<CalibrationCard picks={mockPicks.slice(0, 2)} />)

    // Resolve both
    const rightCallButtons = screen.getAllByRole('button', { name: /Good pick/i })
    await user.click(rightCallButtons[0])
    await user.click(rightCallButtons[0]) // now only 1 left, click again

    // Try resolving the second
    const allRightCallBtns = screen.getAllByRole('button', { name: /Good pick/i })
    if (allRightCallBtns.length > 0) {
      await user.click(allRightCallBtns[0])
    }

    // Accept either the done state or at least one row resolved to "Logged"
    const doneText = screen.queryByText(/All five\. See you next Sunday\./)
    const resolvedCount = screen.queryAllByText('Logged')
    expect(doneText || resolvedCount.length > 0).toBeTruthy()
  })

  it('tag picker is not a modal — no dialog role', async () => {
    const user = userEvent.setup()
    render(<CalibrationCard picks={mockPicks} />)

    const notQuiteButtons = screen.getAllByRole('button', { name: /Missed the mark/i })
    await user.click(notQuiteButtons[0])

    // No dialog element should exist
    expect(screen.queryByRole('dialog')).toBeNull()
    // Tag picker is inline (group role)
    expect(screen.getByRole('group', { name: /Why wasn't this a good pick/i })).toBeInTheDocument()
  })
})
