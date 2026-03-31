import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock revalidatePath
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

// Track update results for the terminal .eq() in update chains
let updateResult: { error: null | { message: string } } = { error: null }
let selectData: { skills: string[] | null } = { skills: ['Python', 'R'] }

const mockUpdate = vi.fn()

// Build a fresh chain per from() call — avoids shared state between select/update paths
function buildChain() {
  const chain: Record<string, unknown> = {}
  chain.select = vi.fn().mockReturnValue(chain)
  chain.update = vi.fn((...args: unknown[]) => {
    mockUpdate(...args)
    return chain
  })
  chain.eq = vi.fn().mockImplementation(() => {
    // After update().eq(), this is the terminal call — return the update result
    // After select().eq(), the chain continues to .single()
    return chain
  })
  chain.single = vi.fn().mockImplementation(() =>
    Promise.resolve({ data: selectData, error: null }),
  )
  // Make the chain thenable so `await from().update().eq()` resolves to updateResult
  chain.then = vi.fn().mockImplementation((resolve: (v: unknown) => void) =>
    resolve(updateResult),
  )
  return chain
}

const mockUser = { id: 'user-123' }

vi.mock('@/db/supabase-server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
    },
    from: () => buildChain(),
  }),
}))

// Import AFTER mocks
const { addSkill, removeSkill } = await import('./actions')

describe('addSkill', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    selectData = { skills: ['Python', 'R'] }
    updateResult = { error: null }
  })

  it('adds a new skill to the array', async () => {
    const result = await addSkill('MATLAB')
    expect(result.success).toBe(true)
    expect(mockUpdate).toHaveBeenCalledWith({ skills: ['Python', 'R', 'MATLAB'] })
  })

  it('rejects duplicate skill (case-insensitive)', async () => {
    const result = await addSkill('python')
    expect(result.success).toBe(false)
    expect(result.error).toBe('Skill already tracked')
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('rejects empty skill', async () => {
    const result = await addSkill('')
    expect(result.success).toBe(false)
    expect(result.error).toBe('Skill cannot be empty')
  })

  it('rejects whitespace-only skill', async () => {
    const result = await addSkill('   ')
    expect(result.success).toBe(false)
    expect(result.error).toBe('Skill cannot be empty')
  })

  it('rejects skill longer than 100 chars', async () => {
    const result = await addSkill('a'.repeat(101))
    expect(result.success).toBe(false)
    expect(result.error).toBe('Skill name too long')
  })

  it('trims whitespace from skill name', async () => {
    const result = await addSkill('  GIS  ')
    expect(result.success).toBe(true)
    expect(mockUpdate).toHaveBeenCalledWith({ skills: ['Python', 'R', 'GIS'] })
  })

  it('handles null skills array', async () => {
    selectData = { skills: null }
    const result = await addSkill('Python')
    expect(result.success).toBe(true)
    expect(mockUpdate).toHaveBeenCalledWith({ skills: ['Python'] })
  })

  it('returns error on database failure', async () => {
    updateResult = { error: { message: 'Connection refused' } }
    const result = await addSkill('NewSkill')
    expect(result.success).toBe(false)
    expect(result.error).toBe('Connection refused')
  })
})

describe('removeSkill', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    selectData = { skills: ['Python', 'R', 'MATLAB'] }
    updateResult = { error: null }
  })

  it('removes a skill from the array', async () => {
    const result = await removeSkill('R')
    expect(result.success).toBe(true)
    expect(mockUpdate).toHaveBeenCalledWith({ skills: ['Python', 'MATLAB'] })
  })

  it('removes skill case-insensitively', async () => {
    const result = await removeSkill('python')
    expect(result.success).toBe(true)
    expect(mockUpdate).toHaveBeenCalledWith({ skills: ['R', 'MATLAB'] })
  })

  it('succeeds even if skill not found', async () => {
    const result = await removeSkill('NotASkill')
    expect(result.success).toBe(true)
    expect(mockUpdate).toHaveBeenCalledWith({ skills: ['Python', 'R', 'MATLAB'] })
  })

  it('returns error on database failure', async () => {
    updateResult = { error: { message: 'Timeout' } }
    const result = await removeSkill('R')
    expect(result.success).toBe(false)
    expect(result.error).toBe('Timeout')
  })
})
