'use server'

import { revalidatePath } from 'next/cache'

export async function moveApplication(applicationId: string, newStatus: string) {
  // Phase 0: client-side state handles movement.
  // When Supabase is wired up:
  //   UPDATE applications SET kanban_status = newStatus WHERE id = applicationId

  revalidatePath('/tracker')
  return { success: true, applicationId, newStatus }
}

export async function updateApplicationNotes(
  applicationId: string,
  notes: string,
  nextAction: string,
  nextActionDate: string,
) {
  // Phase 0: client-side state handles updates.
  // When Supabase is wired up:
  //   UPDATE applications SET notes = $notes, next_action = $nextAction,
  //     next_action_date = $nextActionDate WHERE id = $applicationId
  void [applicationId, notes, nextAction, nextActionDate]

  revalidatePath('/tracker')
  return { success: true }
}
