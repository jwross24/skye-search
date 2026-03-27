import { NextResponse } from 'next/server'
import { createClient } from '@/db/supabase-server'

/**
 * GET /api/inbox-count
 *
 * Returns the unprocessed inbound email count for the authenticated user.
 * Lightweight endpoint for the sidebar badge — avoids direct client-side
 * Supabase calls (blocked by ad-blockers due to non-standard port).
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return NextResponse.json({ count: 0 })

    const { count } = await supabase
      .from('raw_inbound_email')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'unprocessed')

    return NextResponse.json({ count: count ?? 0 })
  } catch {
    return NextResponse.json({ count: 0 })
  }
}
