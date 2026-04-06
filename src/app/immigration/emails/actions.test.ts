import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Supabase server client before importing actions
const mockGetUser = vi.fn()
const mockFrom = vi.fn()

vi.mock('@/db/supabase-server', () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      auth: { getUser: mockGetUser },
      from: mockFrom,
    }),
  ),
}))

// We need to re-import after mocking
import { getEmailTemplateData } from './actions'

const TEST_USER_ID = 'test-user-uuid'

function makeChain(returnData: unknown, error: unknown = null) {
  const chain: Record<string, unknown> = {}
  const methods = ['select', 'eq', 'in', 'maybeSingle', 'single']
  for (const m of methods) {
    chain[m] = () => chain
  }
  // Terminal resolution
  chain.single = () => Promise.resolve({ data: returnData, error })
  chain.maybeSingle = () => Promise.resolve({ data: returnData, error })
  chain.then = (resolve: (v: { data: unknown; error: unknown }) => unknown) =>
    Promise.resolve({ data: returnData, error }).then(resolve)
  return chain
}

describe('getEmailTemplateData', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns null when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const result = await getEmailTemplateData()

    expect(result).toBeNull()
  })

  it('returns template data with correct field types when data exists', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: TEST_USER_ID, email: 'test@example.com' } } })

    const immChain = makeChain({
      postdoc_end_date: '2026-04-11',
      opt_expiry: '2026-08-15',
      employment_active: false,
      initial_days_used: 7,
    })
    const clockChain = makeChain({ days_remaining: 143 })
    const userChain = makeChain({ profile: { full_name: 'Wei Chen', dso_name: 'Jane Smith' } })
    const plansChain = makeChain([{ id: 'plan_a', status: 'active' }])
    const appsChain = makeChain([])

    // from() returns different chains based on table name
    mockFrom.mockImplementation((table: string) => {
      if (table === 'immigration_status') return immChain
      if (table === 'immigration_clock') return clockChain
      if (table === 'users') return userChain
      if (table === 'plans') return plansChain
      if (table === 'applications') return appsChain
      return makeChain(null)
    })

    const result = await getEmailTemplateData()

    expect(result).not.toBeNull()
    expect(result!.postdocEndDate).toBe('2026-04-11')
    expect(result!.optExpiry).toBe('2026-08-15')
    expect(result!.daysUsed).toBe(7) // 150 - 143
    expect(result!.fullName).toBe('Wei Chen')
    expect(result!.dsoName).toBe('Jane Smith')
    expect(result!.employmentActive).toBe(false)
    expect(result!.planCActive).toBe(false)
    expect(result!.offerAccepted).toBe(false)
    expect(typeof result!.hrContact).toBe('string')
  })

  it('uses fallback name from email when profile has no full_name', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: TEST_USER_ID, email: 'wchen@bu.edu' } },
    })

    const immChain = makeChain({ postdoc_end_date: null, opt_expiry: null, employment_active: false, initial_days_used: 0 })
    const clockChain = makeChain(null)
    const userChain = makeChain({ profile: {} })
    const plansChain = makeChain([])
    const appsChain = makeChain([])

    mockFrom.mockImplementation((table: string) => {
      if (table === 'immigration_status') return immChain
      if (table === 'immigration_clock') return clockChain
      if (table === 'users') return userChain
      if (table === 'plans') return plansChain
      if (table === 'applications') return appsChain
      return makeChain(null)
    })

    const result = await getEmailTemplateData()

    expect(result).not.toBeNull()
    expect(result!.fullName).toBe('wchen') // email username fallback
  })

  it('uses placeholder DSO name when profile has no dso_name', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: TEST_USER_ID, email: 'test@test.com' } },
    })

    const immChain = makeChain({ postdoc_end_date: null, opt_expiry: null, employment_active: false, initial_days_used: 0 })
    const clockChain = makeChain(null)
    const userChain = makeChain({ profile: {} })
    const plansChain = makeChain([])
    const appsChain = makeChain([])

    mockFrom.mockImplementation((table: string) => {
      if (table === 'immigration_status') return immChain
      if (table === 'immigration_clock') return clockChain
      if (table === 'users') return userChain
      if (table === 'plans') return plansChain
      if (table === 'applications') return appsChain
      return makeChain(null)
    })

    const result = await getEmailTemplateData()

    expect(result).not.toBeNull()
    expect(result!.dsoName).toBe("[Your DSO's name]")
  })

  it('handles null immigration data gracefully', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: TEST_USER_ID, email: 'test@test.com' } },
    })

    const immChain = makeChain(null)
    const clockChain = makeChain(null)
    const userChain = makeChain({ profile: {} })
    const plansChain = makeChain([])
    const appsChain = makeChain([])

    mockFrom.mockImplementation((table: string) => {
      if (table === 'immigration_status') return immChain
      if (table === 'immigration_clock') return clockChain
      if (table === 'users') return userChain
      if (table === 'plans') return plansChain
      if (table === 'applications') return appsChain
      return makeChain(null)
    })

    const result = await getEmailTemplateData()

    expect(result).not.toBeNull()
    expect(result!.postdocEndDate).toBeNull()
    expect(result!.optExpiry).toBeNull()
    expect(result!.daysUsed).toBe(0)
    expect(result!.employmentActive).toBe(false)
  })

  it('detects planCActive when plan_c is active', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: TEST_USER_ID, email: 'test@test.com' } },
    })

    const immChain = makeChain({ postdoc_end_date: null, opt_expiry: null, employment_active: false, initial_days_used: 0 })
    const clockChain = makeChain(null)
    const userChain = makeChain({ profile: {} })
    const plansChain = makeChain([
      { id: 'plan_a', status: 'not_started' },
      { id: 'plan_c', status: 'active' },
    ])
    const appsChain = makeChain([])

    mockFrom.mockImplementation((table: string) => {
      if (table === 'immigration_status') return immChain
      if (table === 'immigration_clock') return clockChain
      if (table === 'users') return userChain
      if (table === 'plans') return plansChain
      if (table === 'applications') return appsChain
      return makeChain(null)
    })

    const result = await getEmailTemplateData()

    expect(result).not.toBeNull()
    expect(result!.planCActive).toBe(true)
  })

  it('detects offerAccepted when a cap_exempt job matches an offer_accepted application', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: TEST_USER_ID, email: 'test@test.com' } },
    })

    const JOB_ID = 'job-uuid-cap-exempt'
    const immChain = makeChain({ postdoc_end_date: null, opt_expiry: null, employment_active: false, initial_days_used: 0 })
    const clockChain = makeChain(null)
    const userChain = makeChain({ profile: {} })
    const plansChain = makeChain([])
    const appsChain = makeChain([{ kanban_status: 'offer_accepted', job_id: JOB_ID }])
    const jobsChain = makeChain([{ id: JOB_ID, visa_path: 'cap_exempt' }])

    mockFrom.mockImplementation((table: string) => {
      if (table === 'immigration_status') return immChain
      if (table === 'immigration_clock') return clockChain
      if (table === 'users') return userChain
      if (table === 'plans') return plansChain
      if (table === 'applications') return appsChain
      if (table === 'jobs') return jobsChain
      return makeChain(null)
    })

    const result = await getEmailTemplateData()

    expect(result).not.toBeNull()
    expect(result!.offerAccepted).toBe(true)
  })
})
