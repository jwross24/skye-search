import { createClient } from '@/db/supabase-server'

/**
 * Authenticate admin API requests.
 *
 * Uses the existing Supabase session + is_admin flag on the users table.
 * No special tokens, no separate auth flows. If you're logged in and
 * is_admin is true, you're in.
 *
 * Returns { userId, supabase } or null if unauthorized.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function authenticateAdmin(_req?: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Check admin role
  const { data: profile } = await supabase
    .from('users')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) return null

  return { userId: user.id, supabase }
}
