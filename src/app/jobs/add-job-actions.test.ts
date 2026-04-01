import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

let insertData: Record<string, unknown> = {}
let insertResult = { error: null as null | { message: string } }

const mockChain: Record<string, unknown> = {}
mockChain.insert = vi.fn((data: Record<string, unknown>) => {
  insertData = data
  return mockChain
})
mockChain.select = vi.fn().mockReturnValue(mockChain)
mockChain.single = vi.fn().mockImplementation(() =>
  insertResult.error
    ? Promise.resolve({ data: null, error: insertResult.error })
    : Promise.resolve({ data: { id: 'new-job-1' }, error: null }),
)

const mockUser = { id: 'user-123' }

vi.mock('@/db/supabase-server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }) },
    from: () => mockChain,
  }),
}))

const { addManualJob } = await import('./actions')

describe('addManualJob', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    insertResult = { error: null }
  })

  it('creates a job with required fields', async () => {
    const result = await addManualJob({ title: 'Scientist', company: 'MIT' })
    expect(result.success).toBe(true)
    expect(insertData).toMatchObject({
      title: 'Scientist',
      company: 'MIT',
      user_id: 'user-123',
      source: 'manual',
    })
  })

  it('rejects empty title', async () => {
    const result = await addManualJob({ title: '', company: 'MIT' })
    expect(result.success).toBe(false)
    expect(result.error).toBe('Title is required')
  })

  it('rejects empty company', async () => {
    const result = await addManualJob({ title: 'Scientist', company: '' })
    expect(result.success).toBe(false)
    expect(result.error).toBe('Company is required')
  })

  it('strips UTM tracking params from URL', async () => {
    await addManualJob({
      title: 'Scientist',
      company: 'MIT',
      url: 'https://mit.edu/jobs/123?utm_source=twitter&utm_medium=social&ref=real',
    })
    expect(insertData.url).toBe('https://mit.edu/jobs/123?ref=real')
  })

  it('strips fbclid and gclid from URL', async () => {
    await addManualJob({
      title: 'Scientist',
      company: 'MIT',
      url: 'https://example.com/job?fbclid=abc&gclid=xyz',
    })
    expect(insertData.url).toBe('https://example.com/job')
  })

  it('keeps invalid URL as-is', async () => {
    await addManualJob({
      title: 'Scientist',
      company: 'MIT',
      url: 'not-a-url',
    })
    expect(insertData.url).toBe('not-a-url')
  })

  it('sets null URL when empty', async () => {
    await addManualJob({ title: 'Scientist', company: 'MIT', url: '' })
    expect(insertData.url).toBeNull()
  })

  it('trims whitespace from all text fields', async () => {
    await addManualJob({
      title: '  Scientist  ',
      company: '  MIT  ',
      location: '  Boston  ',
      notes: '  Great lab  ',
    })
    expect(insertData.title).toBe('Scientist')
    expect(insertData.company).toBe('MIT')
    expect(insertData.location).toBe('Boston')
    expect(insertData.why_fits).toBe('Great lab')
  })

  it('defaults visa_path to unknown', async () => {
    await addManualJob({ title: 'Scientist', company: 'MIT' })
    expect(insertData.visa_path).toBe('unknown')
  })

  it('returns error on database failure', async () => {
    insertResult = { error: { message: 'Unique violation' } }
    const result = await addManualJob({ title: 'Scientist', company: 'MIT' })
    expect(result.success).toBe(false)
    expect(result.error).toBe('Unique violation')
  })
})
