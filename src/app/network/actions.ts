'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/db/supabase-server'

import type { Contact } from '@/lib/contact-constants'

// ─── Read ───────────────────────────────────────────────────────────────────

export async function getContacts(options?: {
  search?: string
  relationshipType?: string
}): Promise<Contact[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  let query = supabase
    .from('contacts')
    .select('id, name, affiliation, relationship_type, email, phone, notes, last_contacted, linked_job_ids, created_at')
    .eq('user_id', user.id)
    .order('name', { ascending: true })

  if (options?.relationshipType) {
    query = query.eq('relationship_type', options.relationshipType)
  }

  if (options?.search) {
    // Search name and affiliation with case-insensitive pattern
    query = query.or(`name.ilike.%${options.search}%,affiliation.ilike.%${options.search}%`)
  }

  const { data, error } = await query
  if (error) return []

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    affiliation: row.affiliation,
    relationshipType: row.relationship_type,
    email: row.email,
    phone: row.phone,
    notes: row.notes,
    lastContacted: row.last_contacted,
    linkedJobIds: row.linked_job_ids,
    createdAt: row.created_at,
  }))
}

// ─── Create ─────────────────────────────────────────────────────────────────

export async function addContact(data: {
  name: string
  affiliation?: string
  relationshipType?: string
  email?: string
  phone?: string
  notes?: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  if (!data.name.trim()) return { success: false, error: 'Name is required' }

  const { error } = await supabase
    .from('contacts')
    .insert({
      user_id: user.id,
      name: data.name.trim(),
      affiliation: data.affiliation?.trim() || null,
      relationship_type: data.relationshipType || null,
      email: data.email?.trim() || null,
      phone: data.phone?.trim() || null,
      notes: data.notes?.trim() || null,
    })

  if (error) return { success: false, error: error.message }

  revalidatePath('/network')
  return { success: true }
}

// ─── Update ─────────────────────────────────────────────────────────────────

export async function updateContact(
  contactId: string,
  data: {
    name?: string
    affiliation?: string
    relationshipType?: string
    email?: string
    phone?: string
    notes?: string
  },
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const updates: Record<string, unknown> = {}
  if (data.name !== undefined) updates.name = data.name.trim()
  if (data.affiliation !== undefined) updates.affiliation = data.affiliation.trim() || null
  if (data.relationshipType !== undefined) updates.relationship_type = data.relationshipType || null
  if (data.email !== undefined) updates.email = data.email.trim() || null
  if (data.phone !== undefined) updates.phone = data.phone.trim() || null
  if (data.notes !== undefined) updates.notes = data.notes.trim() || null

  const { error } = await supabase
    .from('contacts')
    .update(updates)
    .eq('id', contactId)
    .eq('user_id', user.id)

  if (error) return { success: false, error: error.message }

  revalidatePath('/network')
  return { success: true }
}

// ─── Delete ─────────────────────────────────────────────────────────────────

export async function deleteContact(contactId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const { error } = await supabase
    .from('contacts')
    .delete()
    .eq('id', contactId)
    .eq('user_id', user.id)

  if (error) return { success: false, error: error.message }

  revalidatePath('/network')
  return { success: true }
}

// ─── LinkedIn CSV Import ────────────────────────────────────────────────────

interface LinkedInRow {
  firstName: string
  lastName: string
  company: string
  position: string
  email: string | null
}

function parseLinkedInCsv(csvText: string): LinkedInRow[] {
  const lines = csvText.split('\n')
  if (lines.length < 2) return []

  // LinkedIn CSV headers: First Name, Last Name, URL, Email Address, Company, Position, Connected On
  const header = lines[0].toLowerCase()
  const cols = header.split(',').map((h) => h.trim().replace(/"/g, ''))

  const firstNameIdx = cols.findIndex((c) => c === 'first name')
  const lastNameIdx = cols.findIndex((c) => c === 'last name')
  const companyIdx = cols.findIndex((c) => c === 'company')
  const positionIdx = cols.findIndex((c) => c === 'position')
  const emailIdx = cols.findIndex((c) => c === 'email address')

  if (firstNameIdx === -1 || lastNameIdx === -1) return []

  const rows: LinkedInRow[] = []
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    // Simple CSV parsing (LinkedIn exports are clean — no embedded commas in quotes typically)
    const fields = line.split(',').map((f) => f.trim().replace(/^"|"$/g, ''))
    const firstName = fields[firstNameIdx] ?? ''
    const lastName = fields[lastNameIdx] ?? ''

    if (!firstName && !lastName) continue

    rows.push({
      firstName,
      lastName,
      company: fields[companyIdx] ?? '',
      position: fields[positionIdx] ?? '',
      email: emailIdx >= 0 ? (fields[emailIdx] || null) : null,
    })
  }

  return rows
}

function fuzzyNameMatch(a: string, b: string): boolean {
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z\s]/g, '').trim()
  const na = normalize(a)
  const nb = normalize(b)
  if (na === nb) return true
  // Check if one name contains the other (handles "Chris Justice" vs "Christopher Justice")
  if (na.includes(nb) || nb.includes(na)) return true
  // Check last name match (most reliable for academic contacts)
  const lastA = na.split(/\s+/).pop() ?? ''
  const lastB = nb.split(/\s+/).pop() ?? ''
  const firstA = na.split(/\s+/)[0] ?? ''
  const firstB = nb.split(/\s+/)[0] ?? ''
  if (lastA === lastB && firstA[0] === firstB[0]) return true
  return false
}

export async function importLinkedInCsv(csvText: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated', imported: 0, duplicates: 0 }

  const rows = parseLinkedInCsv(csvText)
  if (rows.length === 0) return { success: false, error: 'No contacts found in CSV', imported: 0, duplicates: 0 }

  // Fetch existing contacts for dedup
  const { data: existing } = await supabase
    .from('contacts')
    .select('name')
    .eq('user_id', user.id)

  const existingNames = (existing ?? []).map((c) => c.name)

  let imported = 0
  let duplicates = 0
  const missingEmail: string[] = []

  for (const row of rows) {
    const fullName = `${row.firstName} ${row.lastName}`.trim()
    const isDuplicate = existingNames.some((name) => fuzzyNameMatch(name, fullName))

    if (isDuplicate) {
      duplicates++
      continue
    }

    const { error } = await supabase
      .from('contacts')
      .insert({
        user_id: user.id,
        name: fullName,
        affiliation: row.company || null,
        relationship_type: 'conference contact',
        email: row.email,
        notes: row.position ? `Position: ${row.position}` : null,
      })

    if (!error) {
      imported++
      existingNames.push(fullName) // Prevent duplicates within the same import
      if (!row.email) missingEmail.push(fullName)
    }
  }

  revalidatePath('/network')
  return { success: true, imported, duplicates, missingEmail }
}

