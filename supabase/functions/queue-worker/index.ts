/// <reference lib="deno.ns" />
import { getSupabaseAdmin } from '../_shared/supabase-admin.ts'
import { createTaskQueueDb } from '../_shared/task-queue-db.ts'
import { processTaskBatch } from '../_shared/worker.ts'

// Import handler registrations here as downstream beads add them:
// import '../_shared/handlers/tailor-docs.ts'
// import '../_shared/handlers/ai-scoring.ts'

const CRON_SECRET = Deno.env.get('CRON_SECRET')

Deno.serve(async (req) => {
  // Auth: verify Bearer token matches CRON_SECRET
  if (!CRON_SECRET) {
    return new Response(
      JSON.stringify({ error: 'CRON_SECRET not configured' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    )
  }

  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (token !== CRON_SECRET) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } },
    )
  }

  try {
    // Parse optional batch size from body
    let batchSize = 10
    try {
      const body = await req.json()
      if (body?.batchSize && typeof body.batchSize === 'number') {
        batchSize = Math.min(body.batchSize, 50)
      }
    } catch {
      // No body or invalid JSON — use default
    }

    const supabase = getSupabaseAdmin()
    const db = createTaskQueueDb(supabase)
    const result = await processTaskBatch(db, batchSize)

    return new Response(
      JSON.stringify({ ok: true, summary: result }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return new Response(
      JSON.stringify({ ok: false, error: message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    )
  }
})
