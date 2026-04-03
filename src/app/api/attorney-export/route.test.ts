import { describe, it, expect, vi, beforeEach } from 'vitest'

function log(step: string, detail: string) {
  process.stdout.write(`  [attorney-export] ${step}: ${detail}\n`)
}

// ─── Mock auth ─────────────────────────────────────────────────────────────

vi.mock('@/db/supabase-server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabase)),
}))

function chainable(result: unknown) {
  return new Proxy({} as Record<string, unknown>, {
    get(_, prop) {
      if (prop === 'then') return (r: (v: unknown) => void) => Promise.resolve(result).then(r)
      return () => chainable(result)
    },
  })
}

const mockSupabase = {
  auth: {
    getUser: vi.fn(() => Promise.resolve({ data: { user: { id: 'user-1' } } })),
  },
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  from: vi.fn((_table: string) => chainable({ data: [], count: 0 })),
}

beforeEach(() => {
  vi.clearAllMocks()
  mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
})

describe('GET /api/attorney-export', () => {
  it('[attorney-export] returns 401 when not authenticated', async () => {
    mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: null as unknown as { id: string } } })

    const { GET } = await import('./route')
    const res = await GET()

    expect(res.status).toBe(401)
    log('auth', 'Rejected: unauthenticated user')
  })

  it('[attorney-export] returns JSON with all required sections', async () => {
    const { GET } = await import('./route')
    const res = await GET()

    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Disposition')).toContain('attorney-export')
    expect(res.headers.get('Content-Type')).toContain('application/json')

    const body = JSON.parse(await res.text())
    expect(body.export_metadata).toBeDefined()
    expect(body.immigration_dates).toBeDefined()
    expect(body.unemployment_log).toBeDefined()
    expect(body.employment_periods).toBeDefined()
    expect(body.checkpoint_corrections).toBeDefined()
    expect(body.application_history).toBeDefined()
    expect(body.weekly_activity_summary).toBeDefined()
    log('sections', 'All 7 sections present in export')
  })

  it('[attorney-export] export_metadata includes source label key', async () => {
    const { GET } = await import('./route')
    const res = await GET()
    const body = JSON.parse(await res.text())

    expect(body.export_metadata.source_label_key).toBeDefined()
    expect(body.export_metadata.source_label_key['DSO-confirmed']).toBeTruthy()
    expect(body.export_metadata.source_label_key['user-reported']).toBeTruthy()
    expect(body.export_metadata.source_label_key['system-calculated']).toBeTruthy()
    expect(body.export_metadata.disclaimer).toContain('not immigration legal advice')
    log('metadata', 'Source labels and disclaimer present')
  })

  it('[attorney-export] unemployment_log entries ordered chronologically', async () => {
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'daily_checkpoint') {
        return chainable({
          data: [
            { checkpoint_date: '2026-04-12', status_snapshot: 'unemployed', unemployment_days_used_cumulative: 1, trigger_source: 'pg_cron', evidence_notes: null },
            { checkpoint_date: '2026-04-13', status_snapshot: 'unemployed', unemployment_days_used_cumulative: 2, trigger_source: 'pg_cron', evidence_notes: null },
            { checkpoint_date: '2026-04-14', status_snapshot: 'employed_bridge', unemployment_days_used_cumulative: 2, trigger_source: 'pg_cron', evidence_notes: 'manual_toggle' },
          ],
        })
      }
      if (table === 'immigration_status') {
        return chainable({ data: { postdoc_end_date: '2026-04-11', initial_days_source: 'dso_confirmed' } })
      }
      return chainable({ data: [], count: 0 })
    })

    const { GET } = await import('./route')
    const res = await GET()
    const body = JSON.parse(await res.text())

    expect(body.unemployment_log).toHaveLength(3)
    expect(body.unemployment_log[0].date).toBe('2026-04-12')
    expect(body.unemployment_log[1].date).toBe('2026-04-13')
    expect(body.unemployment_log[2].date).toBe('2026-04-14')
    expect(body.unemployment_log[2].effective_status).toBe('employed_bridge')
    log('unemployment_log', `${body.unemployment_log.length} entries, chronological order confirmed`)
  })

  it('[attorney-export] checkpoint_corrections reflected with original + corrected status', async () => {
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'daily_checkpoint') {
        return chainable({
          data: [
            { checkpoint_date: '2026-04-12', status_snapshot: 'unemployed', unemployment_days_used_cumulative: 1, trigger_source: 'pg_cron', evidence_notes: null },
          ],
        })
      }
      if (table === 'checkpoint_corrections') {
        return chainable({
          data: [
            { checkpoint_date: '2026-04-12', original_status: 'unemployed', corrected_status: 'employed_postdoc', trigger_source: 'postdoc_extension_backfill', created_at: '2026-04-15T00:00:00Z' },
          ],
        })
      }
      if (table === 'immigration_status') {
        return chainable({ data: { postdoc_end_date: '2026-04-11' } })
      }
      return chainable({ data: [], count: 0 })
    })

    const { GET } = await import('./route')
    const res = await GET()
    const body = JSON.parse(await res.text())

    // Unemployment log shows both original and corrected
    expect(body.unemployment_log[0].status).toBe('unemployed')
    expect(body.unemployment_log[0].corrected_status).toBe('employed_postdoc')
    expect(body.unemployment_log[0].effective_status).toBe('employed_postdoc')
    expect(body.unemployment_log[0].correction_reason).toBe('postdoc_extension_backfill')

    // Correction log section
    expect(body.checkpoint_corrections).toHaveLength(1)
    expect(body.checkpoint_corrections[0].original_status).toBe('unemployed')
    expect(body.checkpoint_corrections[0].corrected_status).toBe('employed_postdoc')
    log('corrections', 'Original + corrected status shown together')
  })

  it('[attorney-export] handles empty data gracefully (new user)', async () => {
    mockSupabase.from.mockReturnValue(chainable({ data: null, count: 0 }))

    const { GET } = await import('./route')
    const res = await GET()
    const body = JSON.parse(await res.text())

    expect(body.unemployment_log).toEqual([])
    expect(body.employment_periods).toEqual([])
    expect(body.application_history).toEqual([])
    expect(body.weekly_activity_summary).toEqual([])
    expect(body.immigration_dates).toBeNull()
    log('empty-state', 'Empty export generates cleanly with no errors')
  })

  it('[attorney-export] source labels on immigration dates', async () => {
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'immigration_status') {
        return chainable({
          data: {
            visa_type: 'F-1 STEM OPT',
            opt_expiry: '2026-08-15',
            postdoc_end_date: '2026-04-11',
            initial_days_used: 31,
            initial_days_source: 'dso_confirmed',
            calibration_date: '2026-03-15',
            employment_active: false,
            niw_status: 'filed',
            niw_filing_date: '2025-06-01',
            i140_status: 'filed',
            i485_status: 'not_filed',
          },
        })
      }
      return chainable({ data: [], count: 0 })
    })

    const { GET } = await import('./route')
    const res = await GET()
    const body = JSON.parse(await res.text())

    expect(body.immigration_dates.initial_days_used.source).toBe('DSO-confirmed')
    expect(body.immigration_dates.calibration_date.source).toBe('DSO-confirmed')
    expect(body.immigration_dates.postdoc_end_date.source).toBe('user-reported')
    expect(body.immigration_dates.niw_filing_date.source).toBe('user-reported')
    log('source-labels', 'DSO-confirmed and user-reported labels correctly applied')
  })
})
