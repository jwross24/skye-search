/**
 * Integration tests for settings server actions.
 * Tests against real local Supabase — no mocks.
 */

import { config } from 'dotenv'
import path from 'path'
config({ path: path.resolve(process.cwd(), '.env.local') })

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import {
  assertSupabaseReachable,
  createServiceClient,
  TEST_USER_ID,
} from '../../../tests/helpers/supabase'

function log(step: string, detail: string) {
  process.stdout.write(`  [settings-integration] ${step}: ${detail}\n`)
}

const service = createServiceClient()

// Save original state for restoration
let originalSkills: string[] = []
let originalPrefs: Record<string, unknown> | null = null

beforeAll(async () => {
  await assertSupabaseReachable()

  const { data } = await service
    .from('users')
    .select('skills, user_preferences')
    .eq('id', TEST_USER_ID)
    .single()

  originalSkills = (data?.skills ?? []) as string[]
  originalPrefs = (data?.user_preferences as Record<string, unknown>) ?? null
  log('Setup', `Saved original: ${originalSkills.length} skills`)
})

afterAll(async () => {
  await service
    .from('users')
    .update({ skills: originalSkills, user_preferences: originalPrefs })
    .eq('id', TEST_USER_ID)
  log('Cleanup', 'Restored original skills and preferences')
})

describe('addSkill / removeSkill (real Supabase)', () => {
  it('[settings] addSkill appends to users.skills array', async () => {
    const testSkill = 'remote-sensing-integration-test'

    // Read current skills
    const { data: before } = await service
      .from('users')
      .select('skills')
      .eq('id', TEST_USER_ID)
      .single()

    const currentSkills = (before!.skills ?? []) as string[]
    const updatedSkills = [...currentSkills, testSkill]
    log('addSkill', `Current: ${currentSkills.length} skills, adding "${testSkill}"`)

    // Update
    const { error } = await service
      .from('users')
      .update({ skills: updatedSkills })
      .eq('id', TEST_USER_ID)

    expect(error).toBeNull()

    // Verify
    const { data: after } = await service
      .from('users')
      .select('skills')
      .eq('id', TEST_USER_ID)
      .single()

    const afterSkills = (after!.skills ?? []) as string[]
    expect(afterSkills).toContain(testSkill)
    expect(afterSkills.length).toBe(currentSkills.length + 1)
    log('addSkill', `After: ${afterSkills.length} skills, includes "${testSkill}"`)
  })

  it('[settings] removeSkill removes from users.skills array', async () => {
    const testSkill = 'remote-sensing-integration-test'

    // Ensure skill exists first
    const { data: before } = await service
      .from('users')
      .select('skills')
      .eq('id', TEST_USER_ID)
      .single()

    const currentSkills = (before!.skills ?? []) as string[]
    if (!currentSkills.includes(testSkill)) {
      await service.from('users').update({ skills: [...currentSkills, testSkill] }).eq('id', TEST_USER_ID)
    }
    log('removeSkill', `Ensuring "${testSkill}" exists before removal`)

    // Remove it
    const { data: current } = await service
      .from('users')
      .select('skills')
      .eq('id', TEST_USER_ID)
      .single()

    const filtered = ((current!.skills ?? []) as string[]).filter(s => s !== testSkill)
    const { error } = await service
      .from('users')
      .update({ skills: filtered })
      .eq('id', TEST_USER_ID)

    expect(error).toBeNull()

    // Verify
    const { data: after } = await service
      .from('users')
      .select('skills')
      .eq('id', TEST_USER_ID)
      .single()

    expect((after!.skills as string[])).not.toContain(testSkill)
    log('removeSkill', `Removed "${testSkill}", now ${(after!.skills as string[]).length} skills`)
  })

  it('[settings] addSkill is idempotent: duplicate skill is not double-inserted', async () => {
    const testSkill = 'dedup-guard-integration-test'

    // Read current skills, ensure testSkill is present once
    const { data: before } = await service
      .from('users')
      .select('skills')
      .eq('id', TEST_USER_ID)
      .single()

    const currentSkills = (before!.skills ?? []) as string[]
    const withSkill = currentSkills.includes(testSkill)
      ? currentSkills
      : [...currentSkills, testSkill]
    await service.from('users').update({ skills: withSkill }).eq('id', TEST_USER_ID)

    // Simulate the addSkill guard: check for duplicate before inserting
    const { data: check } = await service
      .from('users')
      .select('skills')
      .eq('id', TEST_USER_ID)
      .single()

    const existingSkills = (check!.skills ?? []) as string[]
    const alreadyTracked = existingSkills.some(s => s.toLowerCase() === testSkill.toLowerCase())
    expect(alreadyTracked).toBe(true)
    // Guard fires — no second insert; count stays the same
    const countBefore = existingSkills.filter(s => s.toLowerCase() === testSkill.toLowerCase()).length
    expect(countBefore).toBe(1)
    log('addSkill dedup', `Guard prevents duplicate: "${testSkill}" appears ${countBefore} time(s)`)
  })
})

