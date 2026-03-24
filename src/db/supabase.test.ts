import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock @supabase/ssr before importing
vi.mock('@supabase/ssr', () => ({
  createBrowserClient: vi.fn(() => ({
    auth: {
      getSession: vi.fn(),
      getUser: vi.fn(),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
    },
    from: vi.fn(),
  })),
}))

describe('Supabase browser client', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_test')
  })

  it('creates a valid browser client with auth methods', async () => {
    const { createClient } = await import('./supabase')
    const client = createClient()

    expect(client).toBeDefined()
    expect(client.auth).toBeDefined()
    expect(client.auth.getSession).toBeDefined()
    expect(client.auth.signInWithPassword).toBeDefined()
    expect(client.auth.signOut).toBeDefined()
  })

  it('passes URL and publishable key from env', async () => {
    const { createBrowserClient } = await import('@supabase/ssr')
    const { createClient } = await import('./supabase')

    createClient()

    expect(createBrowserClient).toHaveBeenCalledWith(
      'https://test.supabase.co',
      'sb_publishable_test',
    )
  })
})
