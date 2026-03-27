import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * GET /api/health
 *
 * Liveness probe — no auth, no external deps. Proves:
 * 1. Next.js API routes are reachable (not redirected by proxy)
 * 2. The process is alive and can handle requests
 *
 * For deeper checks (DB, services), use GET /api/health?ready=true
 */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const checkReady = url.searchParams.get('ready') === 'true'

  // Liveness: always returns 200 if we got here
  if (!checkReady) {
    return NextResponse.json({ status: 'alive', timestamp: new Date().toISOString() })
  }

  // Readiness: check external dependencies
  const checks: Record<string, boolean> = {
    api_reachable: true,
    db_connected: false,
  }

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SECRET_KEY!,
    )
    const { error } = await supabase.from('users').select('id', { count: 'exact', head: true })
    checks.db_connected = !error
  } catch {
    checks.db_connected = false
  }

  const allHealthy = Object.values(checks).every(Boolean)

  return NextResponse.json(
    { status: allHealthy ? 'ready' : 'degraded', checks, timestamp: new Date().toISOString() },
    { status: allHealthy ? 200 : 503 },
  )
}
