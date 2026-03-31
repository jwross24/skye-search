import { describe, it, expect } from 'vitest'
import {
  computeUrgencyScore,
  computeUrgencyScores,
  type JobInput,
  type UserState,
  type ApplicationContext,
} from '../urgency-scoring'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const TODAY = '2026-03-24'

function makeUser(overrides: Partial<UserState> = {}): UserState {
  return {
    days_remaining: 119, // 150 - 31 (initial_days_used)
    is_employed: false,
    offer_accepted_not_started: false,
    employment_end_date: null,
    in_grace_period: false,
    today: TODAY,
    ...overrides,
  }
}

function makeJob(overrides: Partial<JobInput> = {}): JobInput {
  return {
    visa_path: 'cap_exempt',
    employer_type: 'university',
    cap_exempt_confidence: 'confirmed',
    employment_type: 'full_time',
    source_type: 'academic',
    location: null,
    h1b_sponsor_count: null,
    application_deadline: null,
    application_complexity: null,
    indexed_date: TODAY,
    ...overrides,
  }
}

function makeApp(overrides: Partial<ApplicationContext> = {}): ApplicationContext {
  return {
    has_active_application: false,
    has_interview: false,
    ...overrides,
  }
}

function logScore(label: string, result: ReturnType<typeof computeUrgencyScore>) {
  const mods = result.modifiers.map((m) => `${m.name}: ${m.value.toFixed(4)}`).join(', ')
  console.log(
    `[Score] ${label}: base=${result.base_score.toFixed(4)}, mods=[${mods}], ` +
      `before_clamp=${result.final_before_clamp.toFixed(4)}, final=${result.urgency_score.toFixed(4)}`,
  )
}

// ─── Base Score Assignment ───────────────────────────────────────────────────

describe('Base score assignment', () => {
  it('cap-exempt full-time confirmed -> 0.85', () => {
    const result = computeUrgencyScore(
      makeJob({ cap_exempt_confidence: 'confirmed' }),
      makeUser(),
    )
    logScore('cap-exempt FT confirmed', result)
    expect(result.base_score).toBe(0.85)
  })

  it('cap-exempt part-time at 119 days remaining -> ~0.7017', () => {
    // clock_pressure = 1 - 119/150 = 0.20666...
    // score = 0.65 + 0.25 * 0.20666 = 0.70166...
    const result = computeUrgencyScore(
      makeJob({ employment_type: 'part_time' }),
      makeUser({ days_remaining: 119 }),
    )
    logScore('bridge at 119 days', result)
    expect(result.base_score).toBeCloseTo(0.7017, 3)
  })

  it('cap-exempt part-time at 30 days -> 0.85 (crossover)', () => {
    // clock_pressure = 1 - 30/150 = 0.80
    // score = 0.65 + 0.25 * 0.80 = 0.85
    const result = computeUrgencyScore(
      makeJob({ employment_type: 'part_time', employer_type: 'private_sector' }),
      makeUser({ days_remaining: 30 }),
    )
    logScore('bridge at 30 days (crossover)', result)
    expect(result.base_score).toBeCloseTo(0.85, 10)
  })

  it('cap-exempt part-time at 15 days -> 0.8875 (bridge dominates)', () => {
    // clock_pressure = 1 - 15/150 = 0.90
    // score = 0.65 + 0.25 * 0.90 = 0.875
    const result = computeUrgencyScore(
      makeJob({ employment_type: 'part_time', employer_type: 'private_sector' }),
      makeUser({ days_remaining: 15 }),
    )
    logScore('bridge at 15 days', result)
    expect(result.base_score).toBeCloseTo(0.875, 3)
  })

  it('Canada role -> 0.60', () => {
    const result = computeUrgencyScore(
      makeJob({ visa_path: 'canada', employer_type: 'university' }),
      makeUser(),
    )
    logScore('Canada', result)
    expect(result.base_score).toBe(0.60)
  })

  it('OPT-compatible E-Verify -> 0.50', () => {
    const result = computeUrgencyScore(
      makeJob({ visa_path: 'opt_compatible', employer_type: 'private_sector' }),
      makeUser(),
    )
    logScore('OPT-compatible', result)
    expect(result.base_score).toBe(0.50)
  })

  it('cap-subject -> 0.40', () => {
    const result = computeUrgencyScore(
      makeJob({ visa_path: 'cap_subject', employer_type: 'private_sector' }),
      makeUser(),
    )
    logScore('cap-subject', result)
    expect(result.base_score).toBe(0.40)
  })

  it('security clearance required -> -1.0', () => {
    const result = computeUrgencyScore(
      makeJob({ requires_security_clearance: true }),
      makeUser(),
    )
    logScore('security clearance', result)
    expect(result.urgency_score).toBe(-1.0)
  })

  it('citizenship required -> -1.0', () => {
    const result = computeUrgencyScore(
      makeJob({ requires_citizenship: true }),
      makeUser(),
    )
    expect(result.urgency_score).toBe(-1.0)
  })

  it('expired deadline -> -1.0', () => {
    const result = computeUrgencyScore(
      makeJob({ application_deadline: '2026-03-20' }), // 4 days ago
      makeUser(),
    )
    expect(result.urgency_score).toBe(-1.0)
    expect(result.modifiers[0].name).toBe('expired_deadline')
  })

  it('expired deadline with until_filled source -> NOT -1.0', () => {
    const result = computeUrgencyScore(
      makeJob({
        application_deadline: '2026-03-20',
        source_type: 'until_filled',
      }),
      makeUser(),
    )
    expect(result.urgency_score).toBeGreaterThan(0)
  })

  it('deadline today -> NOT expired (score > 0)', () => {
    const result = computeUrgencyScore(
      makeJob({ application_deadline: TODAY }),
      makeUser(),
    )
    expect(result.urgency_score).toBeGreaterThan(0)
  })

  it('deadline tomorrow -> NOT expired', () => {
    const result = computeUrgencyScore(
      makeJob({ application_deadline: '2026-03-25' }),
      makeUser(),
    )
    expect(result.urgency_score).toBeGreaterThan(0)
  })

  it('null deadline -> NOT expired', () => {
    const result = computeUrgencyScore(
      makeJob({ application_deadline: null }),
      makeUser(),
    )
    expect(result.urgency_score).toBeGreaterThan(0)
  })
})

