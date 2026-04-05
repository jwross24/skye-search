import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

// ─── Supabase mock setup ──────────────────────────────────────────────────────

const mockUser = { id: 'user-test-123' }

// Track call args for assertions
let lastInsertData: Record<string, unknown> = {}
let mockJobsData: unknown[] = []
let mockCalibratedData: unknown[] = []

// Flexible chain builder for select queries
function makeSelectChain(data: unknown[], error: null | { message: string } = null) {
  const chain: Record<string, unknown> = {}
  chain.select = vi.fn().mockReturnValue(chain)
  chain.eq = vi.fn().mockReturnValue(chain)
  chain.not = vi.fn().mockReturnValue(chain)
  chain.gte = vi.fn().mockReturnValue(chain)
  chain.order = vi.fn().mockReturnValue(chain)
  chain.limit = vi.fn().mockReturnValue(chain)
  chain.single = vi.fn().mockResolvedValue({ data: data[0] ?? null, error })
  chain.maybeSingle = vi.fn().mockResolvedValue({ data: data[0] ?? null, error: null })
  chain.then = vi.fn((resolve: (v: unknown) => unknown) => resolve({ data, error }))
  return chain
}

function makeInsertChain(result = { error: null as null | { message: string } }) {
  const chain: Record<string, unknown> = {}
  chain.insert = vi.fn((data: Record<string, unknown>) => {
    lastInsertData = data
    return { then: (resolve: (v: unknown) => unknown) => resolve(result) }
  })
  return chain
}

let supabaseFromCalls: string[] = []

vi.mock('@/db/supabase-server', () => ({
  createClient: vi.fn().mockImplementation(async () => ({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }) },
    from: (table: string) => {
      supabaseFromCalls.push(table)
      if (table === 'jobs') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              gt: vi.fn().mockReturnValue({
                gte: vi.fn().mockReturnValue({
                  order: vi.fn().mockReturnValue({
                    limit: vi.fn().mockResolvedValue({ data: mockJobsData, error: null }),
                  }),
                }),
              }),
            }),
          }),
        }
      }
      if (table === 'calibration_log') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: mockCalibratedData, error: null }),
            }),
          }),
          insert: vi.fn((data: Record<string, unknown>) => {
            lastInsertData = data
            return { then: (resolve: (v: unknown) => unknown) => resolve({ error: null }) }
          }),
        }
      }
      if (table === 'immigration_status') {
        return makeSelectChain([null])
      }
      if (table === 'immigration_clock') {
        return makeSelectChain([null])
      }
      return makeInsertChain()
    },
  })),
}))

const { getCalibrationPicks, logCalibrationConfirmed, logCalibrationTooHigh } =
  await import('./calibration-actions')

describe('getCalibrationPicks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    supabaseFromCalls = []
    mockJobsData = []
    mockCalibratedData = []
    lastInsertData = {}
  })

  it('returns empty picks when no jobs exist', async () => {
    const result = await getCalibrationPicks()
    expect(result.error).toBeUndefined()
    expect(result.picks).toHaveLength(0)
  })

  it('returns picks from scored jobs', async () => {
    mockJobsData = [
      {
        id: 'job-a',
        title: 'Postdoc Researcher',
        company: 'MIT',
        urgency_score: 0.85,
        match_score: null,
        location: 'Boston, MA',
        url: null,
        visa_path: 'cap_exempt',
        cap_exempt_confidence: 'confirmed',
        employment_type: 'full_time',
        source_type: 'academic',
        employer_type: 'university',
        application_deadline: null,
        requires_security_clearance: false,
        requires_citizenship: false,
        h1b_sponsor_count: null,
        application_complexity: null,
        indexed_date: '2026-04-01',
        why_fits: 'Great fit',
      },
    ]

    const result = await getCalibrationPicks()
    expect(result.picks).toHaveLength(1)
    expect(result.picks[0].id).toBe('job-a')
    expect(result.picks[0].title).toBe('Postdoc Researcher')
    expect(result.picks[0].urgency_score).toBe(0.85)
    expect(typeof result.picks[0].primary_reason).toBe('string')
    expect(result.picks[0].primary_reason.length).toBeGreaterThan(0)
  })

  it('excludes already-calibrated jobs', async () => {
    mockJobsData = [
      {
        id: 'job-b',
        title: 'Calibrated Job',
        company: 'WHOI',
        urgency_score: 0.80,
        match_score: null,
        location: null,
        url: null,
        visa_path: 'cap_exempt',
        cap_exempt_confidence: 'likely',
        employment_type: 'full_time',
        source_type: 'academic',
        employer_type: 'university',
        application_deadline: null,
        requires_security_clearance: false,
        requires_citizenship: false,
        h1b_sponsor_count: null,
        application_complexity: null,
        indexed_date: '2026-04-01',
      },
    ]
    mockCalibratedData = [{ job_id: 'job-b' }]

    const result = await getCalibrationPicks()
    expect(result.picks).toHaveLength(0)
  })

  it('limits result to 5 picks', async () => {
    mockJobsData = Array.from({ length: 10 }, (_, i) => ({
      id: `job-${i}`,
      title: `Job ${i}`,
      company: 'Company',
      urgency_score: 0.9 - i * 0.05,
      match_score: null,
      location: null,
      url: null,
      visa_path: 'cap_exempt',
      cap_exempt_confidence: 'confirmed',
      employment_type: 'full_time',
      source_type: 'academic',
      employer_type: 'university',
      application_deadline: null,
      requires_security_clearance: false,
      requires_citizenship: false,
      h1b_sponsor_count: null,
      application_complexity: null,
      indexed_date: '2026-04-01',
    }))

    const result = await getCalibrationPicks()
    expect(result.picks.length).toBeLessThanOrEqual(5)
  })
})

describe('logCalibrationConfirmed', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    lastInsertData = {}
  })

  it('inserts a calibration_log row with feedback_type=confirmed', async () => {
    const result = await logCalibrationConfirmed('job-x')
    expect(result.success).toBe(true)
    expect(lastInsertData).toMatchObject({
      user_id: 'user-test-123',
      job_id: 'job-x',
      feedback_type: 'confirmed',
    })
    expect(lastInsertData.calibration_week).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

describe('logCalibrationTooHigh', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    lastInsertData = {}
  })

  it('inserts a calibration_log row with feedback_type=too_high and tag', async () => {
    const result = await logCalibrationTooHigh('job-y', 'wrong_field')
    expect(result.success).toBe(true)
    expect(lastInsertData).toMatchObject({
      user_id: 'user-test-123',
      job_id: 'job-y',
      feedback_type: 'too_high',
      tag: 'wrong_field',
    })
  })

  it('accepts stale tag without errors', async () => {
    const result = await logCalibrationTooHigh('job-z', 'stale')
    expect(result.success).toBe(true)
  })
})
