'use client'

import { useState, useMemo, useCallback } from 'react'
import { Search, Plus, Upload, UserPlus, X, Trash2, Mail, Building2 } from 'lucide-react'
import {
  addContact,
  updateContact,
  deleteContact,
  importLinkedInCsv,
} from '@/app/network/actions'
import { RELATIONSHIP_TYPES, type Contact } from '@/lib/contact-constants'

// ─── Relationship Badge ─────────────────────────────────────────────────────

const BADGE_STYLES: Record<string, string> = {
  'co-author': 'bg-ocean/10 text-ocean',
  'advisor': 'bg-jade/10 text-jade',
  'conference contact': 'bg-muted text-muted-foreground',
  'referral': 'bg-amber-warm/10 text-amber-warm',
  'O-1A recommender': 'bg-violet-500/10 text-violet-500',
  'colleague': 'bg-muted text-muted-foreground',
  'recruiter': 'bg-muted text-muted-foreground',
  'other': 'bg-muted text-muted-foreground',
}

function RelationshipBadge({ type }: { type: string | null }) {
  if (!type) return null
  const style = BADGE_STYLES[type] ?? BADGE_STYLES.other
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${style}`}>
      {type}
    </span>
  )
}

// ─── Contact Card ───────────────────────────────────────────────────────────

function ContactCard({
  contact,
  onUpdate,
  onDelete,
}: {
  contact: Contact
  onUpdate: (id: string, data: Partial<Contact>) => void
  onDelete: (id: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [notes, setNotes] = useState(contact.notes ?? '')

  const handleSaveNotes = () => {
    if (notes !== (contact.notes ?? '')) {
      onUpdate(contact.id, { notes })
    }
    setEditing(false)
  }

  return (
    <div
      className="py-3 group"
      data-testid={`contact-${contact.id}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-foreground">
              {contact.name}
            </p>
            <RelationshipBadge type={contact.relationshipType} />
          </div>
          {contact.affiliation && (
            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
              <Building2 className="size-3 flex-shrink-0" />
              {contact.affiliation}
            </p>
          )}
          {contact.email && (
            <a
              href={`mailto:${contact.email}`}
              className="text-xs text-ocean hover:text-ocean-deep mt-0.5 flex items-center gap-1"
            >
              <Mail className="size-3 flex-shrink-0" />
              {contact.email}
            </a>
          )}
        </div>
        <button
          type="button"
          onClick={() => onDelete(contact.id)}
          className="opacity-0 group-hover:opacity-100 p-1 rounded text-muted-foreground/40 hover:text-red-400 transition-opacity"
          aria-label={`Remove ${contact.name}`}
          data-testid={`delete-${contact.id}`}
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
      {/* Notes — inline edit */}
      {(contact.notes || editing) && (
        <div className="mt-1.5">
          {editing ? (
            <div className="flex gap-1.5">
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                onBlur={handleSaveNotes}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveNotes()}
                className="flex-1 text-xs bg-transparent border border-border/50 rounded px-2 py-1 focus:border-ocean focus:outline-none"
                aria-label="Edit notes"
                autoFocus
              />
            </div>
          ) : (
            <p
              className="text-xs text-muted-foreground/70 cursor-pointer hover:text-muted-foreground"
              onClick={() => setEditing(true)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && setEditing(true)}
            >
              {contact.notes}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Add Contact Form ───────────────────────────────────────────────────────

function AddContactForm({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('')
  const [affiliation, setAffiliation] = useState('')
  const [email, setEmail] = useState('')
  const [relationshipType, setRelationshipType] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    await addContact({ name, affiliation, email, relationshipType, notes })
    setSaving(false)
    onClose()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 py-3 border-t border-border/50" data-testid="add-contact-form">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-foreground">New contact</p>
        <button type="button" onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground">
          <X className="size-3.5" />
        </button>
      </div>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Name"
        required
        className="w-full text-sm bg-transparent border border-border/50 rounded-lg px-3 py-1.5 focus:border-ocean focus:outline-none focus:ring-1 focus:ring-ocean/20"
        data-testid="add-contact-name"
      />
      <input
        type="text"
        value={affiliation}
        onChange={(e) => setAffiliation(e.target.value)}
        placeholder="Affiliation (e.g. NASA Goddard)"
        className="w-full text-sm bg-transparent border border-border/50 rounded-lg px-3 py-1.5 focus:border-ocean focus:outline-none focus:ring-1 focus:ring-ocean/20"
        data-testid="add-contact-affiliation"
      />
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        className="w-full text-sm bg-transparent border border-border/50 rounded-lg px-3 py-1.5 focus:border-ocean focus:outline-none focus:ring-1 focus:ring-ocean/20"
        data-testid="add-contact-email"
      />
      <select
        value={relationshipType}
        onChange={(e) => setRelationshipType(e.target.value)}
        className="w-full text-sm bg-transparent border border-border/50 rounded-lg px-3 py-1.5 focus:border-ocean focus:outline-none focus:ring-1 focus:ring-ocean/20"
        data-testid="add-contact-relationship"
      >
        <option value="">Relationship type</option>
        {RELATIONSHIP_TYPES.map((type) => (
          <option key={type} value={type}>{type}</option>
        ))}
      </select>
      <input
        type="text"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Notes"
        className="w-full text-sm bg-transparent border border-border/50 rounded-lg px-3 py-1.5 focus:border-ocean focus:outline-none focus:ring-1 focus:ring-ocean/20"
        data-testid="add-contact-notes"
      />
      <button
        type="submit"
        disabled={saving || !name.trim()}
        className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-ocean/10 text-ocean hover:bg-ocean/20 transition-colors text-sm font-medium disabled:opacity-50"
        data-testid="add-contact-submit"
      >
        <UserPlus className="size-4" />
        {saving ? 'Adding...' : 'Add Contact'}
      </button>
    </form>
  )
}

// ─── CSV Import ─────────────────────────────────────────────────────────────

function CsvImport() {
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<{ imported: number; duplicates: number; missingEmail: string[] } | null>(null)
  const [importError, setImportError] = useState<string | null>(null)

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    setImportError(null)
    setResult(null)
    const text = await file.text()
    const res = await importLinkedInCsv(text)
    if (res.success) {
      setResult({ imported: res.imported, duplicates: res.duplicates, missingEmail: res.missingEmail ?? [] })
    } else {
      setImportError(res.error ?? 'Import failed')
    }
    setImporting(false)
    // Reset input
    e.target.value = ''
  }

  return (
    <div className="mt-2">
      <label
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
        data-testid="csv-import-label"
      >
        <Upload className="size-3" />
        {importing ? 'Importing...' : 'Import from LinkedIn CSV'}
        <input
          type="file"
          accept=".csv"
          onChange={handleFile}
          className="hidden"
          data-testid="csv-import-input"
        />
      </label>
      {result && (
        <p className="text-xs text-muted-foreground/70 mt-1" data-testid="csv-import-result">
          Added {result.imported}, skipped {result.duplicates} duplicates
          {result.missingEmail.length > 0 && ` · ${result.missingEmail.length} missing email`}
        </p>
      )}
      {importError && (
        <p className="text-xs text-red-400/80 mt-1" data-testid="csv-import-error">
          {importError}
        </p>
      )}
    </div>
  )
}

// ─── Main List ──────────────────────────────────────────────────────────────

interface ContactsListProps {
  initialContacts: Contact[]
}

export function ContactsList({ initialContacts }: ContactsListProps) {
  const [contacts, setContacts] = useState(initialContacts)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)

  const filteredContacts = useMemo(() => {
    let result = contacts
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.affiliation?.toLowerCase().includes(q) ?? false),
      )
    }
    if (filterType) {
      result = result.filter((c) => c.relationshipType === filterType)
    }
    return result
  }, [contacts, search, filterType])

  // Relationship types present in the data (for filter chips)
  const presentTypes = useMemo(() => {
    const types = new Set(contacts.map((c) => c.relationshipType).filter(Boolean))
    return Array.from(types).sort() as string[]
  }, [contacts])

  const handleUpdate = useCallback(async (id: string, data: Partial<Contact>) => {
    // Optimistic update
    setContacts((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...data } : c)),
    )
    await updateContact(id, {
      notes: data.notes ?? undefined,
    })
  }, [])

  const handleDelete = useCallback(async (id: string) => {
    setContacts((prev) => prev.filter((c) => c.id !== id))
    await deleteContact(id)
  }, [])

  const handleAddClose = () => {
    setShowAddForm(false)
    // The new contact appears after the Next.js router re-renders this page from the
    // revalidatePath('/network') call inside addContact. Optimistic add (pushing the
    // new contact into local state immediately) is deferred to a follow-up bead.
  }

  return (
    <div data-testid="contacts-list">
      {/* Search + Actions */}
      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/50" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search contacts..."
            className="w-full pl-9 pr-3 py-2 text-sm bg-transparent border border-border/50 rounded-xl focus:border-ocean focus:outline-none focus:ring-1 focus:ring-ocean/20"
            data-testid="search-contacts"
          />
        </div>
        <button
          type="button"
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-ocean/10 text-ocean hover:bg-ocean/20 transition-colors text-sm font-medium"
          data-testid="add-contact-button"
        >
          <Plus className="size-4" />
          <span className="hidden sm:inline">Add</span>
        </button>
      </div>

      {/* Filter chips */}
      {presentTypes.length > 1 && (
        <div className="flex gap-1.5 mb-4 flex-wrap" data-testid="filter-chips">
          <button
            type="button"
            onClick={() => setFilterType('')}
            className={`text-xs px-2.5 py-1 rounded-lg transition-colors ${
              !filterType ? 'bg-ocean/10 text-ocean font-medium' : 'text-muted-foreground hover:bg-accent/50'
            }`}
          >
            All
          </button>
          {presentTypes.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setFilterType(filterType === type ? '' : type)}
              className={`text-xs px-2.5 py-1 rounded-lg transition-colors ${
                filterType === type ? 'bg-ocean/10 text-ocean font-medium' : 'text-muted-foreground hover:bg-accent/50'
              }`}
              data-testid={`filter-${type}`}
            >
              {type}
            </button>
          ))}
        </div>
      )}

      {/* Add form */}
      {showAddForm && <AddContactForm onClose={handleAddClose} />}

      {/* Contact list */}
      <div className="divide-y divide-border/30">
        {filteredContacts.map((contact) => (
          <ContactCard
            key={contact.id}
            contact={contact}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
          />
        ))}
      </div>

      {/* Empty state */}
      {filteredContacts.length === 0 && (
        <div className="py-12 text-center" data-testid="empty-state">
          <p className="text-sm text-muted-foreground">
            {search || filterType
              ? 'No contacts match your search'
              : 'Start building your network'}
          </p>
          {!search && !filterType && (
            <p className="text-xs text-muted-foreground/60 mt-1">
              Add your first contact or import from LinkedIn
            </p>
          )}
        </div>
      )}

      {/* CSV Import */}
      <div className="mt-4 pt-4 border-t border-border/30">
        <CsvImport />
      </div>

      {/* Contact count */}
      {contacts.length > 0 && (
        <p className="text-xs text-muted-foreground/50 mt-3">
          {filteredContacts.length === contacts.length
            ? `${contacts.length} contact${contacts.length !== 1 ? 's' : ''}`
            : `${filteredContacts.length} of ${contacts.length} contacts`
          }
        </p>
      )}
    </div>
  )
}

export { ContactCard, AddContactForm, RelationshipBadge, BADGE_STYLES }
