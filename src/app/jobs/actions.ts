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
  | 'deadline_expired'
  | 'requires_citizenship'
  | 'requires_clearance'
  | 'salary_too_low'
  | 'not_remote'

export interface ManualJobInput {
  title: string
  company: string
  url?: string
  location?: string
  visa_path?: 'cap_exempt' | 'cap_subject' | 'opt_compatible' | 'canada' | 'unknown'
  employer_type?: 'university' | 'nonprofit_research' | 'cooperative_institute' | 'government_contractor' | 'government_direct' | 'private_sector' | 'unknown'
  employment_type?: 'full_time' | 'part_time' | 'contract' | 'unknown'
  application_deadline?: string
  notes?: string
}

export async function addManualJob(input: ManualJobInput) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  if (!input.title.trim()) return { success: false, error: 'Title is required' }
  if (!input.company.trim()) return { success: false, error: 'Company is required' }

  // Sanitize URL: strip tracking params
  let cleanUrl = input.url?.trim() || null
  if (cleanUrl) {
    try {
      const parsed = new URL(cleanUrl)
      const trackingParams = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid', 'gclid']
      trackingParams.forEach(p => parsed.searchParams.delete(p))
      cleanUrl = parsed.toString()
    } catch {
      // Not a valid URL — keep as-is
    }
  }

  const { data, error } = await supabase
    .from('jobs')
    .insert({
      user_id: user.id,
      title: input.title.trim(),
      company: input.company.trim(),
      url: cleanUrl,
      location: input.location?.trim() || null,
      visa_path: input.visa_path ?? 'unknown',
      employer_type: input.employer_type ?? 'unknown',
      employment_type: input.employment_type ?? 'full_time',
      application_deadline: input.application_deadline || null,
      source: 'manual',
      source_type: null,
      indexed_date: new Date().toISOString().split('T')[0],
      why_fits: input.notes?.trim() || '',
    })
    .select('id')
    .single()

  if (error) return { success: false, error: error.message }

  revalidatePath('/jobs')
  return { success: true, jobId: data.id }
}

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
