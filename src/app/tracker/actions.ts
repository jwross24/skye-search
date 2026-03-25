'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/db/supabase-server'

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
      // next_action and next_action_date don't exist in schema yet —
      // store in notes until schema is updated
    })
    .eq('id', applicationId)
    .eq('user_id', user.id)

  void [nextAction, nextActionDate] // TODO: add columns to schema

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
