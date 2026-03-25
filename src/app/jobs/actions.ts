'use server'

import { revalidatePath } from 'next/cache'

export type VoteDecision = 'interested' | 'not_for_me' | 'save_for_later'

export type DismissTag =
  | 'wrong_field'
  | 'wrong_location'
  | 'too_junior'
  | 'too_senior'
  | 'no_visa_path'
  | 'already_applied'

export async function voteOnJob(
  jobIndex: number,
  decision: VoteDecision,
  tags: DismissTag[] = [],
) {
  // Phase 0: optimistic client-side state handles the UI.
  // When Supabase is wired up, this will:
  //   - 'interested': INSERT into applications (kanban_status='interested')
  //   - 'not_for_me': INSERT into votes (decision, tags, timestamp)
  //   - 'save_for_later': INSERT into votes (decision='save', timestamp)
  //   - Revalidate the picks page

  revalidatePath('/jobs')

  return { success: true, jobIndex, decision, tags }
}
