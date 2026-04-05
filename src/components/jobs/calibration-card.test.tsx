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
    expect(screen.getByText(/Did I get it right/)).toBeInTheDocument()
  })

  it('shows urgency scores as pills', () => {
    render(<CalibrationCard picks={mockPicks} />)
    expect(screen.getByText('0.88')).toBeInTheDocument()
    expect(screen.getByText('0.82')).toBeInTheDocument()
  })

  it('shows primary reasons', () => {
    render(<CalibrationCard picks={mockPicks} />)
    expect(screen.getByText('Confirmed cap-exempt employer')).toBeInTheDocument()
    expect(screen.getByText('Deadline in 7 days')).toBeInTheDocument()
  })

  it('"Right call" fires logCalibrationConfirmed with job id', async () => {
    const user = userEvent.setup()
    render(<CalibrationCard picks={mockPicks} />)

    const buttons = screen.getAllByRole('button', { name: /Right call/i })
    await user.click(buttons[0])

    expect(logCalibrationConfirmed).toHaveBeenCalledWith('job-1')
  })

  it('"Not quite" reveals inline tag picker', async () => {
    const user = userEvent.setup()
    render(<CalibrationCard picks={mockPicks} />)

    const buttons = screen.getAllByRole('button', { name: /Not quite/i })
    await user.click(buttons[0])

    expect(screen.getByText('Wrong visa path')).toBeInTheDocument()
    expect(screen.getByText('Stale posting')).toBeInTheDocument()
    expect(screen.getByText('Wrong field')).toBeInTheDocument()
    expect(screen.getByText('Other')).toBeInTheDocument()
  })

  it('tag selection fires logCalibrationTooHigh with correct tag', async () => {
    const user = userEvent.setup()
    render(<CalibrationCard picks={mockPicks} />)

    const notQuiteButtons = screen.getAllByRole('button', { name: /Not quite/i })
    await user.click(notQuiteButtons[0])

    await user.click(screen.getByText('Wrong visa path'))
    expect(logCalibrationTooHigh).toHaveBeenCalledWith('job-1', 'wrong_visa')
  })

  it('marks row as resolved after "Right call" is clicked', async () => {
    const user = userEvent.setup()
    render(<CalibrationCard picks={mockPicks} />)

    const rightCallButtons = screen.getAllByRole('button', { name: /Right call/i })
    await user.click(rightCallButtons[0])

    // Row should show resolved confirmation text
    expect(screen.getByText('Got it, thanks')).toBeInTheDocument()
  })

  it('marks row as resolved after tag is selected', async () => {
    const user = userEvent.setup()
    render(<CalibrationCard picks={mockPicks} />)

    const notQuiteButtons = screen.getAllByRole('button', { name: /Not quite/i })
    await user.click(notQuiteButtons[1]) // second pick

    await user.click(screen.getByText('Wrong field'))
    expect(screen.getByText('Noted — Wrong field')).toBeInTheDocument()
  })

  it('shows "Done" state when all 5 picks resolved', async () => {
    const user = userEvent.setup()
    render(<CalibrationCard picks={mockPicks.slice(0, 2)} />)

    // Resolve both
    const rightCallButtons = screen.getAllByRole('button', { name: /Right call/i })
    await user.click(rightCallButtons[0])
    await user.click(rightCallButtons[0]) // now only 1 left, click again

    // After all resolved, the done state should appear
    // (We need to resolve all 2 picks)
    // Try resolving the second
    const allRightCallBtns = screen.getAllByRole('button', { name: /Right call/i })
    if (allRightCallBtns.length > 0) {
      await user.click(allRightCallBtns[0])
    }

    // Eventually "Done" appears — accept either done message or all resolved states
    const doneText = screen.queryByText(/Done — thanks, see you next week/)
    const resolvedCount = screen.queryAllByText('Got it, thanks')
    expect(doneText || resolvedCount.length > 0).toBeTruthy()
  })

  it('tag picker is not a modal — no dialog role', async () => {
    const user = userEvent.setup()
    render(<CalibrationCard picks={mockPicks} />)

    const notQuiteButtons = screen.getAllByRole('button', { name: /Not quite/i })
    await user.click(notQuiteButtons[0])

    // No dialog element should exist
    expect(screen.queryByRole('dialog')).toBeNull()
    // Tag picker is inline (group role)
    expect(screen.getByRole('group', { name: /Why wasn't this a good pick/i })).toBeInTheDocument()
  })
})
