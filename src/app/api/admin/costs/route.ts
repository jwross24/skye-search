import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/db/supabase-server'

/**
 * GET /api/admin/costs?range=30d
 *
 * API cost breakdown by day and task type.
 */
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const range = new URL(req.url).searchParams.get('range') ?? '30d'
  const days = range === '7d' ? 7 : range === '14d' ? 14 : 30
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

  const { data: logs } = await supabase
    .from('api_usage_log')
    .select('model, task_type, estimated_cost_cents, input_tokens, output_tokens, created_at')
    .eq('user_id', user.id)
    .gte('created_at', since)
    .order('created_at', { ascending: true })

  // Aggregate by day
  const dailyCosts: Record<string, Record<string, number>> = {}
  let totalCostCents = 0
  let totalInputTokens = 0
  let totalOutputTokens = 0

  for (const log of logs ?? []) {
    const day = log.created_at.split('T')[0]
    const taskType = log.task_type ?? log.model ?? 'unknown'
    if (!dailyCosts[day]) dailyCosts[day] = {}
    dailyCosts[day][taskType] = (dailyCosts[day][taskType] ?? 0) + (log.estimated_cost_cents ?? 0)
    totalCostCents += log.estimated_cost_cents ?? 0
    totalInputTokens += log.input_tokens ?? 0
    totalOutputTokens += log.output_tokens ?? 0
  }

  // Per-model breakdown
  const modelBreakdown: Record<string, { cost: number; calls: number }> = {}
  for (const log of logs ?? []) {
    const model = log.model ?? 'unknown'
    if (!modelBreakdown[model]) modelBreakdown[model] = { cost: 0, calls: 0 }
    modelBreakdown[model].cost += log.estimated_cost_cents ?? 0
    modelBreakdown[model].calls++
  }

  // Budget caps
  const todayStart = new Date().toISOString().split('T')[0]
  const todayCost = Object.values(dailyCosts[todayStart] ?? {}).reduce((a, b) => a + b, 0)
  const weekStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  let weeklyCost = 0
  for (const [day, costs] of Object.entries(dailyCosts)) {
    if (day >= weekStart) {
      weeklyCost += Object.values(costs).reduce((a, b) => a + b, 0)
    }
  }

  return NextResponse.json({
    dailyCosts,
    totalCostCents,
    totalInputTokens,
    totalOutputTokens,
    modelBreakdown,
    budget: {
      dailyCostCents: todayCost,
      dailyCapCents: 300,
      weeklyCostCents: weeklyCost,
      weeklyCapCents: 1200,
    },
    range: days,
  })
}
