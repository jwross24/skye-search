import { describe, it, expect, vi, beforeEach } from 'vitest'

// Build a mock Supabase chain that supports:
//   .from('users').select(...).eq(...).single()
//   .from('users').update(...).eq(...)
const fromChain: Record<string, unknown> = {}
fromChain.select = vi.fn(() => fromChain)
fromChain.update = vi.fn(() => fromChain)
fromChain.eq = vi.fn(() => fromChain)
fromChain.single = vi.fn(() =>
  Promise.resolve({ data: { milestones_seen: [] }, error: null }),
)

const mockUser = { id: 'user-abc' }

vi.mock('@/db/supabase-server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
    },
    from: vi.fn(() => fromChain),
  }),
}))

const { markMilestoneSeen } = await import('./momentum-actions')

describe('markMilestoneSeen', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Re-wire mocks after clearAllMocks
    fromChain.select = vi.fn(() => fromChain)
    fromChain.update = vi.fn(() => fromChain)
    fromChain.eq = vi.fn(() => fromChain)
    fromChain.single = vi.fn(() =>
      Promise.resolve({ data: { milestones_seen: [] }, error: null }),
    )
  })

  it('appends a new milestone key to the array', async () => {
    await markMilestoneSeen('first_review')

    expect(fromChain.update).toHaveBeenCalledWith(
      expect.objectContaining({ milestones_seen: ['first_review'] }),
    )
  })

  it('appends to existing milestones without clobbering prior keys', async () => {
    fromChain.single = vi.fn(() =>
      Promise.resolve({ data: { milestones_seen: ['first_review'] }, error: null }),
    )

    await markMilestoneSeen('first_application')

    expect(fromChain.update).toHaveBeenCalledWith(
      expect.objectContaining({ milestones_seen: ['first_review', 'first_application'] }),
    )
  })

  it('does not write if key already present', async () => {
    fromChain.single = vi.fn(() =>
      Promise.resolve({ data: { milestones_seen: ['first_review'] }, error: null }),
    )

    await markMilestoneSeen('first_review')

    expect(fromChain.update).not.toHaveBeenCalled()
  })

  it('handles null milestones_seen gracefully (treats as empty)', async () => {
    fromChain.single = vi.fn(() =>
      Promise.resolve({ data: { milestones_seen: null }, error: null }),
    )

    await markMilestoneSeen('first_review')

    expect(fromChain.update).toHaveBeenCalledWith(
      expect.objectContaining({ milestones_seen: ['first_review'] }),
    )
  })
})
