import { describe, it, expect } from 'vitest'
import { detectPhase, getMomentumMessage, getMilestone } from './momentum'
import type { MomentumContext } from './momentum'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ctx(overrides: Partial<MomentumContext> = {}): MomentumContext {
  return {
    jobs_reviewed_this_week: 0,
    apps_submitted_this_week: 0,
    total_applications: 0,
    interviews_active: 0,
    days_remaining: 150,
    is_employed: false,
    ...overrides,
  }
}

// ─── Phase detection ──────────────────────────────────────────────────────────

describe('detectPhase', () => {
  it('returns launch for 0-9 apps with ample time', () => {
    expect(detectPhase(ctx({ total_applications: 5, days_remaining: 120 }))).toBe('launch')
  })

  it('returns launch for 0 apps', () => {
    expect(detectPhase(ctx({ total_applications: 0, days_remaining: 90 }))).toBe('launch')
  })

  it('returns active for 10+ apps with 0 interviews and ample time', () => {
    expect(detectPhase(ctx({ total_applications: 10, interviews_active: 0, days_remaining: 90 }))).toBe('active')
  })

  it('returns active for 15 apps', () => {
    expect(detectPhase(ctx({ total_applications: 15, interviews_active: 0, days_remaining: 120 }))).toBe('active')
  })

  it('returns response when interviews_active > 0', () => {
    expect(detectPhase(ctx({ total_applications: 12, interviews_active: 1, days_remaining: 90 }))).toBe('response')
  })

  it('returns response even with only a few total apps if interviews > 0', () => {
    expect(detectPhase(ctx({ total_applications: 3, interviews_active: 2, days_remaining: 80 }))).toBe('response')
  })

  it('returns pressure when days < 60 and not employed', () => {
    expect(detectPhase(ctx({ days_remaining: 59, is_employed: false }))).toBe('pressure')
  })

  it('returns pressure at exactly 1 day remaining', () => {
    expect(detectPhase(ctx({ days_remaining: 1, is_employed: false }))).toBe('pressure')
  })

  it('does NOT return pressure when employed (clock paused)', () => {
    // Employed overrides phase via getMomentumMessage, but detectPhase still
    // sees the days — pressure check only fires when not employed.
    expect(detectPhase(ctx({ days_remaining: 30, is_employed: true }))).toBe('launch')
  })

  it('pressure takes priority over response (critical clock)', () => {
    expect(detectPhase(ctx({ days_remaining: 30, interviews_active: 2, is_employed: false }))).toBe('pressure')
  })
})

// ─── Momentum messages ────────────────────────────────────────────────────────

describe('getMomentumMessage', () => {
  it('returns null when zero activity this week', () => {
    expect(getMomentumMessage(ctx({ jobs_reviewed_this_week: 0, apps_submitted_this_week: 0 }))).toBeNull()
  })

  it('mentions explored N jobs in launch phase', () => {
    const msg = getMomentumMessage(ctx({ jobs_reviewed_this_week: 5 }))
    expect(msg).toContain('explored 5 jobs')
    expect(msg).toContain('momentum')
  })

  it('uses singular "job" for 1 review', () => {
    const msg = getMomentumMessage(ctx({ jobs_reviewed_this_week: 1 }))
    expect(msg).toContain('explored 1 job')
  })

  it('mentions applied to N roles in launch phase', () => {
    const msg = getMomentumMessage(ctx({ apps_submitted_this_week: 2 }))
    expect(msg).toContain('applied to 2 roles')
  })

  it('uses singular "role" for 1 app', () => {
    const msg = getMomentumMessage(ctx({ apps_submitted_this_week: 1 }))
    expect(msg).toContain('applied to 1 role')
  })

  it('employed overrides all phases — mentions clock paused', () => {
    const msg = getMomentumMessage(ctx({
      is_employed: true,
      jobs_reviewed_this_week: 10,
      apps_submitted_this_week: 5,
      days_remaining: 20,
    }))
    expect(msg).toContain('Clock paused')
    expect(msg).toContain('own pace')
  })

  it('active phase normalizes silence with 4-6 week timeline', () => {
    const msg = getMomentumMessage(ctx({
      total_applications: 12,
      interviews_active: 0,
      jobs_reviewed_this_week: 4,
    }))
    expect(msg).toContain('4-6 weeks')
    expect(msg).toContain("You're on track")
  })

  it('active phase with apps mentions timeline', () => {
    const msg = getMomentumMessage(ctx({
      total_applications: 12,
      interviews_active: 0,
      apps_submitted_this_week: 3,
    }))
    expect(msg).toContain('applied to 3 roles')
    expect(msg).toContain('4-6 weeks')
  })

  it('response phase surfaces interview signal', () => {
    const msg = getMomentumMessage(ctx({
      total_applications: 8,
      interviews_active: 1,
      jobs_reviewed_this_week: 3,
    }))
    expect(msg).toContain('interview')
    expect(msg).toContain('signal')
  })

  it('pressure phase surfaces bridge roles', () => {
    const msg = getMomentumMessage(ctx({
      days_remaining: 45,
      is_employed: false,
      jobs_reviewed_this_week: 6,
    }))
    expect(msg?.toLowerCase()).toContain('bridge')
  })

  it('pressure phase with apps mentions bridge roles', () => {
    const msg = getMomentumMessage(ctx({
      days_remaining: 30,
      is_employed: false,
      apps_submitted_this_week: 2,
    }))
    expect(msg).toContain('applied to 2 roles')
    expect(msg?.toLowerCase()).toContain('bridge')
  })

  it('never uses evaluative language like "great job"', () => {
    const msg = getMomentumMessage(ctx({ jobs_reviewed_this_week: 5 }))
    expect(msg?.toLowerCase()).not.toContain('great')
    expect(msg?.toLowerCase()).not.toContain('awesome')
    expect(msg?.toLowerCase()).not.toContain('keep it up')
  })
})

