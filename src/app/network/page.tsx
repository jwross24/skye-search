import { redirect } from 'next/navigation'
import { createClient } from '@/db/supabase-server'
import { ContactsList } from '@/components/network/contacts-list'
import type { Contact } from '@/lib/contact-constants'

export default async function NetworkPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: rows } = await supabase
    .from('contacts')
    .select('id, name, affiliation, relationship_type, email, phone, notes, last_contacted, linked_job_ids, created_at')
    .eq('user_id', user.id)
    .order('name', { ascending: true })

  const contacts: Contact[] = (rows ?? []).map((row) => ({
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

  return (
    <div className="min-w-0 w-full px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Network
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          People who can help — and people you can help back
        </p>
      </div>

      <div className="max-w-xl">
        <ContactsList initialContacts={contacts} />
      </div>
    </div>
  )
}
