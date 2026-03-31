import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SettingsPageContent } from './settings-page-content'
import type { UserProfile } from '@/types/cv-extraction'

const mockAddSkill = vi.fn().mockResolvedValue({ success: true })
const mockRemoveSkill = vi.fn().mockResolvedValue({ success: true })

vi.mock('@/app/settings/actions', () => ({
  addSkill: (...args: unknown[]) => mockAddSkill(...args),
  removeSkill: (...args: unknown[]) => mockRemoveSkill(...args),
  saveExtractedProfile: vi.fn(),
}))

vi.mock('@/db/supabase', () => ({
  createClient: () => ({
    functions: { invoke: vi.fn() },
  }),
}))

const defaultProfile: UserProfile = {
  name: 'Skye Zhang',
  field: 'Environmental Science',
  research_areas: ['Ocean Color'],
  publications: [],
  education: [],
  employment_history: [],
}

const defaultSkills = ['Python', 'R', 'MATLAB', 'Remote Sensing']

describe('Skills management on settings page', () => {
  beforeEach(() => {
    mockAddSkill.mockClear()
    mockRemoveSkill.mockClear()
    mockAddSkill.mockResolvedValue({ success: true })
    mockRemoveSkill.mockResolvedValue({ success: true })
  })

  it('renders all tracked skills as removable tags', () => {
    render(
      <SettingsPageContent
        profile={defaultProfile}
        skills={defaultSkills}
        latestCv={null}
      />,
    )

    expect(screen.getByText('Python')).toBeTruthy()
    expect(screen.getByText('R')).toBeTruthy()
    expect(screen.getByText('MATLAB')).toBeTruthy()
    expect(screen.getByText('Remote Sensing')).toBeTruthy()
    expect(screen.getByText('4 tracked')).toBeTruthy()

    // Each skill has a remove button
    expect(screen.getByLabelText('Remove Python')).toBeTruthy()
    expect(screen.getByLabelText('Remove R')).toBeTruthy()
  })

  it('shows empty state when no skills', () => {
    render(
      <SettingsPageContent
        profile={defaultProfile}
        skills={[]}
        latestCv={null}
      />,
    )

    expect(screen.getByText('0 tracked')).toBeTruthy()
    expect(screen.getByText('Add skills that matter for your job search')).toBeTruthy()
  })

  it('adds a new skill via input and button', async () => {
    const user = userEvent.setup()
    render(
      <SettingsPageContent
        profile={defaultProfile}
        skills={defaultSkills}
        latestCv={null}
      />,
    )

    const input = screen.getByPlaceholderText('Add a skill...')
    await user.type(input, 'GIS')
    await user.click(screen.getByText('Add'))

    // Optimistic: skill appears immediately
    expect(screen.getByText('GIS')).toBeTruthy()
    expect(screen.getByText('5 tracked')).toBeTruthy()

    // Server action called
    expect(mockAddSkill).toHaveBeenCalledWith('GIS')
  })

  it('adds a new skill via Enter key', async () => {
    const user = userEvent.setup()
    render(
      <SettingsPageContent
        profile={defaultProfile}
        skills={defaultSkills}
        latestCv={null}
      />,
    )

    const input = screen.getByPlaceholderText('Add a skill...')
    await user.type(input, 'Docker{Enter}')

    expect(screen.getByText('Docker')).toBeTruthy()
    expect(mockAddSkill).toHaveBeenCalledWith('Docker')
  })

  it('removes a skill when X is clicked', async () => {
    const user = userEvent.setup()
    render(
      <SettingsPageContent
        profile={defaultProfile}
        skills={defaultSkills}
        latestCv={null}
      />,
    )

    await user.click(screen.getByLabelText('Remove MATLAB'))

    // Optimistic: skill removed immediately
    expect(screen.queryByText('MATLAB')).toBeNull()
    expect(screen.getByText('3 tracked')).toBeTruthy()

    expect(mockRemoveSkill).toHaveBeenCalledWith('MATLAB')
  })

  it('prevents adding duplicate skills (case-insensitive)', async () => {
    const user = userEvent.setup()
    render(
      <SettingsPageContent
        profile={defaultProfile}
        skills={defaultSkills}
        latestCv={null}
      />,
    )

    const input = screen.getByPlaceholderText('Add a skill...')
    await user.type(input, 'python')
    await user.click(screen.getByText('Add'))

    expect(screen.getByText('Already tracked')).toBeTruthy()
    expect(mockAddSkill).not.toHaveBeenCalled()
  })

  it('prevents adding empty skill', async () => {
    const user = userEvent.setup()
    render(
      <SettingsPageContent
        profile={defaultProfile}
        skills={defaultSkills}
        latestCv={null}
      />,
    )

    // Button should be disabled when input is empty
    const addButton = screen.getByText('Add')
    expect(addButton.getAttribute('disabled')).not.toBeNull()

    // Type spaces and try
    const input = screen.getByPlaceholderText('Add a skill...')
    await user.type(input, '   ')
    await user.click(addButton)

    expect(mockAddSkill).not.toHaveBeenCalled()
  })

  it('reverts optimistic add on server error', async () => {
    mockAddSkill.mockResolvedValue({ success: false, error: 'Database error' })
    const user = userEvent.setup()
    render(
      <SettingsPageContent
        profile={defaultProfile}
        skills={defaultSkills}
        latestCv={null}
      />,
    )

    const input = screen.getByPlaceholderText('Add a skill...')
    await user.type(input, 'NewSkill')
    await user.click(screen.getByText('Add'))

    // After server responds with error, skill should be removed
    // and error message shown
    await vi.waitFor(() => {
      expect(screen.getByText('Database error')).toBeTruthy()
    })
    expect(screen.queryByText('NewSkill')).toBeNull()
  })

  it('reverts optimistic remove on server error', async () => {
    mockRemoveSkill.mockResolvedValue({ success: false, error: 'Failed' })
    const user = userEvent.setup()
    render(
      <SettingsPageContent
        profile={defaultProfile}
        skills={defaultSkills}
        latestCv={null}
      />,
    )

    await user.click(screen.getByLabelText('Remove Python'))

    // After server responds with error, skill should reappear and error shown
    await vi.waitFor(() => {
      expect(screen.getByText('Python')).toBeTruthy()
      expect(screen.getByText('Failed')).toBeTruthy()
    })
  })

  it('clears input after successful add', async () => {
    const user = userEvent.setup()
    render(
      <SettingsPageContent
        profile={defaultProfile}
        skills={defaultSkills}
        latestCv={null}
      />,
    )

    const input = screen.getByPlaceholderText('Add a skill...') as HTMLInputElement
    await user.type(input, 'TensorFlow')
    await user.click(screen.getByText('Add'))

    expect(input.value).toBe('')
  })

  it('clears error when user starts typing', async () => {
    const user = userEvent.setup()
    render(
      <SettingsPageContent
        profile={defaultProfile}
        skills={defaultSkills}
        latestCv={null}
      />,
    )

    // Trigger duplicate error
    const input = screen.getByPlaceholderText('Add a skill...')
    await user.type(input, 'python')
    await user.click(screen.getByText('Add'))
    expect(screen.getByText('Already tracked')).toBeTruthy()

    // Start typing - error should clear
    await user.clear(input)
    await user.type(input, 'T')
    expect(screen.queryByText('Already tracked')).toBeNull()
  })
})