// ─── Confidence Discounts ────────────────────────────────────────────────────

describe('Confidence discounts', () => {
  it('cap-exempt likely confidence -> 0.85 * 0.95 = 0.8075', () => {
    const result = computeUrgencyScore(
      makeJob({ cap_exempt_confidence: 'likely' }),
      makeUser(),
    )
    logScore('likely confidence', result)
    expect(result.base_score).toBeCloseTo(0.8075, 4)
  })

  it('cap-exempt unverified -> 0.85 * 0.85 = 0.7225', () => {
    const result = computeUrgencyScore(
      makeJob({ cap_exempt_confidence: 'unverified' }),
      makeUser(),
    )
    logScore('unverified confidence', result)
    expect(result.base_score).toBeCloseTo(0.7225, 4)
  })

  it('cap-exempt none confidence -> 0.85 * 0.85 = 0.7225', () => {
    const result = computeUrgencyScore(
      makeJob({ cap_exempt_confidence: 'none' }),
      makeUser(),
    )
    expect(result.base_score).toBeCloseTo(0.7225, 4)
  })
})

// ─── Grace Period Override ───────────────────────────────────────────────────

describe('Grace period override', () => {
  it('in grace period: all US jobs -> 0.0', () => {
    const user = makeUser({ in_grace_period: true })
    const capExempt = computeUrgencyScore(makeJob({ visa_path: 'cap_exempt' }), user)
    const optCompat = computeUrgencyScore(makeJob({ visa_path: 'opt_compatible' }), user)
    const capSubject = computeUrgencyScore(makeJob({ visa_path: 'cap_subject' }), user)

    expect(capExempt.urgency_score).toBe(0.0)
    expect(optCompat.urgency_score).toBe(0.0)
    expect(capSubject.urgency_score).toBe(0.0)
  })

  it('in grace period: Canada -> 0.95', () => {
    const result = computeUrgencyScore(
      makeJob({ visa_path: 'canada' }),
      makeUser({ in_grace_period: true }),
    )
    logScore('grace period Canada', result)
    expect(result.urgency_score).toBe(0.95)
  })
})

// ─── Bridge Zeroing When Employed ────────────────────────────────────────────

