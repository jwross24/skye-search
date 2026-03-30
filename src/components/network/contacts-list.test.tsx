import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ContactsList } from './contacts-list'
import type { Contact } from '@/lib/contact-constants'

function log(step: string, detail: string) {
  process.stdout.write(`  [contacts-list] ${step}: ${detail}\n`)
}

// ─── Mock server actions ────────────────────────────────────────────────────

vi.mock('@/app/network/actions', async () => {
  const actual = await vi.importActual('@/app/network/actions')
  return {
    ...actual,
    addContact: vi.fn().mockResolvedValue({ success: true }),
    updateContact: vi.fn().mockResolvedValue({ success: true }),
    deleteContact: vi.fn().mockResolvedValue({ success: true }),
    importLinkedInCsv: vi.fn().mockResolvedValue({ success: true, imported: 3, duplicates: 1, missingEmail: ['Jane Doe'] }),
  }
})

beforeEach(() => {
  vi.clearAllMocks()
})

// ─── Seed Data ──────────────────────────────────────────────────────────────

const SEED_CONTACTS: Contact[] = [
  {
    id: 'c-wei',
    name: 'Jianwei Wei',
    affiliation: 'GST / NOAA (College Park, MD)',
    relationshipType: 'co-author',
    email: 'jwei@gst.com',
    phone: null,
    notes: 'Remote sensing scientist at GST.',
    lastContacted: null,
    linkedJobIds: null,
    createdAt: '2026-03-24T00:00:00Z',
  },
  {
    id: 'c-lee',
    name: 'Zhongping Lee',
    affiliation: 'UMass Boston',
    relationshipType: 'advisor',
    email: 'zlee@umb.edu',
    phone: null,
    notes: 'Current advisor/collaborator.',
    lastContacted: null,
    linkedJobIds: null,
    createdAt: '2026-03-24T00:00:00Z',
  },
  {
    id: 'c-roman',
    name: 'Miguel O. Roman',
    affiliation: 'NASA Goddard',
    relationshipType: 'co-author',
    email: null,
    phone: null,
    notes: 'MODIS/VIIRS paper co-author.',
    lastContacted: null,
    linkedJobIds: null,
    createdAt: '2026-03-24T00:00:00Z',
  },
]

// ─── Rendering ──────────────────────────────────────────────────────────────

describe('Contact list rendering', () => {
  it('renders contact cards with name, affiliation, relationship badge, and email', () => {
    log('Step 1', 'Rendering list with 3 contacts')
    render(<ContactsList initialContacts={SEED_CONTACTS} />)

    const weiCard = screen.getByTestId('contact-c-wei')
    expect(weiCard.textContent).toContain('Jianwei Wei')
    expect(weiCard.textContent).toContain('GST / NOAA')
    expect(weiCard.textContent).toContain('co-author')
    expect(weiCard.textContent).toContain('jwei@gst.com')

    const leeCard = screen.getByTestId('contact-c-lee')
    expect(leeCard.textContent).toContain('Zhongping Lee')
    expect(leeCard.textContent).toContain('advisor')
    log('Step 2', 'All fields rendered on cards')
  })

  it('renders correct relationship type badges', () => {
    log('Step 1', 'Checking badge rendering')
    render(<ContactsList initialContacts={SEED_CONTACTS} />)

    const weiCard = screen.getByTestId('contact-c-wei')
    expect(within(weiCard).getByText('co-author')).toBeDefined()

    const leeCard = screen.getByTestId('contact-c-lee')
    expect(within(leeCard).getByText('advisor')).toBeDefined()
    log('Step 2', 'Badges render with correct text')
  })

  it('renders contact notes', () => {
    log('Step 1', 'Checking notes')
    render(<ContactsList initialContacts={SEED_CONTACTS} />)
    expect(screen.getByText('Remote sensing scientist at GST.')).toBeDefined()
    expect(screen.getByText('Current advisor/collaborator.')).toBeDefined()
    log('Step 2', 'Notes visible on cards')
  })

  it('renders contact count', () => {
    log('Step 1', 'Checking contact count')
    render(<ContactsList initialContacts={SEED_CONTACTS} />)
    expect(screen.getByText('3 contacts')).toBeDefined()
    log('Step 2', 'Contact count displayed')
  })

  it('shows empty state with encouraging message when no contacts', () => {
    log('Step 1', 'Rendering with empty list')
    render(<ContactsList initialContacts={[]} />)
    expect(screen.getByTestId('empty-state')).toBeDefined()
    expect(screen.getByText('Start building your network')).toBeDefined()
    log('Step 2', 'Empty state shows encouragement')
  })
})

// ─── Search & Filter ────────────────────────────────────────────────────────

