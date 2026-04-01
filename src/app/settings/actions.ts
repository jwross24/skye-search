'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/db/supabase-server'
import type { CvExtraction, UserProfile } from '@/types/cv-extraction'
import { DEFAULT_CAPS } from '@/lib/budget-guard'

/** Deduplicate arrays of objects by a key function */
function deduplicateByKey<T>(
  existing: T[],
  incoming: T[],
  keyFn: (item: T) => string,
): T[] {
  const seen = new Set(existing.map(keyFn))
  const merged = [...existing]
  for (const item of incoming) {
    const key = keyFn(item)
    if (!seen.has(key)) {
      merged.push(item)
      seen.add(key)
    }
  }
  return merged
}

/** Deduplicate arrays of objects by their `title` field (case-insensitive) */
function deduplicateByTitle<T extends { title: string }>(
  existing: T[],
  incoming: T[],
): T[] {
  return deduplicateByKey(existing, incoming, e => e.title.toLowerCase())
}

const ALLOWED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]
const MAX_SIZE = 10 * 1024 * 1024 // 10MB

export async function uploadCv(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const file = formData.get('cv') as File | null
  if (!file) return { success: false, error: 'No file provided' }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return { success: false, error: 'Only PDF and DOCX files are accepted' }
  }
  if (file.size > MAX_SIZE) {
    return { success: false, error: 'File must be under 10MB' }
  }

  const ext = file.type === 'application/pdf' ? 'pdf' : 'docx'
  const filePath = `${user.id}/cv_${Date.now()}.${ext}`

  // Upload to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from('cv-uploads')
    .upload(filePath, file, { contentType: file.type })

  if (uploadError) {
    return { success: false, error: `Upload failed: ${uploadError.message}` }
  }

  // Create documents row
  const { data: doc, error: docError } = await supabase
    .from('documents')
    .insert({
      user_id: user.id,
      type: 'cv',
      file_path: filePath,
      generation_source: 'user_upload',
      status: 'draft',
      is_master: true,
    })
    .select('id')
    .single()

  if (docError) {
    return { success: false, error: `Document record failed: ${docError.message}` }
  }

  // Extraction is triggered client-side via supabase.functions.invoke('extract-cv').
  // Task queue fallback deferred until extract_cv handler exists in queue-worker.

  revalidatePath('/settings')
  return { success: true, documentId: doc.id, filePath }
}

export async function saveExtractedProfile(extraction: CvExtraction, documentId?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  // Fetch current profile
  const { data: current, error: fetchError } = await supabase
    .from('users')
    .select('profile, skills')
    .eq('id', user.id)
    .single()

  if (fetchError) return { success: false, error: fetchError.message }

  const currentProfile = (current.profile ?? {}) as UserProfile
  const currentSkills = (current.skills ?? []) as string[]

  // Merge profile: only overwrite empty/default fields, union arrays
  const mergedProfile: UserProfile = {
    ...currentProfile,
    // Only set if not already present
    ...(!currentProfile.name && extraction.name ? { name: extraction.name } : {}),
    ...(!currentProfile.field && extraction.field ? { field: extraction.field } : {}),
    // Union arrays (deduplicate by title/value)
    research_areas: [...new Set([
      ...(currentProfile.research_areas ?? []),
      ...extraction.research_areas,
    ])],
    publications: deduplicateByTitle(
      currentProfile.publications ?? [],
      extraction.publications,
    ),
    education: deduplicateByKey(
      currentProfile.education ?? [],
      extraction.education,
      e => `${e.degree}|${e.institution}`.toLowerCase(),
    ),
    employment_history: deduplicateByKey(
      currentProfile.employment_history ?? [],
      extraction.employment_history,
      e => `${e.title}|${e.organization}`.toLowerCase(),
    ),
  }

  // Merge skills: union with case-insensitive dedup
  const existingLower = new Set(currentSkills.map(s => s.toLowerCase()))
  const newSkills = extraction.skills.filter(s => !existingLower.has(s.toLowerCase()))
  const mergedSkills = [...currentSkills, ...newSkills]

  const { error: updateError } = await supabase
    .from('users')
    .update({ profile: mergedProfile, skills: mergedSkills })
    .eq('id', user.id)

  if (updateError) return { success: false, error: updateError.message }

  // Mark document as approved (clears "review pending" status in UI)
  if (documentId) {
    const { error: approveError } = await supabase
      .from('documents')
      .update({ status: 'approved' })
      .eq('id', documentId)
      .eq('user_id', user.id)
    if (approveError) {
      console.error('Failed to mark document as approved:', approveError.message)
      // Non-fatal: profile was saved successfully; UI will re-check on next load
    }
  }

  revalidatePath('/settings')
  return { success: true }
}

