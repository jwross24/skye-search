import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const { mockInsert, mockSelect } = vi.hoisted(() => ({
  mockInsert: vi.fn().mockResolvedValue({ error: null }),
  mockSelect: vi.fn(),
}))

vi.mock('@supabase/supabase-js', () => {
  function chainable(result: unknown) {
    return new Proxy({} as Record<string, unknown>, {
      get(_, prop) {
        if (prop === 'then') return (r: (v: unknown) => void) => Promise.resolve(result).then(r)
        return () => chainable(result)
      },
    })
  }

  return {
    createClient: vi.fn(() => ({
      from: (table: string) => {
        if (table === 'users') return chainable({ data: [{ id: 'user-1' }] })
        if (table === 'task_queue') {
          return {
            select: () => ({
              in: () => ({
                in: () => ({
                  gte: () => mockSelect(),
                }),
              }),
            }),
            insert: mockInsert,
          }
        }
        return chainable({ data: [] })
      },
    })),
  }
})

import { POST } from './route'
import { ACADEMIC_QUERIES, INDUSTRY_QUERIES, FIND_SIMILAR_SEEDS } from '@/lib/adapters/exa'
import { USAJOBS_QUERIES } from '@/lib/adapters/usajobs'

const CRON_SECRET = 'test-discover-secret'

function makeRequest(secret?: string) {
  const headers = new Headers()
  if (secret) headers.set('authorization', `Bearer ${secret}`)
  return new NextRequest('http://localhost:3000/api/cron/discover', { method: 'POST', headers })
}

describe('POST /api/cron/discover', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.CRON_SECRET = CRON_SECRET
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321'
    process.env.SUPABASE_SECRET_KEY = 'test-key'
    mockSelect.mockResolvedValue({ count: 0 })
  })

  it('returns 401 without authorization', async () => {
    const res = await POST(makeRequest())
    expect(res.status).toBe(401)
  })

  it('returns 401 with wrong secret', async () => {
    const res = await POST(makeRequest('wrong'))
    expect(res.status).toBe(401)
  })

  it('creates correct number of tasks', async () => {
    const res = await POST(makeRequest(CRON_SECRET))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.ok).toBe(true)

    const expectedTotal = ACADEMIC_QUERIES.length + INDUSTRY_QUERIES.length + FIND_SIMILAR_SEEDS.length + USAJOBS_QUERIES.length
    expect(body.tasks_created).toBe(expectedTotal)
    expect(body.breakdown.academic_search).toBe(ACADEMIC_QUERIES.length)
    expect(body.breakdown.industry_search).toBe(INDUSTRY_QUERIES.length)
    expect(body.breakdown.find_similar).toBe(FIND_SIMILAR_SEEDS.length)
    expect(body.breakdown.usajobs_search).toBe(USAJOBS_QUERIES.length)
  })

  it('inserts tasks with correct structure', async () => {
    await POST(makeRequest(CRON_SECRET))

    expect(mockInsert).toHaveBeenCalledTimes(1)
    const tasks = mockInsert.mock.calls[0][0]

    // First task should be academic search
    expect(tasks[0].task_type).toBe('exa_search_query')
    expect(tasks[0].payload_json.source_type).toBe('academic')
    expect(tasks[0].user_id).toBe('user-1')
    expect(tasks[0].max_retries).toBe(3)

    // Last tasks should be usajobs_search
    const lastTask = tasks[tasks.length - 1]
    expect(lastTask.task_type).toBe('usajobs_search')
    expect(lastTask.payload_json.query).toBeTruthy()

    // findSimilar tasks should be before usajobs
    const findSimilarTasks = tasks.filter((t: { task_type: string }) => t.task_type === 'exa_find_similar')
    expect(findSimilarTasks.length).toBe(FIND_SIMILAR_SEEDS.length)
    expect(findSimilarTasks[0].payload_json.seed_url).toBeTruthy()
  })

  it('skips when pending tasks exist (idempotent)', async () => {
    mockSelect.mockResolvedValue({ count: 5 })

    const res = await POST(makeRequest(CRON_SECRET))
    const body = await res.json()

    expect(body.ok).toBe(true)
    expect(body.tasks_created).toBe(0)
    expect(body.reason).toContain('still pending')
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('returns 500 if CRON_SECRET not configured', async () => {
    delete process.env.CRON_SECRET
    const res = await POST(makeRequest('anything'))
    expect(res.status).toBe(500)
  })
})
