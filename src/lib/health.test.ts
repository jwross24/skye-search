import { describe, it, expect } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { runHealthChecks } from './health'

// ─── Helpers ───────────────────────────────────────────────────────────────

/**
 * Chainable thenable that mimics Supabase query builders. Any chained method
 * returns the same chainable object; awaiting it (or calling `.maybeSingle()`)
 * resolves to `resolveValue`.
 */
function chainable(resolveValue: unknown): Record<string, unknown> {
  const obj: Record<string, unknown> = {}
  for (const method of ['eq', 'in', 'lt', 'gt', 'not', 'order', 'limit', 'select', 'single']) {
    obj[method] = () => chainable(resolveValue)
  }
  obj.maybeSingle = () => Promise.resolve(resolveValue)
  obj.then = (resolve: (v: unknown) => void) => resolve(resolveValue)
  return obj
}

interface BuildClientOpts {
  /** Override the value returned by a specific table+condition. */
  users?: { error?: { message: string } | null }
  daily_checkpoint?: unknown
  /** Returned for non-head queries (data: { updated_at }). */
  task_queue_data?: unknown
  /** Returned for head/count queries (count). */
  task_queue_count?: number | null
  discovered_jobs_data?: unknown
  discovered_jobs_count?: number | null
  /** Force a thrown error from a specific table query. */
  throwOn?: 'users' | 'daily_checkpoint' | 'task_queue' | 'discovered_jobs'
}

function buildStubClient(opts: BuildClientOpts = {}): SupabaseClient {
  const from = (table: string) => {
    if (opts.throwOn === table) {
      return {
        select: () => {
          throw new Error('boom')
        },
      }
    }
    switch (table) {
      case 'users':
        return {
          select: () => Promise.resolve({ error: opts.users?.error ?? null }),
        }
      case 'daily_checkpoint':
        return {
          select: () => chainable({ data: opts.daily_checkpoint ?? null }),
        }
      case 'task_queue':
        return {
          select: (_col: string, opts2?: { count?: string; head?: boolean }) => {
            if (opts2?.head) {
              return chainable({ count: opts.task_queue_count ?? 0 })
            }
            return chainable({ data: opts.task_queue_data ?? null })
          },
        }
      case 'discovered_jobs':
        return {
          select: (_col: string, opts2?: { count?: string; head?: boolean }) => {
            if (opts2?.head) {
              return chainable({ count: opts.discovered_jobs_count ?? 0 })
            }
            return chainable({ data: opts.discovered_jobs_data ?? null })
          },
        }
      default:
        return { select: () => chainable({ data: null, error: null }) }
    }
  }
  return { from } as unknown as SupabaseClient
}

// ─── Tests ─────────────────────────────────────────────────────────────────

