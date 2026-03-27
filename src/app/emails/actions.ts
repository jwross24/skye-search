'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/db/supabase-server'

export type EmailClassification = 'job_alert' | 'application_update' | 'ignore'

export async function classifyEmail(
  emailId: string,
  classification: EmailClassification,
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { success: false, error: 'Not authenticated' }

  // Phase 0: store triage result only (unprocessed → classified | ignored).
  // The specific classification type (job_alert vs application_update) is not
  // persisted — Phase 1b smart routing (bead nob) will add proper categories.
  const newStatus = classification === 'ignore' ? 'ignored' : 'classified'

  const { error } = await supabase
    .from('raw_inbound_email')
    .update({ status: newStatus })
    .eq('id', emailId)
    .eq('user_id', user.id)

  if (error) return { success: false, error: error.message }

  revalidatePath('/emails')
  return { success: true }
}