describe('Bridge zeroing when employed', () => {
  it('bridge score -> 0 when employed and started', () => {
    const result = computeUrgencyScore(
      makeJob({ employment_type: 'part_time' }),
      makeUser({ is_employed: true }),
    )
    logScore('bridge while employed', result)
    expect(result.base_score).toBe(0)
  })

  it('bridge score halved when offer accepted but not started', () => {
    const user = makeUser({
      days_remaining: 119,
      offer_accepted_not_started: true,
    })
    const result = computeUrgencyScore(
      makeJob({ employment_type: 'part_time' }),
      user,
    )
    logScore('bridge with offer accepted', result)
    // raw_bridge = 0.65 + 0.25 * (1 - 119/150) = 0.7017
    // halved = 0.3508
    expect(result.base_score).toBeCloseTo(0.7017 / 2, 3)
  })

  it('full-time cap-exempt remains 0.85 even when offer_accepted for bridge', () => {
    const result = computeUrgencyScore(
      makeJob({ employment_type: 'full_time' }),
      makeUser({ offer_accepted_not_started: true }),
    )
    expect(result.base_score).toBe(0.85)
  })
})

// ─── Modifier Stacking ──────────────────────────────────────────────────────

describe('Modifier stacking', () => {
  it('Boston + high H1B filer + direct fit + deadline 5 days = clamped to 1.0', () => {
    const result = computeUrgencyScore(
      makeJob({
        location: 'Boston, MA',
        h1b_sponsor_count: 30,
        cap_exempt_confidence: 'confirmed',
        application_deadline: '2026-03-29', // 5 days from today
      }),
      makeUser(),
    )
    logScore('full modifier stack', result)
    // base 0.85 + 0.05 (boston) + 0.03 (h1b) + 0.02 (direct fit) + 0.10 (deadline) = 1.05
    expect(result.urgency_score).toBe(1.0) // clamped
    expect(result.final_before_clamp).toBeCloseTo(1.05, 2)
  })

  it('freshness decay: 3 weeks past 7-day industry window -> -0.06', () => {
    // indexed_date 28 days ago, industry window = 7 days, past = 21 days = 3 weeks
    const result = computeUrgencyScore(
      makeJob({
        visa_path: 'cap_subject',
        employer_type: 'private_sector',
        source_type: 'industry',
        indexed_date: '2026-02-24', // 28 days before 2026-03-24
      }),
      makeUser(),
    )
    logScore('freshness decay 3 weeks', result)
    const decayMod = result.modifiers.find((m) => m.name === 'freshness_decay')
    expect(decayMod).toBeDefined()
    expect(decayMod!.value).toBeCloseTo(-0.06, 2)
  })

  it('freshness penalty floor: -0.30 max', () => {
    // 20 weeks past window: 20 * 0.02 = 0.40, but floor is -0.30
    const result = computeUrgencyScore(
      makeJob({
        visa_path: 'cap_subject',
        employer_type: 'private_sector',
        source_type: 'industry',
        indexed_date: '2025-10-20', // ~155 days ago, past 7-day window by ~148 days = ~21 weeks
      }),
      makeUser(),
    )
    logScore('freshness floor', result)
    const decayMod = result.modifiers.find((m) => m.name === 'freshness_decay')
    expect(decayMod).toBeDefined()
    expect(decayMod!.value).toBe(-0.30)
  })

  it('until filled at 120 days -> -0.05', () => {
    const result = computeUrgencyScore(
      makeJob({
        visa_path: 'cap_exempt',
        source_type: 'until_filled',
        indexed_date: '2025-11-24', // 120 days ago
      }),
      makeUser(),
    )
    logScore('stale until_filled', result)
    const staleMod = result.modifiers.find((m) => m.name === 'stale_until_filled')
    expect(staleMod).toBeDefined()
    expect(staleMod!.value).toBe(-0.05)
  })

  it('deadline 10 days -> +0.05 (14-day bracket, not 7-day)', () => {
    const result = computeUrgencyScore(
      makeJob({ application_deadline: '2026-04-03' }), // 10 days
      makeUser(),
    )
    const deadlineMod = result.modifiers.find((m) => m.name === 'deadline_sprint_14d')
    expect(deadlineMod).toBeDefined()
    expect(deadlineMod!.value).toBe(0.05)
  })
})

// ─── Clock Pressure Dynamics ─────────────────────────────────────────────────

