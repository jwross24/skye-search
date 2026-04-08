'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/db/supabase-server'
import type { DismissTag } from '@/app/jobs/actions'

export async function moveApplication(applicationId: string, newStatus: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { success: false, error: 'Not authenticated' }

  const { error } = await supabase
    .from('applications')
    .update({ kanban_status: newStatus })
    .eq('id', applicationId)
    .eq('user_id', user.id)

  if (error) return { success: false, error: error.message }

  revalidatePath('/tracker')
  return { success: true, applicationId, newStatus }
}

export async function updateApplicationNotes(
  applicationId: string,
  notes: string,
  nextAction: string,
  nextActionDate: string,
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { success: false, error: 'Not authenticated' }

  const { error } = await supabase
    .from('applications')
    .update({
      notes,
      next_action: nextAction || null,
      next_action_date: nextActionDate || null,
    })
    .eq('id', applicationId)
    .eq('user_id', user.id)

  if (error) return { success: false, error: error.message }

  revalidatePath('/tracker')
  return { success: true }
}

export async function captureRejection(applicationId: string, rejectionType: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { success: false, error: 'Not authenticated' }

  const { error } = await supabase
    .from('applications')
    .update({
      kanban_status: 'rejected',
      rejection_type: rejectionType,
      rejected_date: new Date().toISOString().split('T')[0],
    })
    .eq('id', applicationId)
    .eq('user_id', user.id)

  if (error) return { success: false, error: error.message }

  revalidatePath('/tracker')
  return { success: true }
}

export async function uninterestApplication(
  applicationId: string,
  tags: DismissTag[] = [],
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { success: false, error: 'Not authenticated' }

  // Look up the application to get the job_id
  const { data: app } = await supabase
    .from('applications')
    .select('job_id')
    .eq('id', applicationId)
    .eq('user_id', user.id)
    .single()

  if (!app?.job_id) return { success: false, error: 'Application not found' }

  // Delete the application (reverses the "interested" action)
  const { error: deleteError } = await supabase
    .from('applications')
    .delete()
    .eq('id', applicationId)
    .eq('user_id', user.id)

  if (deleteError) return { success: false, error: deleteError.message }

  // Guard against duplicate votes (user may have dismissed from daily picks previously).
  // maybeSingle() is correct here: 0 or 1 rows expected. single() returns PGRST116 on
  // 0 rows which would be silently discarded, masking real errors.
  const { data: existingVote, error: voteCheckError } = await supabase
    .from('votes')
    .select('id')
    .eq('user_id', user.id)
    .eq('job_id', app.job_id)
    .limit(1)
    .maybeSingle()

  if (voteCheckError) return { success: false, error: voteCheckError.message }

  if (!existingVote) {
    // Create a dismiss vote so the job is excluded from future picks
    const { error: voteError } = await supabase.from('votes').insert({
      user_id: user.id,
      job_id: app.job_id,
      decision: 'not_for_me',
      tags,
    })

    if (voteError) return { success: false, error: voteError.message }
  }

  revalidatePath('/tracker')
  revalidatePath('/jobs')
  return { success: true }
}

export async function snoozeApplication(
  applicationId: string,
  days: number = 7,
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const snoozeUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const { error } = await supabase
    .from('applications')
    .update({ snoozed_until: snoozeUntil })
    .eq('id', applicationId)
    .eq('user_id', user.id)

  if (error) return { success: false, error: error.message }
  revalidatePath('/tracker')
  return { success: true }
}

export async function archiveApplication(
  applicationId: string,
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const { error } = await supabase
    .from('applications')
    .update({
      kanban_status: 'withdrawn',
      withdrawn_date: new Date().toISOString().split('T')[0],
      withdrawal_reason: 'ghosted',
    })
    .eq('id', applicationId)
    .eq('user_id', user.id)

  if (error) return { success: false, error: error.message }
  revalidatePath('/tracker')
  return { success: true }
}
