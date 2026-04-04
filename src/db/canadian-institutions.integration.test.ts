/**
 * Integration test: verify Canadian institutions exist in cap_exempt_employers
 * after migration 20260403200000_seed_canadian_institutions.sql runs.
 *
 * Tests against real local Supabase (not mocked).
 */
import { describe, it, expect } from 'vitest'
import { config } from 'dotenv'
import path from 'path'
config({ path: path.resolve(process.cwd(), '.env.local') })

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,
)

function log(step: string, detail: string) {
  process.stdout.write(`  [canadian-institutions] ${step}: ${detail}\n`)
}

describe('Canadian institutions migration', () => {
  it('13 Canadian institutions exist with basis=canadian_institution', async () => {
    log('Step 1', 'Querying cap_exempt_employers for canadian_institution basis')
    const { data, error } = await supabase
      .from('cap_exempt_employers')
      .select('employer_name, cap_exempt_basis, confidence_level')
      .eq('cap_exempt_basis', 'canadian_institution')

    expect(error).toBeNull()
    expect(data).not.toBeNull()
    log('Step 2', `Found ${data!.length} Canadian institutions`)
    expect(data!.length).toBe(13)

    // Verify key employers are present
    const names = data!.map(d => d.employer_name)
    expect(names).toContain('University of British Columbia')
    expect(names).toContain('McGill University')
    expect(names).toContain('Dalhousie University')
    expect(names).toContain('Fisheries and Oceans Canada')
    expect(names).toContain('Environment and Climate Change Canada')
    log('Step 3', 'Key employers verified: UBC, McGill, Dalhousie, DFO, ECCC')

    // All should be confirmed confidence
    for (const row of data!) {
      expect(row.confidence_level).toBe('confirmed')
    }
    log('Step 4', 'All institutions have confirmed confidence')
  })

  it('Canadian institutions do NOT duplicate existing US entries', async () => {
    log('Step 1', 'Checking for duplicate employer_name across bases')
    const { data } = await supabase
      .from('cap_exempt_employers')
      .select('employer_name, cap_exempt_basis')

    const nameCount = new Map<string, number>()
    for (const row of data ?? []) {
      nameCount.set(row.employer_name, (nameCount.get(row.employer_name) ?? 0) + 1)
    }

    const duplicates = [...nameCount.entries()].filter(([, count]) => count > 1)
    expect(duplicates).toEqual([])
    log('Step 2', `No duplicates found across ${data?.length} total employers`)
  })
})