describe('Clock pressure dynamics (crossover verification)', () => {
  // Use private_sector employer_type to avoid academic penalty at low days
  const bridgeJob = makeJob({ employment_type: 'part_time', employer_type: 'private_sector' })
  const ftJob = makeJob({
    employment_type: 'full_time',
    employer_type: 'private_sector',
    cap_exempt_confidence: 'confirmed',
  })

  it('at 119 days: bridge (0.7017) < full-time (0.85)', () => {
    const user = makeUser({ days_remaining: 119 })
    const bridge = computeUrgencyScore(bridgeJob, user)
    const ft = computeUrgencyScore(ftJob, user)
    logScore('bridge@119', bridge)
    logScore('ft@119', ft)
    expect(bridge.base_score).toBeLessThan(ft.base_score)
    expect(bridge.base_score).toBeCloseTo(0.7017, 3)
  })

  it('at 45 days: bridge (0.825) < full-time (0.85)', () => {
    // clock_pressure = 1 - 45/150 = 0.70
    // bridge = 0.65 + 0.25 * 0.70 = 0.825
    const user = makeUser({ days_remaining: 45 })
    const bridge = computeUrgencyScore(bridgeJob, user)
    const ft = computeUrgencyScore(ftJob, user)
    logScore('bridge@45', bridge)
    logScore('ft@45', ft)
    expect(bridge.base_score).toBeLessThan(ft.base_score)
    expect(bridge.base_score).toBeCloseTo(0.825, 3)
  })

  it('at 30 days: bridge (0.85) = full-time (0.85) (crossover)', () => {
    const user = makeUser({ days_remaining: 30 })
    const bridge = computeUrgencyScore(bridgeJob, user)
    const ft = computeUrgencyScore(ftJob, user)
    logScore('bridge@30 (crossover)', bridge)
    logScore('ft@30', ft)
    expect(bridge.base_score).toBeCloseTo(ft.base_score, 10)
    expect(bridge.base_score).toBeCloseTo(0.85, 10)
  })

  it('at 15 days: bridge (0.875) > full-time (0.85)', () => {
    // clock_pressure = 1 - 15/150 = 0.90
    // bridge = 0.65 + 0.25 * 0.90 = 0.875
    const user = makeUser({ days_remaining: 15 })
    const bridge = computeUrgencyScore(bridgeJob, user)
    const ft = computeUrgencyScore(ftJob, user)
    logScore('bridge@15', bridge)
    logScore('ft@15', ft)
    expect(bridge.base_score).toBeGreaterThan(ft.base_score)
    expect(bridge.base_score).toBeCloseTo(0.875, 3)
  })

  it('full-time cap-exempt at 15 days does not drop below unmodified bridge', () => {
    const user = makeUser({ days_remaining: 15 })
    const ft = computeUrgencyScore(ftJob, user)
    // FT base is 0.85, bridge base is 0.875 — FT doesn't drop, bridge rises
    expect(ft.base_score).toBe(0.85)
  })
})

// ─── Academic Urgency Penalty ────────────────────────────────────────────────

describe('Academic urgency penalty', () => {
  const academicFTJob = makeJob({
    employer_type: 'university',
    employment_type: 'full_time',
    cap_exempt_confidence: 'confirmed',
  })

  it('academic full-time at 60 days -> no penalty (factor = 0)', () => {
    const result = computeUrgencyScore(academicFTJob, makeUser({ days_remaining: 60 }))
    logScore('academic@60', result)
    const penalty = result.modifiers.find(
      (m) => m.name === 'academic_urgency_penalty' || m.name === 'academic_dead_zone_cliff',
    )
    expect(penalty).toBeUndefined()
  })

  it('academic full-time at 30 days -> -0.075', () => {
    // factor = (60 - 30) / 60 = 0.5, penalty = -0.15 * 0.5 = -0.075
    const result = computeUrgencyScore(academicFTJob, makeUser({ days_remaining: 30 }))
    logScore('academic@30', result)
    const penalty = result.modifiers.find((m) => m.name === 'academic_urgency_penalty')
    expect(penalty).toBeDefined()
    expect(penalty!.value).toBeCloseTo(-0.075, 4)
  })

  it('academic full-time at 21 days cold -> -0.40 dead zone cliff', () => {
    const result = computeUrgencyScore(
      academicFTJob,
      makeUser({ days_remaining: 21 }),
      makeApp(), // no active application
    )
    logScore('academic@21 cold', result)
    const cliff = result.modifiers.find((m) => m.name === 'academic_dead_zone_cliff')
    expect(cliff).toBeDefined()
    expect(cliff!.value).toBe(-0.40)
  })

  it('academic with active interview -> penalty SUPPRESSED', () => {
    const result = computeUrgencyScore(
      academicFTJob,
      makeUser({ days_remaining: 21 }),
      makeApp({ has_interview: true }),
    )
    logScore('academic@21 with interview', result)
    const penalty = result.modifiers.find(
      (m) => m.name === 'academic_urgency_penalty' || m.name === 'academic_dead_zone_cliff',
    )
    expect(penalty).toBeUndefined()
  })

  it('dead zone cliff suppressed if has active application', () => {
    const result = computeUrgencyScore(
      academicFTJob,
      makeUser({ days_remaining: 15 }),
      makeApp({ has_active_application: true }),
    )
    // Cliff requires kanban_status IS NULL (no existing application)
    // has_active_application: true → cliff suppressed, gradual penalty applies instead
    const cliff = result.modifiers.find((m) => m.name === 'academic_dead_zone_cliff')
    expect(cliff).toBeUndefined()
    const gradual = result.modifiers.find((m) => m.name === 'academic_urgency_penalty')
    expect(gradual).toBeDefined()
  })

  it('academic part-time bridge jobs do NOT get academic penalty', () => {
    const bridgeJob = makeJob({
      employer_type: 'university',
      employment_type: 'part_time',
    })
    const result = computeUrgencyScore(bridgeJob, makeUser({ days_remaining: 20 }))
    const penalty = result.modifiers.find(
      (m) => m.name === 'academic_urgency_penalty' || m.name === 'academic_dead_zone_cliff',
    )
    expect(penalty).toBeUndefined()
  })
})

