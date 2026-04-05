/**
 * Integration test: verify migration 20260405000000_fix_lca_acronym_casing.sql
 * applied correctly. Asserts that the 4 mis-cased acronym rows from the wx9m
 * LCA bulk import (bead skye-search-8pf3) no longer exist and are replaced by
 * correctly-cased versions.
 *
 * Runs against local Supabase (supabase start must be running).
 * Does NOT use vi.mock — this tests real DB state (project rule).
 */
import { config } from 'dotenv'
import path from 'path'

// Load .env.local before any Supabase imports (Vitest doesn't auto-load it)
config({ path: path.resolve(process.cwd(), '.env.local') })

import { describe, it, expect, beforeAll } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let adminClient: SupabaseClient

beforeAll(() => {
  adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
  )
})

async function employerExists(name: string): Promise<boolean> {
  const { data, error } = await adminClient
    .from('cap_exempt_employers')
    .select('employer_name')
    .eq('employer_name', name)
    .maybeSingle()
  if (error) throw new Error(`Query failed for "${name}": ${error.message}`)
  return data !== null
}

describe('cap_exempt_employers acronym casing (migration 20260405000000)', () => {
  describe('CGH Medical Center', () => {
    it('mis-cased "Cgh Medical Center" no longer exists', async () => {
      expect(await employerExists('Cgh Medical Center')).toBe(false)
    })

    it('correctly-cased "CGH Medical Center" exists', async () => {
      expect(await employerExists('CGH Medical Center')).toBe(true)
    })
  })

  describe('UCSF Medical Center', () => {
    it('mis-cased "Ucsf Medical Center" no longer exists', async () => {
      expect(await employerExists('Ucsf Medical Center')).toBe(false)
    })

    it('correctly-cased "UCSF Medical Center" exists', async () => {
      expect(await employerExists('UCSF Medical Center')).toBe(true)
    })
  })

  describe('UT-Battelle', () => {
    it('mis-cased "Ut-Battelle, LLC (Oak Ridge National Laboratory)" no longer exists', async () => {
      expect(
        await employerExists('Ut-Battelle, LLC (Oak Ridge National Laboratory)'),
      ).toBe(false)
    })

    it('correctly-cased "UT-Battelle, LLC (Oak Ridge National Laboratory)" exists', async () => {
      expect(
        await employerExists('UT-Battelle, LLC (Oak Ridge National Laboratory)'),
      ).toBe(true)
    })
  })

  describe('Physician Affiliate Group of NY, PC', () => {
    it('mis-cased "Physician Affiliate Group of Ny, Pc" no longer exists', async () => {
      expect(await employerExists('Physician Affiliate Group of Ny, Pc')).toBe(false)
    })

    it('correctly-cased "Physician Affiliate Group of NY, PC" exists', async () => {
      expect(await employerExists('Physician Affiliate Group of NY, PC')).toBe(true)
    })
  })
})
