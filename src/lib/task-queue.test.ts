import { describe, it, expect, vi, beforeEach } from 'vitest'
import { enqueueTask } from './task-queue'

// Mock @supabase/supabase-js with a chainable query builder
const mockInsert = vi.fn()
const mockSelect = vi.fn()

vi.mock('@supabase/supabase-js', () => {
  function queryBuilder(value: unknown) {
    return new Proxy({} as Record<string, unknown>, {
      get(_, prop) {
        if (prop === 'then') {
          return (resolve: (v: unknown) => void) => Promise.resolve(value).then(resolve)
        }
        if (prop === 'insert') return mockInsert
        return () => queryBuilder(value)
      },
    })
  }

  return {
    createClient: vi.fn(() => ({
      from: () => queryBuilder({ data: null, count: 0, error: null }),
    })),
  }
})

beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'http://localhost:54321')
  vi.stubEnv('SUPABASE_SECRET_KEY', 'test-key')
  mockInsert.mockReset()
  mockSelect.mockReset()
})

describe('enqueueTask', () => {
  it('inserts a task and returns the task ID', async () => {
    mockInsert.mockReturnValue({
      select: () => ({
        single: () => Promise.resolve({ data: { id: 'task-abc' }, error: null }),
      }),
    })

    const result = await enqueueTask({
      userId: 'user-1',
      taskType: 'tailor_docs',
      payload: { jobId: 'job-1' },
    })

    expect(result.taskId).toBe('task-abc')
    expect(result.skipped).toBe(false)
    expect(mockInsert).toHaveBeenCalledWith({
      user_id: 'user-1',
      task_type: 'tailor_docs',
      payload_json: { jobId: 'job-1' },
      max_retries: 3,
    })
  })

  it('skips enqueue when idempotency check finds existing task', async () => {
    // The mock query builder returns count: 1 for the idempotency check
    // We need to override the createClient mock for this test
    const { createClient } = await import('@supabase/supabase-js')

    function chainWithCount(count: number) {
      return new Proxy({} as Record<string, unknown>, {
        get(_, prop) {
          if (prop === 'then') {
            return (resolve: (v: unknown) => void) =>
              Promise.resolve({ data: null, count, error: null }).then(resolve)
          }
          return () => chainWithCount(count)
        },
      })
    }

    vi.mocked(createClient).mockReturnValueOnce({
      from: () => chainWithCount(1),
    } as unknown as ReturnType<typeof createClient>)

    const result = await enqueueTask({
      userId: 'user-1',
      taskType: 'tailor_docs',
      payload: { jobId: 'job-1' },
      idempotencyWindowMinutes: 5,
    })

    expect(result.skipped).toBe(true)
    expect(result.taskId).toBe('')
  })

  it('uses custom maxRetries', async () => {
    mockInsert.mockReturnValue({
      select: () => ({
        single: () => Promise.resolve({ data: { id: 'task-xyz' }, error: null }),
      }),
    })

    await enqueueTask({
      userId: 'user-1',
      taskType: 'scrape_url',
      payload: { url: 'https://example.com' },
      maxRetries: 5,
    })

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ max_retries: 5 }),
    )
  })
})
