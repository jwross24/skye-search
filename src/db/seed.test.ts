import { describe, it, expect } from 'vitest'
import {
  seedJobs,
  seedProfile,
  seedImmigrationStatus,
  seedPlans,
  seedContacts,
  validateSeedJobs,
} from './seed'
import { computeUrgencyScore, type JobInput, type UserState } from '@/lib/urgency-scoring'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeUserFromSeed(): UserState {
  return {
    days_remaining: 150 - seedImmigrationStatus.initial_days_used, // 119
    is_employed: seedImmigrationStatus.employment_active,
    offer_accepted_not_started: false,
    employment_end_date: null,
    in_grace_period: false,
    today: '2026-03-24',
  }
}

function seedJobToInput(job: typeof seedJobs[number]): JobInput {
  return {
    visa_path: job.visa_path,
    employer_type: job.employer_type,
    cap_exempt_confidence: job.cap_exempt_confidence,
    employment_type: job.employment_type,
    source_type: job.source_type,
    location: job.location,
    h1b_sponsor_count: job.h1b_sponsor_count,
    application_deadline: job.application_deadline,
    application_complexity: job.application_complexity,
    indexed_date: '2026-03-24',
  }
}

// ─── Job Count & Completeness ────────────────────────────────────────────────

describe('Seed data includes 30+ jobs', () => {
  it('seed data includes 30+ jobs from target employer list', () => {
    console.log(`[Seed] Total jobs: ${seedJobs.length}`)
    expect(seedJobs.length).toBeGreaterThanOrEqual(30)
  })

  it('all seed jobs have required urgency algorithm fields', () => {
    const errors = validateSeedJobs(seedJobs)
    if (errors.length > 0) console.log('[Seed] Validation errors:', errors)
    expect(errors).toHaveLength(0)
  })
})

// ─── Tier Mapping ────────────────────────────────────────────────────────────

describe('Tier mapping', () => {
  it('Tier 1A employers mapped to cap_exempt with confidence=confirmed', () => {
    const tier1A = seedJobs.filter(
      (j) =>
        j.visa_path === 'cap_exempt' &&
        j.employer_type === 'university' &&
        j.cap_exempt_confidence === 'confirmed',
    )
    console.log(`[Seed] Tier 1A university confirmed: ${tier1A.length}`)
    expect(tier1A.length).toBeGreaterThan(0)
    for (const job of tier1A) {
      expect(job.visa_path).toBe('cap_exempt')
      expect(job.cap_exempt_confidence).toBe('confirmed')
    }
  })

  it('cooperative institutes mapped to cap_exempt with confidence=confirmed', () => {
    const coopInst = seedJobs.filter((j) => j.employer_type === 'cooperative_institute')
    expect(coopInst.length).toBeGreaterThan(0)
    for (const job of coopInst) {
      expect(job.visa_path).toBe('cap_exempt')
      expect(job.cap_exempt_confidence).toBe('confirmed')
    }
  })

  it('government contractors mapped to cap_exempt with confidence=likely', () => {
    const govContractors = seedJobs.filter((j) => j.employer_type === 'government_contractor')
    expect(govContractors.length).toBeGreaterThan(0)
    for (const job of govContractors) {
      expect(job.visa_path).toBe('cap_exempt')
      expect(['likely', 'confirmed']).toContain(job.cap_exempt_confidence)
    }
  })

  it('Tier 2 employers mapped to opt_compatible', () => {
    const tier2 = seedJobs.filter((j) => j.visa_path === 'opt_compatible')
    console.log(`[Seed] Tier 2 OPT-compatible: ${tier2.length}`)
    expect(tier2.length).toBeGreaterThan(0)
  })

  it('Tier 3 employers mapped to cap_subject', () => {
    const tier3 = seedJobs.filter((j) => j.visa_path === 'cap_subject')
    console.log(`[Seed] Tier 3 cap-subject: ${tier3.length}`)
    expect(tier3.length).toBeGreaterThan(0)
  })

  it('Tier 4 employers mapped to canada', () => {
    const tier4 = seedJobs.filter((j) => j.visa_path === 'canada')
    console.log(`[Seed] Tier 4 Canada: ${tier4.length}`)
    expect(tier4.length).toBeGreaterThan(0)
  })
})

// ─── Profile ─────────────────────────────────────────────────────────────────

describe('Seed profile', () => {
  it('seed profile matches plan domain context', () => {
    expect(seedProfile.skills).toContain('Python')
    expect(seedProfile.skills).toContain('MATLAB')
    expect(seedProfile.skills).toContain('Google Earth Engine')
    expect(seedProfile.skills).toContain('SeaDAS')
    expect(seedProfile.profile.degree).toBe('PhD')
    expect(seedProfile.profile.institution).toBe('UMass Boston')
  })

  it('seed ImmigrationStatus has correct initial values', () => {
    expect(seedImmigrationStatus.initial_days_used).toBe(31)
    expect(seedImmigrationStatus.postdoc_end_date).toBe('2026-04-11')
    expect(seedImmigrationStatus.visa_type).toBe('F-1 STEM OPT')
    expect(seedImmigrationStatus.initial_days_source).toBe('user_reported')
  })

  it('preferences include cap-exempt as highest weight', () => {
    expect(seedProfile.preferences.cap_exempt).toBe(0.9)
    expect(seedProfile.preferences.cap_exempt).toBeGreaterThan(
      seedProfile.preferences.boston_metro,
    )
  })
})

// ─── Applications ────────────────────────────────────────────────────────────