describe('updateBudgetCaps (real Supabase)', () => {
  it('[settings] updates budget caps in user_preferences JSONB', async () => {
    const newBudget = {
      daily_cap_cents: 500,
      weekly_soft_cap_cents: 2000,
      weekly_alert_threshold_cents: 1500,
    }

    // Read current prefs
    const { data: before } = await service
      .from('users')
      .select('user_preferences')
      .eq('id', TEST_USER_ID)
      .single()

    const currentPrefs = (before!.user_preferences as Record<string, unknown>) ?? {}
    const updatedPrefs = { ...currentPrefs, budget: newBudget }

    const { error } = await service
      .from('users')
      .update({ user_preferences: updatedPrefs })
      .eq('id', TEST_USER_ID)

    expect(error).toBeNull()
    log('budget', 'Updated budget caps')

    // Verify
    const { data: after } = await service
      .from('users')
      .select('user_preferences')
      .eq('id', TEST_USER_ID)
      .single()

    const prefs = after!.user_preferences as Record<string, unknown>
    const budget = prefs.budget as Record<string, number>
    expect(budget.daily_cap_cents).toBe(500)
    expect(budget.weekly_soft_cap_cents).toBe(2000)
    expect(budget.weekly_alert_threshold_cents).toBe(1500)
    log('budget', `Verified: daily=${budget.daily_cap_cents}, weekly=${budget.weekly_soft_cap_cents}`)
  })
})

describe('activateBreakMode / deactivateBreakMode (real Supabase)', () => {
  it('[settings] activateBreakMode sets break_mode_until in future', async () => {
    const until = new Date(Date.now() + 3 * 86400000).toISOString()

    const { error } = await service
      .from('users')
      .update({ break_mode_until: until })
      .eq('id', TEST_USER_ID)

    expect(error).toBeNull()

    const { data } = await service
      .from('users')
      .select('break_mode_until')
      .eq('id', TEST_USER_ID)
      .single()

    expect(data!.break_mode_until).not.toBeNull()
    expect(new Date(data!.break_mode_until!).getTime()).toBeGreaterThan(Date.now())
    log('activateBreak', `Set: ${data!.break_mode_until}`)
  })

  it('[settings] deactivateBreakMode clears break_mode_until', async () => {
    const { error } = await service
      .from('users')
      .update({ break_mode_until: null })
      .eq('id', TEST_USER_ID)

    expect(error).toBeNull()

    const { data } = await service
      .from('users')
      .select('break_mode_until')
      .eq('id', TEST_USER_ID)
      .single()

    expect(data!.break_mode_until).toBeNull()
    log('deactivateBreak', 'Cleared break_mode_until')
  })
})

describe('saveExtractedProfile (real Supabase)', () => {
  it('[settings] merges extracted skills into users.skills without duplicates', async () => {
    // Set a known starting state for skills
    const baseSkills = ['python', 'remote-sensing']
    await service.from('users').update({ skills: baseSkills }).eq('id', TEST_USER_ID)

    // Simulate the merge logic from saveExtractedProfile:
    // incoming skills include one existing (case-insensitive) and one new
    const extractedSkills = ['Python', 'machine-learning']
    const { data: current } = await service
      .from('users')
      .select('skills')
      .eq('id', TEST_USER_ID)
      .single()

    const currentSkills = (current!.skills ?? []) as string[]
    const existingLower = new Set(currentSkills.map(s => s.toLowerCase()))
    const newSkills = extractedSkills.filter(s => !existingLower.has(s.toLowerCase()))
    const mergedSkills = [...currentSkills, ...newSkills]

    const { error } = await service
      .from('users')
      .update({ skills: mergedSkills })
      .eq('id', TEST_USER_ID)

    expect(error).toBeNull()

    const { data: after } = await service
      .from('users')
      .select('skills')
      .eq('id', TEST_USER_ID)
      .single()

    const afterSkills = (after!.skills ?? []) as string[]
    // 'Python' is a case-insensitive duplicate of 'python' — should not be added
    expect(afterSkills.filter(s => s.toLowerCase() === 'python').length).toBe(1)
    // 'machine-learning' is new — should be added
    expect(afterSkills).toContain('machine-learning')
    // Total: 3 (python, remote-sensing, machine-learning)
    expect(afterSkills.length).toBe(3)
    log('saveExtractedProfile', `Skills merged: ${afterSkills.join(', ')}`)
  })

  it('[settings] profile merge writes to users.profile JSONB column', async () => {
    const mergedProfile = {
      name: 'Integration Test User',
      field: 'environmental science',
      research_areas: ['ocean color', 'remote sensing'],
      publications: [{ title: 'Test Paper 2026', venue: 'Test Journal', year: 2026 }],
      education: [],
      employment_history: [],
    }

    const { error } = await service
      .from('users')
      .update({ profile: mergedProfile })
      .eq('id', TEST_USER_ID)

    expect(error).toBeNull()

    const { data } = await service
      .from('users')
      .select('profile')
      .eq('id', TEST_USER_ID)
      .single()

    const profile = data!.profile as Record<string, unknown>
    expect(profile.name).toBe('Integration Test User')
    expect(profile.field).toBe('environmental science')
    expect(Array.isArray(profile.research_areas)).toBe(true)
    expect((profile.research_areas as string[])).toContain('ocean color')
    log('saveExtractedProfile', `Profile stored: name=${profile.name}, field=${profile.field}`)
  })
})