describe('Search and filter', () => {
  it('search by name filters contacts', async () => {
    log('Step 1', 'Typing "Wei" in search')
    const user = userEvent.setup()
    render(<ContactsList initialContacts={SEED_CONTACTS} />)

    const searchInput = screen.getByTestId('search-contacts')
    await user.type(searchInput, 'Wei')

    expect(screen.getByTestId('contact-c-wei')).toBeDefined()
    expect(screen.queryByTestId('contact-c-lee')).toBeNull()
    expect(screen.queryByTestId('contact-c-roman')).toBeNull()
    log('Step 2', 'Only matching contact visible')
  })

  it('search by affiliation filters contacts', async () => {
    log('Step 1', 'Searching for "NASA"')
    const user = userEvent.setup()
    render(<ContactsList initialContacts={SEED_CONTACTS} />)

    await user.type(screen.getByTestId('search-contacts'), 'NASA')

    expect(screen.getByTestId('contact-c-roman')).toBeDefined()
    expect(screen.queryByTestId('contact-c-wei')).toBeNull()
    log('Step 2', 'Affiliation search works')
  })

  it('filter by relationship type works', async () => {
    log('Step 1', 'Clicking advisor filter')
    const user = userEvent.setup()
    render(<ContactsList initialContacts={SEED_CONTACTS} />)

    const advisorFilter = screen.getByTestId('filter-advisor')
    await user.click(advisorFilter)

    expect(screen.getByTestId('contact-c-lee')).toBeDefined()
    expect(screen.queryByTestId('contact-c-wei')).toBeNull()
    log('Step 2', 'Only advisor contacts shown')
  })

  it('shows "no matches" when search finds nothing', async () => {
    log('Step 1', 'Searching for nonexistent contact')
    const user = userEvent.setup()
    render(<ContactsList initialContacts={SEED_CONTACTS} />)

    await user.type(screen.getByTestId('search-contacts'), 'Nonexistent')

    expect(screen.getByText('No contacts match your search')).toBeDefined()
    log('Step 2', 'Empty search state shown')
  })

  it('filtered count shows N of total', async () => {
    log('Step 1', 'Filtering then checking count')
    const user = userEvent.setup()
    render(<ContactsList initialContacts={SEED_CONTACTS} />)

    await user.type(screen.getByTestId('search-contacts'), 'Wei')

    expect(screen.getByText('1 of 3 contacts')).toBeDefined()
    log('Step 2', 'Filtered count displayed correctly')
  })
})

// ─── Add Contact ────────────────────────────────────────────────────────────

describe('Add contact form', () => {
  it('clicking Add shows form', async () => {
    log('Step 1', 'Clicking add button')
    const user = userEvent.setup()
    render(<ContactsList initialContacts={SEED_CONTACTS} />)

    await user.click(screen.getByTestId('add-contact-button'))
    expect(screen.getByTestId('add-contact-form')).toBeDefined()
    expect(screen.getByTestId('add-contact-name')).toBeDefined()
    log('Step 2', 'Form visible with name field')
  })

  it('submitting form calls addContact with correct data', async () => {
    log('Step 1', 'Filling and submitting form')
    const { addContact: mockAdd } = await import('@/app/network/actions')
    const user = userEvent.setup()
    render(<ContactsList initialContacts={SEED_CONTACTS} />)

    await user.click(screen.getByTestId('add-contact-button'))
    await user.type(screen.getByTestId('add-contact-name'), 'New Person')
    await user.type(screen.getByTestId('add-contact-affiliation'), 'MIT')
    await user.type(screen.getByTestId('add-contact-email'), 'new@mit.edu')
    await user.click(screen.getByTestId('add-contact-submit'))

    expect(mockAdd).toHaveBeenCalledWith(expect.objectContaining({
      name: 'New Person',
      affiliation: 'MIT',
      email: 'new@mit.edu',
    }))
    log('Step 2', 'addContact called with form data')
  })
})

// ─── Delete Contact ─────────────────────────────────────────────────────────

describe('Delete contact', () => {
  it('clicking delete removes contact from list optimistically', async () => {
    log('Step 1', 'Clicking delete on Wei')
    const user = userEvent.setup()
    render(<ContactsList initialContacts={SEED_CONTACTS} />)

    const deleteBtn = screen.getByTestId('delete-c-wei')
    await user.click(deleteBtn)

    expect(screen.queryByTestId('contact-c-wei')).toBeNull()
    expect(screen.getByTestId('contact-c-lee')).toBeDefined()
    log('Step 2', 'Contact removed optimistically')
  })

  it('delete calls deleteContact with correct ID', async () => {
    log('Step 1', 'Verifying server action called')
    const { deleteContact: mockDelete } = await import('@/app/network/actions')
    const user = userEvent.setup()
    render(<ContactsList initialContacts={SEED_CONTACTS} />)

    await user.click(screen.getByTestId('delete-c-wei'))
    expect(mockDelete).toHaveBeenCalledWith('c-wei')
    log('Step 2', 'deleteContact called with correct ID')
  })
})

// ─── CSV Import ─────────────────────────────────────────────────────────────

describe('LinkedIn CSV import', () => {
  it('shows import label', () => {
    log('Step 1', 'Checking import UI')
    render(<ContactsList initialContacts={SEED_CONTACTS} />)
    expect(screen.getByTestId('csv-import-label')).toBeDefined()
    expect(screen.getByText('Import from LinkedIn CSV')).toBeDefined()
    log('Step 2', 'Import label visible')
  })
})
