# Server Action Wiring Pattern

## Standard Pattern (established in qd2/uzs beads)

Every page that reads or writes user data follows this architecture:

### Server Component (page.tsx)
```tsx
export default async function Page() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data } = await supabase.from('table').select('*').eq('user_id', user.id)
  // Map DB rows to component prop types
  return <ClientComponent data={mappedData} />
}
```

### Server Actions (actions.ts)
```tsx
'use server'
export async function myAction(id: string, value: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const { error } = await supabase.from('table').update({ value }).eq('id', id).eq('user_id', user.id)
  if (error) return { success: false, error: error.message }

  revalidatePath('/path')
  return { success: true }
}
```

### Client Component
```tsx
// Optimistic update + fire-and-forget server action
const handleChange = (newValue: string) => {
  setState(newValue) // optimistic
  serverAction(id, newValue) // persist (fire-and-forget for now)
}
```

### Test File
```tsx
// MUST mock server actions before component import
vi.mock('@/app/page/actions', () => ({
  myAction: vi.fn().mockResolvedValue({ success: true }),
}))
```

## Security Invariants
- Every action: `getUser()` check before any DB operation
- Every mutation: `.eq('user_id', user.id)` (defense in depth with RLS)
- Never trust client-supplied user_id — always derive from session