// ─── Milestones ───────────────────────────────────────────────────────────────

describe('getMilestone', () => {
  it('fires first_review when 1 job reviewed and 0 apps', () => {
    const m = getMilestone(ctx({ jobs_reviewed_this_week: 1, total_applications: 0 }), [])
    expect(m?.key).toBe('first_review')
    expect(m?.message).toContain('First job reviewed')
  })

  it('does NOT fire first_review if already seen', () => {
    const m = getMilestone(
      ctx({ jobs_reviewed_this_week: 1, total_applications: 0 }),
      ['first_review'],
    )
    expect(m).toBeNull()
  })

  it('fires first_application at total_applications === 1', () => {
    const m = getMilestone(ctx({ total_applications: 1 }), [])
    expect(m?.key).toBe('first_application')
    expect(m?.message).toContain('First application submitted')
  })

  it('does NOT fire first_application if already seen', () => {
    const m = getMilestone(ctx({ total_applications: 1 }), ['first_application'])
    expect(m).toBeNull()
  })

  it('fires ten_applications at total_applications === 10', () => {
    const m = getMilestone(ctx({ total_applications: 10 }), ['first_application'])
    expect(m?.key).toBe('ten_applications')
    expect(m?.message).toContain('10 applications')
  })

  it('fires ten_applications at 15 apps too (threshold: >=10)', () => {
    const m = getMilestone(ctx({ total_applications: 15 }), ['first_application'])
    expect(m?.key).toBe('ten_applications')
  })

  it('does NOT fire ten_applications if already seen', () => {
    const m = getMilestone(
      ctx({ total_applications: 10 }),
      ['first_application', 'ten_applications'],
    )
    expect(m).toBeNull()
  })

  it('fires first_interview at interviews_active === 1', () => {
    const m = getMilestone(
      ctx({ interviews_active: 1, total_applications: 5 }),
      ['first_application'],
    )
    expect(m?.key).toBe('first_interview')
    expect(m?.message).toContain('interview')
  })

  it('does NOT fire first_interview if already seen', () => {
    const m = getMilestone(
      ctx({ interviews_active: 1, total_applications: 5 }),
      ['first_application', 'first_interview'],
    )
    expect(m).toBeNull()
  })

  it('fires five_reviews_week at jobs_reviewed_this_week === 5', () => {
    const m = getMilestone(ctx({ jobs_reviewed_this_week: 5, total_applications: 0 }), [])
    // first_review would also qualify, but five_reviews_week has higher priority
    // (interviews > ten_apps > first_app > five_reviews > first_review)
    expect(m?.key).toBe('five_reviews_week')
    expect(m?.message).toContain('5 jobs reviewed')
  })

  it('fires first_review for 1 review with no other milestones eligible', () => {
    const m = getMilestone(
      ctx({ jobs_reviewed_this_week: 1, total_applications: 0 }),
      [],
    )
    expect(m?.key).toBe('first_review')
  })

  it('returns null when all applicable milestones are seen', () => {
    const m = getMilestone(
      ctx({ jobs_reviewed_this_week: 3, total_applications: 0 }),
      ['first_review'],
    )
    expect(m).toBeNull()
  })

  it('returns null when no milestones apply', () => {
    // 0 activity, 0 apps, 0 interviews
    const m = getMilestone(ctx(), [])
    expect(m).toBeNull()
  })
})
