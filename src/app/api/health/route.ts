import { NextResponse } from 'next/server'
import { runHealthChecks } from '@/lib/health'

/**
 * GET /api/health
 *
 * Liveness probe — no auth, no external deps. Proves:
 * 1. Next.js API routes are reachable (not redirected by proxy)
 * 2. The process is alive and can handle requests
 *
 * For deeper checks (DB, cron health, pipeline staleness), use GET /api/health?ready=true
 *
 * Implementation lives in `src/lib/health.ts` so the cron healthcheck can call
 * it in-process (avoiding outbound HTTP through Vercel Deployment Protection).
 */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const ready = url.searchParams.get('ready') === 'true'
  const report = await runHealthChecks({ ready })
  const httpStatus = report.status === 'degraded' ? 503 : 200
  return NextResponse.json(report, { status: httpStatus })
}
