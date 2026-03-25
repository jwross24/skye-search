'use server'

import { revalidatePath } from 'next/cache'

export async function trackJob(jobIndex: number) {
  // Phase 0: seed data is client-side, so tracking is optimistic.
  // When Supabase is wired up, this will:
  //   1. Create an Application record with kanban_status='interested'
  //   2. Revalidate the jobs page to hide tracked jobs
  //   3. Return the application ID for navigation

  // For now, revalidate the path so the UI refreshes
  revalidatePath('/jobs')

  return { success: true, jobIndex }
}
