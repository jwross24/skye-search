import { describe, it, expect, vi, beforeEach } from 'vitest'

function log(step: string, detail: string) {
  process.stdout.write(`  [cover-letter-actions] ${step}: ${detail}\n`)
}

// ─── Supabase mock ──────────────────────────────────────────────────────────

const mockGetUser = vi.fn()

function buildChain(resolveWith: { data: unknown; error: unknown } = { data: null, error: null }) {
  // Supabase query builder is a thenable — methods chain, and await/then triggers the query
  const chain: Record<string, unknown> = {}
  chain.select = vi.fn().mockReturnValue(chain)
  chain.eq = vi.fn().mockReturnValue(chain)
  chain.in = vi.fn().mockReturnValue(chain)
  chain.gte = vi.fn().mockReturnValue(chain)
  chain.order = vi.fn().mockReturnValue(chain)
  chain.limit = vi.fn().mockReturnValue(chain)
  chain.single = vi.fn().mockResolvedValue(resolveWith)
  chain.maybeSingle = vi.fn().mockResolvedValue(resolveWith)
  chain.update = vi.fn().mockReturnValue(chain)
  chain.insert = vi.fn().mockReturnValue(chain)
  // Make chain thenable (Supabase resolves on await)
  chain.then = (resolve: (v: unknown) => void) => Promise.resolve(resolveWith).then(resolve)
  return chain
}

let currentChain = buildChain()

const mockSupabase = {
  auth: { getUser: () => mockGetUser() },
  from: vi.fn(() => currentChain),
}

vi.mock('@/db/supabase-server', () => ({
  createClient: () => Promise.resolve(mockSupabase),
}))

vi.mock('@/lib/task-queue', () => ({
  enqueueTask: vi.fn().mockResolvedValue({ taskId: 'task-123', skipped: false }),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

beforeEach(() => {
  vi.clearAllMocks()
  currentChain = buildChain()
  mockSupabase.from = vi.fn(() => currentChain)
  mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
})

// ─── generateCoverLetter ────────────────────────────────────────────────────

describe('generateCoverLetter', () => {
  it('returns not authenticated when no user', async () => {
    log('Step 1', 'Calling without auth')
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const { generateCoverLetter } = await import('./cover-letter-actions')
    const result = await generateCoverLetter('app-1')

    expect(result.success).toBe(false)
    expect(result.error).toBe('Not authenticated')
    log('Step 2', 'Auth check passed')
  })

  it('enqueues task when no duplicate exists', async () => {
    log('Step 1', 'Calling with authenticated user')
    // No existing tasks — build a chain that resolves with empty data on await
    currentChain = buildChain({ data: [], error: null })
    mockSupabase.from = vi.fn(() => currentChain)

    const { enqueueTask } = await import('@/lib/task-queue')
    const { generateCoverLetter } = await import('./cover-letter-actions')
    await generateCoverLetter('app-1')

    expect(enqueueTask).toHaveBeenCalledWith(
      expect.objectContaining({
        taskType: 'tailor_cover_letter',
        payload: { application_id: 'app-1' },
        maxRetries: 2,
      }),
    )
    log('Step 2', 'enqueueTask called with correct params')
  })
})

// ─── getCoverLetterStatus ───────────────────────────────────────────────────

describe('getCoverLetterStatus', () => {
  it('returns none when no cover letter and no tasks', async () => {
    log('Step 1', 'Polling with no documents or tasks')
    // Application query returns job
    const appChain = buildChain()
    ;(appChain.single as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { id: 'app-1', documents_used: null, jobs: { id: 'job-1' } },
      error: null,
    })

    // Document query returns nothing
    const docChain = buildChain()
    ;(docChain.maybeSingle as ReturnType<typeof vi.fn>).mockResolvedValue({ data: null, error: null })

    // Task query returns nothing
    const taskChain = buildChain()
    ;(taskChain.limit as ReturnType<typeof vi.fn>).mockResolvedValue({ data: [], error: null })

    let callCount = 0
    mockSupabase.from = vi.fn(() => {
      callCount++
      if (callCount === 1) return appChain
      if (callCount === 2) return docChain
      return taskChain
    })

    const { getCoverLetterStatus } = await import('./cover-letter-actions')
    const result = await getCoverLetterStatus('app-1')

    expect(result.status).toBe('none')
    log('Step 2', 'Returns none when nothing exists')
  })

  it('returns ready when cover letter document exists', async () => {
    log('Step 1', 'Polling with existing document')
    const appChain = buildChain()
    ;(appChain.single as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: { id: 'app-1', documents_used: ['doc-1'], jobs: { id: 'job-1' } },
      error: null,
    })

    const docChain = buildChain()
    ;(docChain.maybeSingle as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: {
        id: 'doc-1',
        content_md: 'Cover letter text',
        version: 1,
        status: 'pending_review',
        created_at: '2026-03-29T12:00:00Z',
      },
      error: null,
    })

    let callCount = 0
    mockSupabase.from = vi.fn(() => {
      callCount++
      if (callCount === 1) return appChain
      return docChain
    })

    const { getCoverLetterStatus } = await import('./cover-letter-actions')
    const result = await getCoverLetterStatus('app-1')

    expect(result.status).toBe('ready')
    expect(result.document?.contentMd).toBe('Cover letter text')
    log('Step 2', 'Returns ready with document data')
  })
})

// ─── saveCoverLetterEdit ────────────────────────────────────────────────────

describe('saveCoverLetterEdit', () => {
  it('updates document content_md', async () => {
    log('Step 1', 'Saving edit')

    const { saveCoverLetterEdit } = await import('./cover-letter-actions')
    const result = await saveCoverLetterEdit('doc-1', 'New content')

    expect(result.success).toBe(true)
    expect(mockSupabase.from).toHaveBeenCalledWith('documents')
    log('Step 2', 'Document updated')
  })
})

// ─── approveCoverLetter ─────────────────────────────────────────────────────

describe('approveCoverLetter', () => {
  it('sets document status to approved', async () => {
    log('Step 1', 'Approving cover letter')

    const { approveCoverLetter } = await import('./cover-letter-actions')
    const result = await approveCoverLetter('doc-1')

    expect(result.success).toBe(true)
    expect(mockSupabase.from).toHaveBeenCalledWith('documents')
    log('Step 2', 'Document approved')
  })
})

// ─── quickApply ─────────────────────────────────────────────────────────────

describe('quickApply', () => {
  it('moves application to applied status', async () => {
    log('Step 1', 'Quick applying')
    // Master CV lookup
    const cvChain = buildChain({ data: { id: 'cv-1' }, error: null })

    // Application update
    const appChain = buildChain()

    let callCount = 0
    mockSupabase.from = vi.fn(() => {
      callCount++
      if (callCount === 1) return cvChain
      return appChain
    })

    const { quickApply } = await import('./cover-letter-actions')
    const result = await quickApply('app-1')

    expect(result.success).toBe(true)
    log('Step 2', 'Application moved to applied with master CV')
  })
})
