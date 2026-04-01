/**
 * Unit tests for /api/export — Data Export route.
 * Mocks Supabase client to test ZIP generation logic.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import JSZip from 'jszip'

// Mock Supabase server client
const mockFrom = vi.fn()
const mockStorage = {
  from: vi.fn().mockReturnValue({
    download: vi.fn().mockResolvedValue({ data: null }),
  }),
}
const mockGetUser = vi.fn()

vi.mock('@/db/supabase-server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: () => mockGetUser() },
    from: (...args: unknown[]) => mockFrom(...args),
    storage: mockStorage,
  }),
}))

// Supabase query chain builder
function mockChain(data: unknown) {
  const chain: Record<string, unknown> = {}
  const methods = ['select', 'eq', 'order', 'limit', 'single', 'maybeSingle', 'like']
  for (const m of methods) {
    chain[m] = vi.fn().mockReturnValue(chain)
  }
  // Make the chain thenable (for await without explicit .single()/.maybeSingle())
  chain.then = (resolve: (v: unknown) => void) => resolve({ data, error: null })
  return chain
}

const TEST_USER = { id: 'user-123', email: 'test@example.com' }

beforeEach(() => {
  vi.clearAllMocks()
  mockGetUser.mockResolvedValue({ data: { user: TEST_USER } })
})

function setupMocks(overrides: Record<string, unknown> = {}) {
  const defaults: Record<string, unknown> = {
    users: { profile: { name: 'Test' }, skills: ['python'], user_preferences: {} },
    immigration_status: { visa_type: 'F-1 OPT STEM' },
    daily_checkpoint: [{ checkpoint_date: '2026-03-31', status: 'employed_postdoc' }],
    applications: [{ id: 'app-1', kanban_status: 'applied' }],
    jobs: [{ id: 'job-1', title: 'Research Scientist' }],
    contacts: [{ name: 'Dr. Smith' }],
    plans: [{ id: 'plan_a', status: 'active' }],
    documents: [],
    votes: [{ job_id: 'job-1', vote: 'interested' }],
    ...overrides,
  }

  mockFrom.mockImplementation((table: string) => mockChain(defaults[table] ?? null))
}

describe('GET /api/export', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const { GET } = await import('./route')
    const res = await GET()

    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBe('Not authenticated')
  })

  it('[export] Step 1: generates ZIP with all expected JSON files', async () => {
    setupMocks()

    const { GET } = await import('./route')
    const res = await GET()

    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('application/zip')
    expect(res.headers.get('Content-Disposition')).toMatch(/skye-search-export-.*\.zip/)

    const buffer = await res.arrayBuffer()
    const zip = await JSZip.loadAsync(buffer)

    const files = Object.keys(zip.files)
    console.log('[export] Step 2: ZIP contains:', files.join(', '))

    expect(files).toContain('immigration_status.json')
    expect(files).toContain('daily_checkpoints.json')
    expect(files).toContain('applications.json')
    expect(files).toContain('jobs.json')
    expect(files).toContain('contacts.json')
    expect(files).toContain('plans.json')
    expect(files).toContain('votes.json')
    expect(files).toContain('preferences.json')
    expect(files).toContain('_export_metadata.json')
  })

  it('[export] Step 1: immigration_status.json has correct structure', async () => {
    setupMocks()

    const { GET } = await import('./route')
    const res = await GET()
    const zip = await JSZip.loadAsync(await res.arrayBuffer())

    const content = await zip.file('immigration_status.json')!.async('text')
    const parsed = JSON.parse(content)
    console.log('[export] Step 2: immigration_status:', JSON.stringify(parsed))

    expect(parsed.visa_type).toBe('F-1 OPT STEM')
  })

  it('[export] Step 1: daily_checkpoints.json contains entries', async () => {
    setupMocks()

    const { GET } = await import('./route')
    const res = await GET()
    const zip = await JSZip.loadAsync(await res.arrayBuffer())

    const content = await zip.file('daily_checkpoints.json')!.async('text')
    const parsed = JSON.parse(content)
    console.log('[export] Step 2: checkpoints count:', parsed.length)

    expect(parsed).toHaveLength(1)
    expect(parsed[0].status).toBe('employed_postdoc')
  })

  it('[export] Step 1: preferences.json includes profile and skills', async () => {
    setupMocks()

    const { GET } = await import('./route')
    const res = await GET()
    const zip = await JSZip.loadAsync(await res.arrayBuffer())

    const content = await zip.file('preferences.json')!.async('text')
    const parsed = JSON.parse(content)
    console.log('[export] Step 2: preferences:', Object.keys(parsed))

    expect(parsed.profile).toEqual({ name: 'Test' })
    expect(parsed.skills).toEqual(['python'])
  })

  it('[export] Step 1: _export_metadata.json has correct version and user', async () => {
    setupMocks()

    const { GET } = await import('./route')
    const res = await GET()
    const zip = await JSZip.loadAsync(await res.arrayBuffer())

    const content = await zip.file('_export_metadata.json')!.async('text')
    const parsed = JSON.parse(content)
    console.log('[export] Step 2: metadata:', parsed.version, parsed.user_email)

    expect(parsed.version).toBe('1.0')
    expect(parsed.user_email).toBe('test@example.com')
    expect(parsed.exported_at).toBeTruthy()
  })

  it('[export] Step 1: metadata files list includes structured JSON entries when docs have structured_data_json', async () => {
    setupMocks({
      documents: [
        { id: 'doc-1', file_path: 'user-123/cv.pdf', structured_data_json: { name: 'Test' } },
        { id: 'doc-2', file_path: null, structured_data_json: { name: 'Test2' } },
      ],
    })

    const { GET } = await import('./route')
    const res = await GET()
    const zip = await JSZip.loadAsync(await res.arrayBuffer())

    const content = await zip.file('_export_metadata.json')!.async('text')
    const parsed = JSON.parse(content)
    console.log('[export] Step 2: metadata files:', parsed.files)

    expect(parsed.files).toContain('documents/cv.pdf')
    expect(parsed.files).toContain('documents/doc-1-structured.json')
    expect(parsed.files).toContain('documents/doc-2-structured.json')
    // doc-2 has no file_path — should not have a binary entry
    expect(parsed.files.filter((f: string) => f === 'documents/doc-2')).toHaveLength(0)
  })

  it('[export] Step 1: no cooldown — can be called repeatedly', async () => {
    setupMocks()

    const { GET } = await import('./route')
    const res1 = await GET()
    const res2 = await GET()

    console.log('[export] Step 2: Both calls returned 200')
    expect(res1.status).toBe(200)
    expect(res2.status).toBe(200)
  })
})
