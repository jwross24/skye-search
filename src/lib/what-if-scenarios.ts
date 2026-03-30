/**
 * "What If" scenario projections.
 *
 * Pure date math — no API calls, no AI. Given the current immigration state,
 * computes projected outcomes for 4 predefined scenarios.
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ImmigrationState {
  daysUsed: number
  postdocEndDate: string       // YYYY-MM-DD
  optExpiry: string            // YYYY-MM-DD
  employmentActive: boolean
  today: string                // YYYY-MM-DD
}

export interface ScenarioResult {
  id: 'cap_exempt_may' | 'bridge_may' | 'nothing_june' | 'nothing_august'
  title: string
  subtitle: string
  projectedDaysUsed: number
  projectedStatus: string
  recommendation: string
  tone: 'reassuring' | 'encouraging' | 'actionable' | 'urgent'
}

// ─── Date Helpers ───────────────────────────────────────────────────────────

function daysBetween(a: string, b: string): number {
  const msPerDay = 86400000
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / msPerDay)
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n))
}

/** Count unemployment days between two dates, starting from a given base */
function projectUnemploymentDays(
  state: ImmigrationState,
  eventDate: string,
): number {
  // Days from postdoc end to event date (all unemployed if no employment)
  const postdocEnd = state.postdocEndDate
  const unemployedStart = postdocEnd > state.today ? postdocEnd : state.today

  if (eventDate <= unemployedStart) {
    // Event happens before unemployment starts
    return state.daysUsed
  }

  const newUnemployedDays = daysBetween(unemployedStart, eventDate)
  return clamp(state.daysUsed + newUnemployedDays, 0, 150)
}

// ─── Scenarios ──────────────────────────────────────────────────────────────

function capExemptMay(state: ImmigrationState): ScenarioResult {
  // Assume cap-exempt offer accepted with start date May 15
  const startDate = '2026-05-15'
  const projected = projectUnemploymentDays(state, startDate)

  return {
    id: 'cap_exempt_may',
    title: 'I get a cap-exempt offer in May',
    subtitle: 'University, nonprofit, or government lab',
    projectedDaysUsed: projected,
    projectedStatus: `${projected} of 150 days used`,
    recommendation: projected < 90
      ? "You'd have plenty of runway. H1-B filing can begin immediately — no lottery needed."
      : "Tight but workable. Filing starts on day one — your attorney can prepare the petition now.",
    tone: projected < 90 ? 'reassuring' : 'encouraging',
  }
}

function bridgeMay(state: ImmigrationState): ScenarioResult {
  // Assume bridge employment (20+ hrs, STEM, E-Verify) starts May 1
  const startDate = '2026-05-01'
  const projected = projectUnemploymentDays(state, startDate)

  return {
    id: 'bridge_may',
    title: 'I get a bridge job in May',
    subtitle: '20+ hours, STEM-related, E-Verify employer',
    projectedDaysUsed: projected,
    projectedStatus: `Clock halts at ${projected} days — ${150 - projected} days preserved`,
    recommendation: "Your clock stops and you keep looking. Bridge employment buys time for the right cap-exempt role.",
    tone: 'encouraging',
  }
}

function nothingJune(state: ImmigrationState): ScenarioResult {
  // No employment by June 1
  const checkDate = '2026-06-01'
  const projected = projectUnemploymentDays(state, checkDate)
  const daysRemaining = 150 - projected

  return {
    id: 'nothing_june',
    title: 'Nothing by June',
    subtitle: 'No offer, no bridge employment',
    projectedDaysUsed: projected,
    projectedStatus: `${projected} of 150 days used — ${daysRemaining} remaining`,
    recommendation: daysRemaining > 30
      ? `Time to activate Plan C. Day 1 CPT program deadlines are approaching — research programs now. Canada Express Entry processing typically takes 6+ months after invitation — start the profile now.`
      : "Bridge employment becomes critical. Even part-time qualifying work stops the clock.",
    tone: 'actionable',
  }
}

function nothingAugust(state: ImmigrationState): ScenarioResult {
  // No employment by August 1 — close to OPT expiry
  const checkDate = '2026-08-01'
  const projected = projectUnemploymentDays(state, checkDate)
  const daysToExpiry = daysBetween(checkDate, state.optExpiry)
  const exhausted = projected >= 150

  return {
    id: 'nothing_august',
    title: 'Nothing by August',
    subtitle: 'OPT expiry approaching',
    projectedDaysUsed: Math.min(projected, 150),
    projectedStatus: exhausted
      ? '150 days reached — 60-day grace period begins'
      : `${projected} of 150 days used — ${Math.max(0, daysToExpiry)} days to OPT expiry`,
    recommendation: "This is when the plan shifts — a SEVIS transfer or Canada become the active path. Your attorney can walk you through timing. These decisions are big, but you have them.",
    tone: 'urgent',
  }
}

// ─── Public API ─────────────────────────────────────────────────────────────

export function computeAllScenarios(state: ImmigrationState): ScenarioResult[] {
  return [
    capExemptMay(state),
    bridgeMay(state),
    nothingJune(state),
    nothingAugust(state),
  ]
}

export function computeScenario(
  state: ImmigrationState,
  scenarioId: ScenarioResult['id'],
): ScenarioResult {
  const fns: Record<ScenarioResult['id'], (s: ImmigrationState) => ScenarioResult> = {
    cap_exempt_may: capExemptMay,
    bridge_may: bridgeMay,
    nothing_june: nothingJune,
    nothing_august: nothingAugust,
  }
  return fns[scenarioId](state)
}