// ─── Ranking Correctness ─────────────────────────────────────────────────────

describe('Ranking correctness', () => {
  it('10 mixed jobs sort correctly by urgency', () => {
    const user = makeUser({ days_remaining: 100 })
    const jobs: Array<{ label: string; job: JobInput }> = [
      { label: 'Cap-exempt FT confirmed', job: makeJob({ cap_exempt_confidence: 'confirmed' }) },
      { label: 'Cap-exempt FT likely', job: makeJob({ cap_exempt_confidence: 'likely' }) },
      { label: 'Cap-exempt FT unverified', job: makeJob({ cap_exempt_confidence: 'unverified' }) },
      { label: 'Bridge part-time', job: makeJob({ employment_type: 'part_time', employer_type: 'private_sector' }) },
      { label: 'Canada', job: makeJob({ visa_path: 'canada', employer_type: 'university' }) },
      { label: 'OPT-compatible', job: makeJob({ visa_path: 'opt_compatible', employer_type: 'private_sector' }) },
      { label: 'Cap-subject', job: makeJob({ visa_path: 'cap_subject', employer_type: 'private_sector' }) },
      { label: 'Unknown visa', job: makeJob({ visa_path: 'unknown', employer_type: 'unknown' }) },
      { label: 'Security clearance', job: makeJob({ requires_security_clearance: true }) },
      { label: 'Cap-exempt FT Boston', job: makeJob({ location: 'Boston, MA', cap_exempt_confidence: 'confirmed' }) },
    ]

    const scored = jobs.map(({ label, job }) => ({
      label,
      score: computeUrgencyScore(job, user).urgency_score,
    }))

    scored.sort((a, b) => b.score - a.score)
    console.log('[Ranking]', scored.map((s) => `${s.label}: ${s.score.toFixed(4)}`).join('\n  '))

    // Boston cap-exempt should be #1 (0.85 + 0.05 + 0.02 = 0.92)
    expect(scored[0].label).toBe('Cap-exempt FT Boston')
    // Security clearance should be last
    expect(scored[scored.length - 1].label).toBe('Security clearance')
    // Cap-subject above unknown
    const capSubjectIdx = scored.findIndex((s) => s.label === 'Cap-subject')
    const unknownIdx = scored.findIndex((s) => s.label === 'Unknown visa')
    expect(capSubjectIdx).toBeLessThan(unknownIdx)
  })

  it('deadline sprint +0.10 can elevate mediocre job to top 3', () => {
    const user = makeUser({ days_remaining: 100 })
    const jobs: Array<{ label: string; job: JobInput }> = [
      { label: 'Cap-exempt FT', job: makeJob({ cap_exempt_confidence: 'confirmed' }) },
      { label: 'Cap-exempt FT likely', job: makeJob({ cap_exempt_confidence: 'likely' }) },
      {
        label: 'OPT with deadline sprint',
        job: makeJob({
          visa_path: 'opt_compatible',
          employer_type: 'private_sector',
          application_deadline: '2026-03-28', // 4 days = +0.10
        }),
      },
      { label: 'Canada', job: makeJob({ visa_path: 'canada' }) },
      { label: 'Cap-subject', job: makeJob({ visa_path: 'cap_subject', employer_type: 'private_sector' }) },
    ]

    const scored = jobs
      .map(({ label, job }) => ({
        label,
        score: computeUrgencyScore(job, user).urgency_score,
      }))
      .sort((a, b) => b.score - a.score)

    console.log('[Deadline sprint ranking]', scored.map((s) => `${s.label}: ${s.score.toFixed(4)}`).join('\n  '))

    // OPT with deadline sprint: 0.50 + 0.10 = 0.60 — should be in top 3
    // (ahead of Canada 0.60, cap-subject 0.40)
    const optIdx = scored.findIndex((s) => s.label === 'OPT with deadline sprint')
    expect(optIdx).toBeLessThanOrEqual(3)
  })
})