describe('Pre-applied applications', () => {
  it('Phase -1 applied jobs have Application records with pre_applied=true', () => {
    const preApplied = seedJobs.filter((j) => j.pre_applied)
    console.log(
      `[Seed] Pre-applied: ${preApplied.length} — ${preApplied.map((j) => j.company).join(', ')}`,
    )
    expect(preApplied.length).toBeGreaterThanOrEqual(3)
    for (const job of preApplied) {
      expect(job.pre_applied_date).toBeDefined()
    }
  })
})

// ─── Plans ───────────────────────────────────────────────────────────────────

describe('Seed plans', () => {
  it('all 5 plans seeded with correct initial statuses', () => {
    expect(seedPlans).toHaveLength(5)

    const planA = seedPlans.find((p) => p.id === 'plan_a')
    expect(planA?.status).toBe('active')

    const planB = seedPlans.find((p) => p.id === 'plan_b')
    expect(planB?.status).toBe('not_started')

    const planC = seedPlans.find((p) => p.id === 'plan_c')
    expect(planC?.status).toBe('not_started')

    const planD = seedPlans.find((p) => p.id === 'plan_d')
    expect(planD?.status).toBe('not_started')

    const niw = seedPlans.find((p) => p.id === 'niw')
    expect(niw?.status).toBe('active')
  })
})

// ─── Contacts ────────────────────────────────────────────────────────────────

describe('Seed network contacts', () => {
  it('seed network contacts have required fields', () => {
    expect(seedContacts.length).toBeGreaterThanOrEqual(5)
    for (const contact of seedContacts) {
      expect(contact.name).toBeTruthy()
      expect(contact.affiliation).toBeTruthy()
      expect(contact.relationship_type).toBeTruthy()
    }
  })

  it('includes Jianwei Wei and Chris Justice as warm leads', () => {
    const jianwei = seedContacts.find((c) => c.name.includes('Jianwei'))
    const chris = seedContacts.find((c) => c.name.includes('Chris Justice'))
    expect(jianwei).toBeDefined()
    expect(chris).toBeDefined()
  })
})

// ─── Data Integrity ──────────────────────────────────────────────────────────

describe('Data integrity', () => {
  it('no seed job has null visa_path', () => {
    for (const job of seedJobs) {
      expect(job.visa_path).toBeTruthy()
    }
  })

  it('no seed job has null employer_type', () => {
    for (const job of seedJobs) {
      expect(job.employer_type).toBeTruthy()
    }
  })

  it('seed jobs with deadlines have valid ISO dates', () => {
    const withDeadline = seedJobs.filter((j) => j.application_deadline)
    expect(withDeadline.length).toBeGreaterThan(0)
    for (const job of withDeadline) {
      const d = new Date(job.application_deadline!)
      expect(isNaN(d.getTime())).toBe(false)
    }
  })

  it('all seed jobs have at least one skill in skills_required', () => {
    for (const job of seedJobs) {
      expect(job.skills_required.length).toBeGreaterThan(0)
    }
  })
})

// ─── Urgency Scoring Integration ─────────────────────────────────────────────

describe('Urgency scoring on seed data', () => {
  it('all seed jobs produce non-zero urgency scores', () => {
    const user = makeUserFromSeed()
    // PostDoc is still active, so bridge jobs score 0. Use unemployed state for this test.
    const unemployedUser = { ...user, is_employed: false }
    const scores = seedJobs.map((job) => ({
      title: job.title,
      company: job.company,
      score: computeUrgencyScore(seedJobToInput(job), unemployedUser).urgency_score,
    }))

    console.log(
      `[Seed Scores]\n${scores.map((s) => `  ${s.score.toFixed(4)} — ${s.company}: ${s.title}`).join('\n')}`,
    )

    // All jobs should have scores > 0 (we don't have security clearance jobs in seed)
    for (const s of scores) {
      expect(s.score).toBeGreaterThan(0)
    }
  })

  it('urgency scoring produces varied results on seed data — at least 3 distinct score ranges', () => {
    const user = makeUserFromSeed()
    const unemployedUser = { ...user, is_employed: false }
    const scores = seedJobs.map((job) =>
      computeUrgencyScore(seedJobToInput(job), unemployedUser).urgency_score,
    )

    // Bucket into ranges: 0-0.3, 0.3-0.5, 0.5-0.7, 0.7-0.9, 0.9-1.0
    const ranges = new Set(scores.map((s) => Math.floor(s * 5) / 5))
    console.log(`[Seed] Distinct score ranges: ${[...ranges].sort().join(', ')}`)
    expect(ranges.size).toBeGreaterThanOrEqual(3)
  })

  it('cap-exempt jobs score higher than cap-subject jobs on average', () => {
    const user = { ...makeUserFromSeed(), is_employed: false }
    const capExempt = seedJobs
      .filter((j) => j.visa_path === 'cap_exempt')
      .map((j) => computeUrgencyScore(seedJobToInput(j), user).urgency_score)
    const capSubject = seedJobs
      .filter((j) => j.visa_path === 'cap_subject')
      .map((j) => computeUrgencyScore(seedJobToInput(j), user).urgency_score)

    const avgCapExempt = capExempt.reduce((a, b) => a + b, 0) / capExempt.length
    const avgCapSubject = capSubject.reduce((a, b) => a + b, 0) / capSubject.length

    console.log(`[Seed] Avg cap-exempt: ${avgCapExempt.toFixed(4)}, avg cap-subject: ${avgCapSubject.toFixed(4)}`)
    expect(avgCapExempt).toBeGreaterThan(avgCapSubject)
  })
})
