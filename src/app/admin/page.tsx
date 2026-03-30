import { redirect } from 'next/navigation'
import { createClient } from '@/db/supabase-server'
import { AdminDashboard } from '@/components/admin/admin-dashboard'

/**
 * Admin dashboard — accessible via:
 * 1. Authenticated user session (any logged-in user for now)
 * 2. Admin token in URL: /admin?token=<CRON_SECRET> (for operators without Supabase accounts)
 *
 * The token bypass uses the same CRON_SECRET used for cron job auth.
 * API routes also accept this token via Authorization header.
 */
export default async function AdminPage(props: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await props.searchParams

  // Check admin token bypass first (for operators without Supabase accounts)
  const cronSecret = process.env.CRON_SECRET
  if (token && cronSecret && token === cronSecret) {
    return <AdminDashboard adminToken={token} />
  }

  // Fall back to Supabase auth
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return <AdminDashboard />
}
