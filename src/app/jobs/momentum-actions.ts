'use server'

import { createClient } from '@/db/supabase-server'

/**
 * Persist a milestone key so it doesn't show again on subsequent loads.
 * Reads the current array, appends the key if missing, and writes back.
 * Fire-and-forget from the client — no revalidation needed (page already
 * shows the milestone; next full load will read the updated column).
 */
export async function markMilestoneSeen(key: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const { data } = await supabase
    .from('users')
    .select('milestones_seen')
    .eq('id', user.id)
    .single()

  const current: string[] = data?.milestones_seen ?? []
  if (current.includes(key)) return

  await supabase
    .from('users')
    .update({ milestones_seen: [...current, key] })
    .eq('id', user.id)
}
