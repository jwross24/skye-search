import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock the checkpoint DB and runner before imports
vi.mock('@/db/checkpoint-db-supabase', () => ({
  createCheckpointDbSupabase: vi.fn(),
}))

vi.mock('@/db/unemployment-cron', () => ({
  runDailyCheckpoint: vi.fn(),
}))

import { POST } from './route'
import { createCheckpointDbSupabase } from '@/db/checkpoint-db-supabase'
import { runDailyCheckpoint } from '@/db/unemployment-cron'
import type { CheckpointResult } from '@/db/unemployment-cron'

const CRON_SECRET = 'test-cron-secret-123'

function makeRequest(options: {
  secret?: string
  body?: Record<string, unknown>
} = {}) {
  const headers = new Headers()
  if (options.secret) {
    headers.set('authorization', `Bearer ${options.secret}`)
  }

  return new NextRequest('http://localhost:3000/api/cron/unemployment', {
    method: 'POST',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  })
}

describe('POST /api/cron/unemployment', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    process.env.CRON_SECRET = CRON_SECRET
  })

  it('returns 401 without authorization header', async () => {
    const res = await POST(makeRequest())
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBe('Unauthorized')
  })

  it('returns 401 with wrong secret', async () => {
    const res = await POST(makeRequest({ secret: 'wrong-secret' }))
    expect(res.status).toBe(401)
  })

  it('returns 500 if CRON_SECRET is not configured', async () => {
    delete process.env.CRON_SECRET
    const res = await POST(makeRequest({ secret: 'anything' }))
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toBe('CRON_SECRET not configured')
  })

  it('returns 200 with valid secret and runs checkpoint', async () => {
    const mockResult: CheckpointResult = {
      userId: 'user-1',
      targetDate: '2026-03-25',
      action: 'checkpoint_created',
      statusSnapshot: 'unemployed',
      cumulative: 32,
      daysBefore: 31,
      employmentActive: false,
      gapDates: [],
    }

    vi.mocked(createCheckpointDbSupabase).mockReturnValue({} as ReturnType<typeof createCheckpointDbSupabase>)
    vi.mocked(runDailyCheckpoint).mockResolvedValue([mockResult])

    const res = await POST(makeRequest({ secret: CRON_SECRET }))
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.summary.processed).toBe(1)
    expect(body.summary.created).toBe(1)
    expect(body.summary.skipped).toBe(0)
    expect(body.summary.errors).toBe(0)
    expect(body.results).toHaveLength(1)
    expect(body.results[0].action).toBe('checkpoint_created')
  })

  it('passes userId and targetDate from request body', async () => {
    vi.mocked(createCheckpointDbSupabase).mockReturnValue({} as ReturnType<typeof createCheckpointDbSupabase>)
    vi.mocked(runDailyCheckpoint).mockResolvedValue([])

    await POST(makeRequest({
      secret: CRON_SECRET,
      body: { userId: 'user-42', targetDate: '2026-03-20', triggerSource: 'manual_backfill' },
    }))

    expect(runDailyCheckpoint).toHaveBeenCalledWith(
      expect.anything(),
      {
        userId: 'user-42',
        targetDate: '2026-03-20',
        triggerSource: 'manual_backfill',
      },
    )
  })

  it('returns summary with alerts when critical threshold reached', async () => {
    const mockResult: CheckpointResult = {
      userId: 'user-1',
      targetDate: '2026-03-25',
      action: 'checkpoint_created',
      statusSnapshot: 'unemployed',
      cumulative: 150,
      daysBefore: 149,
      alert: 'CRITICAL_150',
    }

    vi.mocked(createCheckpointDbSupabase).mockReturnValue({} as ReturnType<typeof createCheckpointDbSupabase>)
    vi.mocked(runDailyCheckpoint).mockResolvedValue([mockResult])

    const res = await POST(makeRequest({ secret: CRON_SECRET }))
    const body = await res.json()

    expect(body.summary.alerts).toEqual([
      { userId: 'user-1', alert: 'CRITICAL_150' },
    ])
  })

  it('returns 500 when checkpoint execution throws', async () => {
    vi.mocked(createCheckpointDbSupabase).mockReturnValue({} as ReturnType<typeof createCheckpointDbSupabase>)
    vi.mocked(runDailyCheckpoint).mockRejectedValue(new Error('DB connection failed'))

    const res = await POST(makeRequest({ secret: CRON_SECRET }))
    expect(res.status).toBe(500)

    const body = await res.json()
    expect(body.error).toBe('Checkpoint execution failed')
    expect(body.message).toBe('DB connection failed')
  })

  it('handles empty request body gracefully', async () => {
    vi.mocked(createCheckpointDbSupabase).mockReturnValue({} as ReturnType<typeof createCheckpointDbSupabase>)
    vi.mocked(runDailyCheckpoint).mockResolvedValue([])

    const req = new NextRequest('http://localhost:3000/api/cron/unemployment', {
      method: 'POST',
      headers: { authorization: `Bearer ${CRON_SECRET}` },
    })

    const res = await POST(req)
    expect(res.status).toBe(200)

    expect(runDailyCheckpoint).toHaveBeenCalledWith(
      expect.anything(),
      { userId: undefined, targetDate: undefined, triggerSource: 'keepalive_gha' },
    )
  })

  it('handles idempotent skip results in summary', async () => {
    const results: CheckpointResult[] = [
      { userId: 'user-1', targetDate: '2026-03-25', action: 'skip_idempotent' },
      { userId: 'user-2', targetDate: '2026-03-25', action: 'checkpoint_created', statusSnapshot: 'unemployed', cumulative: 10 },
    ]

    vi.mocked(createCheckpointDbSupabase).mockReturnValue({} as ReturnType<typeof createCheckpointDbSupabase>)
    vi.mocked(runDailyCheckpoint).mockResolvedValue(results)

    const res = await POST(makeRequest({ secret: CRON_SECRET }))
    const body = await res.json()

    expect(body.summary.processed).toBe(2)
    expect(body.summary.created).toBe(1)
    expect(body.summary.skipped).toBe(1)
  })
})
