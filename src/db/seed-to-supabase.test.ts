import { describe, it, expect, vi } from 'vitest'

// vi.hoisted runs before vi.mock hoisting — set env vars first
vi.hoisted(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321'
  process.env.SUPABASE_SECRET_KEY = 'test-service-key'
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'test-anon-key'
})

// Mock @supabase/supabase-js before importing the module under test
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: { autoRefreshToken: false, persistSession: false },
    from: vi.fn(),
  })),
}))

import { parseUserIdArg } from './seed-to-supabase'

const DEFAULT_TEST_USER_ID = '00000000-0000-0000-0000-000000000001'

describe('parseUserIdArg', () => {
  it('returns default test user ID when no --user-id flag is provided', () => {
    const result = parseUserIdArg(['node', 'seed-to-supabase.ts'])
    expect(result.userId).toBe(DEFAULT_TEST_USER_ID)
    expect(result.existingUserId).toBeUndefined()
  })

  it('parses --user-id flag and returns the provided UUID', () => {
    const customId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
    const result = parseUserIdArg([
      'node',
      'seed-to-supabase.ts',
      `--user-id=${customId}`,
    ])
    expect(result.userId).toBe(customId)
    expect(result.existingUserId).toBe(customId)
  })

  it('ignores unrelated flags and still parses --user-id', () => {
    const customId = '11111111-2222-3333-4444-555555555555'
    const result = parseUserIdArg([
      'node',
      'seed-to-supabase.ts',
      '--verbose',
      `--user-id=${customId}`,
      '--dry-run',
    ])
    expect(result.userId).toBe(customId)
    expect(result.existingUserId).toBe(customId)
  })

  it('handles empty argv gracefully', () => {
    const result = parseUserIdArg([])
    expect(result.userId).toBe(DEFAULT_TEST_USER_ID)
    expect(result.existingUserId).toBeUndefined()
  })

  it('does not match --user-id without = separator', () => {
    const result = parseUserIdArg([
      'node',
      'seed-to-supabase.ts',
      '--user-id',
      'some-uuid',
    ])
    expect(result.userId).toBe(DEFAULT_TEST_USER_ID)
    expect(result.existingUserId).toBeUndefined()
  })
})