describe('runHealthChecks', () => {
  it('returns alive without touching Supabase when ready=false', async () => {
    let touched = false
    const client = {
      from: () => {
        touched = true
        return { select: () => Promise.resolve({ error: null }) }
      },
    } as unknown as SupabaseClient

    const report = await runHealthChecks({ ready: false, client })
    expect(report.status).toBe('alive')
    expect(report.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    expect(report.checks).toBeUndefined()
    expect(touched).toBe(false)
  })

  it('returns alive when called with no opts', async () => {
    const report = await runHealthChecks()
    expect(report.status).toBe('alive')
    expect(report.checks).toBeUndefined()
  })

  it('returns ready with status=ready when all 5 checks pass', async () => {
    const now = new Date().toISOString()
    const today = now.split('T')[0]
    const client = buildStubClient({
      users: { error: null },
      daily_checkpoint: { checkpoint_date: today, created_at: now },
      task_queue_data: { updated_at: now },
      task_queue_count: 0,
      discovered_jobs_data: { created_at: now },
      discovered_jobs_count: 5,
    })

    const report = await runHealthChecks({ ready: true, client })
    expect(report.status).toBe('ready')
    expect(report.checks).toBeDefined()
    expect(report.checks!.db.healthy).toBe(true)
    expect(report.checks!.unemployment_cron.healthy).toBe(true)
    expect(report.checks!.queue_worker.healthy).toBe(true)
    expect(report.checks!.exa_pipeline.healthy).toBe(true)
    expect(report.checks!.scoring_pipeline.healthy).toBe(true)
  })

  it('returns degraded when any check is unhealthy', async () => {
    const now = new Date().toISOString()
    const today = now.split('T')[0]
    const client = buildStubClient({
      users: { error: { message: 'connection refused' } }, // db check fails
      daily_checkpoint: { checkpoint_date: today, created_at: now },
      task_queue_data: { updated_at: now },
      task_queue_count: 0,
      discovered_jobs_data: { created_at: now },
      discovered_jobs_count: 0,
    })

    const report = await runHealthChecks({ ready: true, client })
    expect(report.status).toBe('degraded')
    expect(report.checks!.db.healthy).toBe(false)
    expect(report.checks!.db.detail).toBe('connection refused')
  })

  it('detects stale unemployment checkpoint (>50 hours)', async () => {
    const staleTime = new Date(Date.now() - 55 * 60 * 60 * 1000).toISOString()
    const client = buildStubClient({
      users: { error: null },
      daily_checkpoint: { checkpoint_date: '2026-03-28', created_at: staleTime },
      task_queue_data: { updated_at: new Date().toISOString() },
      task_queue_count: 0,
      discovered_jobs_data: { created_at: new Date().toISOString() },
      discovered_jobs_count: 0,
    })

    const report = await runHealthChecks({ ready: true, client })
    expect(report.status).toBe('degraded')
    expect(report.checks!.unemployment_cron.healthy).toBe(false)
    expect(report.checks!.unemployment_cron.stale).toBe(true)
    expect(report.checks!.unemployment_cron.detail).toContain('55h')
  })

  it('treats missing checkpoint as bootstrap (healthy)', async () => {
    const client = buildStubClient({
      users: { error: null },
      daily_checkpoint: null,
      task_queue_data: { updated_at: new Date().toISOString() },
      task_queue_count: 0,
      discovered_jobs_data: { created_at: new Date().toISOString() },
      discovered_jobs_count: 0,
    })

    const report = await runHealthChecks({ ready: true, client })
    expect(report.checks!.unemployment_cron.healthy).toBe(true)
    expect(report.checks!.unemployment_cron.detail).toContain('bootstrap')
  })

  it('detects stale queue worker (>24h pending)', async () => {
    const client = buildStubClient({
      users: { error: null },
      daily_checkpoint: { checkpoint_date: '2026-04-26', created_at: new Date().toISOString() },
      task_queue_data: null,
      task_queue_count: 3,
      discovered_jobs_data: { created_at: new Date().toISOString() },
      discovered_jobs_count: 0,
    })

    const report = await runHealthChecks({ ready: true, client })
    expect(report.checks!.queue_worker.healthy).toBe(false)
    expect(report.checks!.queue_worker.stale).toBe(true)
    expect(report.checks!.queue_worker.detail).toContain('3 tasks')
  })

  it('detects stale Exa pipeline (>8 days)', async () => {
    const staleTime = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
    const client = buildStubClient({
      users: { error: null },
      daily_checkpoint: { checkpoint_date: '2026-04-26', created_at: new Date().toISOString() },
      task_queue_data: { updated_at: new Date().toISOString() },
      task_queue_count: 0,
      discovered_jobs_data: { created_at: staleTime },
      discovered_jobs_count: 0,
    })

    const report = await runHealthChecks({ ready: true, client })
    expect(report.checks!.exa_pipeline.healthy).toBe(false)
    expect(report.checks!.exa_pipeline.stale).toBe(true)
    expect(report.checks!.exa_pipeline.detail).toContain('10d')
  })

  it('treats no Exa discoveries as bootstrap (healthy)', async () => {
    const client = buildStubClient({
      users: { error: null },
      daily_checkpoint: { checkpoint_date: '2026-04-26', created_at: new Date().toISOString() },
      task_queue_data: { updated_at: new Date().toISOString() },
      task_queue_count: 0,
      discovered_jobs_data: null,
      discovered_jobs_count: 0,
    })

    const report = await runHealthChecks({ ready: true, client })
    expect(report.checks!.exa_pipeline.healthy).toBe(true)
    expect(report.checks!.exa_pipeline.detail).toContain('bootstrap')
  })

  it('detects stale scoring pipeline when unscored backlog exists and >26h old', async () => {
    const staleTime = new Date(Date.now() - 30 * 60 * 60 * 1000).toISOString()
    const client = buildStubClient({
      users: { error: null },
      daily_checkpoint: { checkpoint_date: '2026-04-26', created_at: new Date().toISOString() },
      task_queue_data: { updated_at: staleTime },
      task_queue_count: 0,
      discovered_jobs_data: { created_at: new Date().toISOString() },
      discovered_jobs_count: 20,
    })

    const report = await runHealthChecks({ ready: true, client })
    expect(report.checks!.scoring_pipeline.healthy).toBe(false)
    expect(report.checks!.scoring_pipeline.stale).toBe(true)
    expect(report.checks!.scoring_pipeline.detail).toContain('20 unscored')
  })

  it('treats no scoring runs yet as bootstrap (healthy)', async () => {
    const client = buildStubClient({
      users: { error: null },
      daily_checkpoint: { checkpoint_date: '2026-04-26', created_at: new Date().toISOString() },
      task_queue_data: null,
      task_queue_count: 0,
      discovered_jobs_data: { created_at: new Date().toISOString() },
      discovered_jobs_count: 10,
    })

    const report = await runHealthChecks({ ready: true, client })
    expect(report.checks!.scoring_pipeline.healthy).toBe(true)
    expect(report.checks!.scoring_pipeline.detail).toContain('no scoring runs yet')
  })

  it('returns healthy=false with "connection failed" when db query throws', async () => {
    const client = buildStubClient({
      throwOn: 'users',
      daily_checkpoint: { checkpoint_date: '2026-04-26', created_at: new Date().toISOString() },
      task_queue_data: { updated_at: new Date().toISOString() },
      task_queue_count: 0,
      discovered_jobs_data: { created_at: new Date().toISOString() },
      discovered_jobs_count: 0,
    })

    const report = await runHealthChecks({ ready: true, client })
    expect(report.checks!.db.healthy).toBe(false)
    expect(report.checks!.db.detail).toBe('connection failed')
  })

  it('returns healthy=false with "query failed" when checkpoint query throws', async () => {
    const client = buildStubClient({
      users: { error: null },
      throwOn: 'daily_checkpoint',
      task_queue_data: { updated_at: new Date().toISOString() },
      task_queue_count: 0,
      discovered_jobs_data: { created_at: new Date().toISOString() },
      discovered_jobs_count: 0,
    })

    const report = await runHealthChecks({ ready: true, client })
    expect(report.checks!.unemployment_cron.healthy).toBe(false)
    expect(report.checks!.unemployment_cron.detail).toBe('query failed')
  })

  it('includes ISO timestamp in every report', async () => {
    const liveness = await runHealthChecks()
    expect(liveness.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/)

    const client = buildStubClient({
      users: { error: null },
      daily_checkpoint: { checkpoint_date: '2026-04-26', created_at: new Date().toISOString() },
      task_queue_data: { updated_at: new Date().toISOString() },
      task_queue_count: 0,
      discovered_jobs_data: { created_at: new Date().toISOString() },
      discovered_jobs_count: 0,
    })
    const readiness = await runHealthChecks({ ready: true, client })
    expect(readiness.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })
})