// ─── Batch Scoring Performance ───────────────────────────────────────────────

describe('Batch scoring', () => {
  it('computeUrgencyScores processes 50 jobs within 100ms', () => {
    const user = makeUser()
    const jobs = Array.from({ length: 50 }, (_, i) =>
      makeJob({
        visa_path: i % 5 === 0 ? 'cap_exempt' : i % 5 === 1 ? 'canada' : 'cap_subject',
        employer_type: i % 3 === 0 ? 'university' : 'private_sector',
      }),
    )

    const start = performance.now()
    const results = computeUrgencyScores(jobs, user)
    const elapsed = performance.now() - start

    console.log(`[Perf] 50 jobs scored in ${elapsed.toFixed(2)}ms`)
    expect(results).toHaveLength(50)
    expect(elapsed).toBeLessThan(100)
  })

  it('score recomputation after employment_active change', () => {
    const job = makeJob({ employment_type: 'part_time' })

    const unemployed = computeUrgencyScore(job, makeUser({ is_employed: false }))
    const employed = computeUrgencyScore(job, makeUser({ is_employed: true }))

    expect(unemployed.base_score).toBeGreaterThan(0)
    expect(employed.base_score).toBe(0)
  })
})

// ─── Edge Cases ──────────────────────────────────────────────────────────────

describe('Edge cases', () => {
  it('zero days remaining -> maximum clock pressure', () => {
    const bridge = computeUrgencyScore(
      makeJob({ employment_type: 'part_time', employer_type: 'private_sector' }),
      makeUser({ days_remaining: 0 }),
    )
    // clock_pressure = 1.0, bridge = 0.65 + 0.25 * 1.0 = 0.90
    expect(bridge.base_score).toBe(0.90)
  })

  it('negative days remaining clamps correctly', () => {
    // Edge case: more days used than 150
    const result = computeUrgencyScore(
      makeJob({ employment_type: 'part_time', employer_type: 'private_sector' }),
      makeUser({ days_remaining: -10 }),
    )
    // clock_pressure = 1 - (-10/150) = 1.0667
    // bridge = 0.65 + 0.25 * 1.0667 = 0.9167
    expect(result.urgency_score).toBeCloseTo(0.9167, 3)
  })

  it('unknown visa path -> 0 base score', () => {
    const result = computeUrgencyScore(
      makeJob({ visa_path: 'unknown', employer_type: 'unknown' }),
      makeUser(),
    )
    expect(result.base_score).toBe(0)
  })

  it('quick_apply modifier only activates at high clock pressure (>0.6)', () => {
    const job = makeJob({
      visa_path: 'cap_exempt',
      application_complexity: 'quick_apply',
    })

    // Low pressure (119 days, pressure ~0.21) — no modifier
    const low = computeUrgencyScore(job, makeUser({ days_remaining: 119 }))
    expect(low.modifiers.find((m) => m.name === 'quick_apply_high_pressure')).toBeUndefined()

    // High pressure (50 days, pressure ~0.67) — modifier applies
    const high = computeUrgencyScore(job, makeUser({ days_remaining: 50 }))
    expect(high.modifiers.find((m) => m.name === 'quick_apply_high_pressure')).toBeDefined()
  })

  it('Cambridge MA counts as Boston metro', () => {
    const result = computeUrgencyScore(
      makeJob({ location: 'Cambridge, MA' }),
      makeUser(),
    )
    const bostonMod = result.modifiers.find((m) => m.name === 'boston_metro')
    expect(bostonMod).toBeDefined()
  })
})
