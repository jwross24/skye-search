import { createClient } from '@/db/supabase-server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

/**
 * Authenticate admin API requests.
 * Supports two modes:
 * 1. Supabase session cookie (normal logged-in user)
 * 2. CRON_SECRET bearer token (operators without Supabase accounts)
 *
 * Returns { userId, supabase } or null if unauthorized.
 */
export async function authenticateAdmin(req: Request) {
  // Check bearer token (CRON_SECRET bypass for operators)
  const authHeader = req.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '')
  const cronSecret = process.env.CRON_SECRET

  if (token && cronSecret && token === cronSecret) {
    // Use service role client — token auth bypasses RLS
    const supabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SECRET_KEY!,
    )
    // Get the single user (single-user app)
    const { data: users } = await supabase.from('users').select('id').limit(1)
    const userId = users?.[0]?.id
    if (!userId) return null
    return { userId, supabase }
  }

  // Fall back to Supabase session auth
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  return { userId: user.id, supabase }
}
