import { createClient } from '@/db/supabase-server'
import { AppSidebar } from './app-sidebar'

/**
 * Server wrapper for AppSidebar — queries unprocessed email count server-side
 * so the sidebar doesn't need client-side Supabase calls (avoids CSP/ad-blocker issues).
 */
export async function AppSidebarServer() {
  let unprocessedEmailCount = 0

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      const { count } = await supabase
        .from('raw_inbound_email')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'unprocessed')

      unprocessedEmailCount = count ?? 0
    }
  } catch {
    // Not authenticated or query failed — badge shows 0
  }

  return <AppSidebar unprocessedEmailCount={unprocessedEmailCount} />
}
