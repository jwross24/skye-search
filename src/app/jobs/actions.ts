'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/db/supabase-server'

export type VoteDecision = 'interested' | 'not_for_me' | 'save_for_later'

export type DismissTag =
  | 'wrong_field'
  | 'wrong_location'
  | 'too_junior'
  | 'too_senior'
  | 'no_visa_path'
  | 'already_applied'

export async function voteOnJob(
  jobId: string,
  decision: VoteDecision,
  tags: DismissTag[] = [],
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { success: false, error: 'Not authenticated' }

  if (decision === 'interested') {
    // Guard against duplicate applications for the same job
    const { data: existing } = await supabase
      .from('applications')
      .select('id')
      .eq('user_id', user.id)
      .eq('job_id', jobId)
      .limit(1)
      .single()

    if (existing) return { success: true, jobId, decision }

    const { error } = await supabase.from('applications').insert({
      user_id: user.id,
      job_id: jobId,
      kanban_status: 'interested',
    })

    if (error) return { success: false, error: error.message }
  } else {
    // Guard against duplicate votes for the same job
    const { data: existing } = await supabase
      .from('votes')
      .select('id')
      .eq('user_id', user.id)
      .eq('job_id', jobId)
      .limit(1)
      .single()

    if (existing) return { success: true, jobId, decision }

    const { error } = await supabase.from('votes').insert({
      user_id: user.id,
      job_id: jobId,
      decision,
      tags,
    })

    if (error) return { success: false, error: error.message }
  }

  revalidatePath('/jobs')
  revalidatePath('/tracker')

  return { success: true, jobId, decision }
}
