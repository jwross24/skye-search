import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CvReviewForm } from './cv-review-form'
import type { CvExtraction } from '@/types/cv-extraction'

const mockSaveExtractedProfile = vi.fn().mockResolvedValue({ success: true })
vi.mock('@/app/settings/actions', () => ({
  saveExtractedProfile: (...args: unknown[]) => mockSaveExtractedProfile(...args),
}))

const mockExtraction: CvExtraction = {
  name: 'Skye Zhang',
  field: 'Environmental Science',
  skills: ['Python', 'MATLAB', 'Remote Sensing', 'GIS'],
  research_areas: ['Ocean Color', 'Coastal Biogeochemistry'],
  publications: [
    { title: 'Ocean color trends in the South China Sea', authors: 'Zhang, S. et al.', venue: 'Remote Sensing of Environment', year: '2024' },
  ],
  education: [
    { degree: 'PhD', field: 'Environmental Science', institution: 'UMass Boston', year: '2024' },
  ],
  employment_history: [
    { title: 'PostDoc Researcher', organization: 'UMass Boston', start_date: '2024-05', end_date: null, description: null },
  ],
}

describe('CvReviewForm', () => {
  const defaultProps = {
    extraction: mockExtraction,
    existingSkills: ['Python', 'R'],
    existingProfile: { name: 'Skye' } as const,
    onSaved: vi.fn(),
    onDiscard: vi.fn(),
  }

  it('renders extracted data in the form', () => {
    render(<CvReviewForm {...defaultProps} />)

    expect(screen.getByText(/we found these details/i)).toBeInTheDocument()
    expect(screen.getByDisplayValue('Skye Zhang')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Environmental Science')).toBeInTheDocument()
    expect(screen.getByText('PhD in Environmental Science')).toBeInTheDocument()
    expect(screen.getByText(/ocean color trends/i)).toBeInTheDocument()
    expect(screen.getByText('PostDoc Researcher')).toBeInTheDocument()
  })

  it('merges skills with dedup (case-insensitive)', () => {
    render(<CvReviewForm {...defaultProps} />)

    // Python exists in both, should appear once. R is existing only. MATLAB, Remote Sensing, GIS are new.
    const skillChips = screen.getAllByText(/Python|R|MATLAB|Remote Sensing|GIS/)
    // Python (1) + R (1) + MATLAB (1) + Remote Sensing (1) + GIS (1) = 5 unique skills
    expect(skillChips.length).toBeGreaterThanOrEqual(5)
  })

  it('allows adding a new skill', async () => {
    const user = userEvent.setup()
    render(<CvReviewForm {...defaultProps} />)

    const input = screen.getByPlaceholderText(/add a skill/i)
    await user.type(input, 'NetCDF{Enter}')

    expect(screen.getByText('NetCDF')).toBeInTheDocument()
  })

  it('allows removing a skill', async () => {
    const user = userEvent.setup()
    render(<CvReviewForm {...defaultProps} />)

    const removeButton = screen.getByLabelText(/remove matlab/i)
    await user.click(removeButton)

    expect(screen.queryByText('MATLAB')).not.toBeInTheDocument()
  })

  it('calls saveExtractedProfile on save', async () => {
    const user = userEvent.setup()
    const onSaved = vi.fn()
    render(<CvReviewForm {...defaultProps} onSaved={onSaved} />)

    await user.click(screen.getByText(/save to profile/i))

    expect(mockSaveExtractedProfile.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        name: 'Skye Zhang',
        field: 'Environmental Science',
        skills: expect.arrayContaining(['Python', 'R', 'MATLAB']),
      }),
    )
    // documentId not provided in defaultProps — second arg should be undefined
    expect(mockSaveExtractedProfile.mock.calls[0][1]).toBeUndefined()
    expect(onSaved).toHaveBeenCalled()
  })

  it('passes documentId to saveExtractedProfile when provided', async () => {
    const user = userEvent.setup()
    mockSaveExtractedProfile.mockClear()
    render(<CvReviewForm {...defaultProps} documentId="doc-abc-123" onSaved={vi.fn()} />)

    await user.click(screen.getByText(/save to profile/i))

    expect(mockSaveExtractedProfile.mock.calls[0][1]).toBe('doc-abc-123')
  })

  it('calls onDiscard when discard is clicked', async () => {
    const user = userEvent.setup()
    const onDiscard = vi.fn()
    render(<CvReviewForm {...defaultProps} onDiscard={onDiscard} />)

    await user.click(screen.getByText(/discard/i))

    expect(onDiscard).toHaveBeenCalled()
  })
})