export async function updateBudgetCaps(caps: {
  dailyCapCents: number
  weeklyCapCents: number
  weeklyAlertCents: number
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const { data: current } = await supabase
    .from('users')
    .select('user_preferences')
    .eq('id', user.id)
    .single()

  const prefs = (current?.user_preferences ?? {}) as Record<string, unknown>

  const { error } = await supabase
    .from('users')
    .update({
      user_preferences: {
        ...prefs,
        budget: {
          daily_cap_cents: caps.dailyCapCents,
          weekly_soft_cap_cents: caps.weeklyCapCents,
          weekly_alert_threshold_cents: caps.weeklyAlertCents,
          pause_buffer_cents: DEFAULT_CAPS.pause_buffer_cents,
        },
      },
    })
    .eq('id', user.id)

  if (error) return { success: false, error: error.message }
  revalidatePath('/settings')
  return { success: true }
}

export async function addSkill(skill: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const trimmed = skill.trim()
  if (!trimmed) return { success: false, error: 'Skill cannot be empty' }
  if (trimmed.length > 100) return { success: false, error: 'Skill name too long' }

  const { data: current } = await supabase
    .from('users')
    .select('skills')
    .eq('id', user.id)
    .single()

  const currentSkills = (current?.skills ?? []) as string[]
  if (currentSkills.some(s => s.toLowerCase() === trimmed.toLowerCase())) {
    return { success: false, error: 'Skill already tracked' }
  }

  const { error } = await supabase
    .from('users')
    .update({ skills: [...currentSkills, trimmed] })
    .eq('id', user.id)

  if (error) return { success: false, error: error.message }
  revalidatePath('/settings')
  return { success: true }
}

export async function removeSkill(skill: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const { data: current } = await supabase
    .from('users')
    .select('skills')
    .eq('id', user.id)
    .single()

  const currentSkills = (current?.skills ?? []) as string[]
  const updated = currentSkills.filter(s => s.toLowerCase() !== skill.toLowerCase())

  const { error } = await supabase
    .from('users')
    .update({ skills: updated })
    .eq('id', user.id)

  if (error) return { success: false, error: error.message }
  revalidatePath('/settings')
  return { success: true }
}

export async function getUserProfile() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('users')
    .select('profile, skills')
    .eq('id', user.id)
    .single()

  // Get latest CV document if any
  const { data: latestCv } = await supabase
    .from('documents')
    .select('id, file_path, structured_data_json, status, created_at')
    .eq('user_id', user.id)
    .eq('type', 'cv')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  return {
    profile: (data?.profile ?? {}) as Record<string, unknown>,
    skills: (data?.skills ?? []) as string[],
    latestCv: latestCv ?? null,
  }
}

export async function activateBreakMode(days: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  // Enforce max 7 days
  const safeDays = Math.min(Math.max(1, Math.round(days)), 7)
  const until = new Date()
  until.setDate(until.getDate() + safeDays)

  const { error } = await supabase
    .from('users')
    .update({ break_mode_until: until.toISOString() })
    .eq('id', user.id)

  if (error) return { success: false, error: error.message }

  revalidatePath('/settings')
  revalidatePath('/jobs')
  return { success: true, breakModeUntil: until.toISOString() }
}

export async function deactivateBreakMode() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const { error } = await supabase
    .from('users')
    .update({ break_mode_until: null })
    .eq('id', user.id)

  if (error) return { success: false, error: error.message }

  revalidatePath('/settings')
  revalidatePath('/jobs')
  return { success: true }
}
