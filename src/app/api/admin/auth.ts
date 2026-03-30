import { createClient } from '@/db/supabase-server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

/**
 * Authenticate admin API requests.
 *
 * 1. Verify the caller is logged in (Supabase session cookie)
 * 2. Verify is_admin = true on their users row
 * 3. Return a service-role client that bypasses RLS — admins need to see
 *    ALL user data, not just their own
 *
 * Returns { supabase } or null if unauthorized.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function authenticateAdmin(_req?: Request) {
  // Auth check uses the cookie-based client (respects session)
  const sessionClient = await createClient()
  const { data: { user } } = await sessionClient.auth.getUser()
  if (!user) return null

  // Role check — is_admin lives on the users table, readable via RLS
  const { data: profile } = await sessionClient
    .from('users')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) return null

  // Admin verified — return service-role client that bypasses RLS
  const supabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
  )

  // For queries that need a user_id scope, get the primary user
  // (single-user app; multi-user would accept a user selector)
  const { data: users } = await supabase.from('users').select('id').eq('is_admin', false).limit(1)
  const targetUserId = users?.[0]?.id ?? user.id

  return { supabase, userId: targetUserId }
}
