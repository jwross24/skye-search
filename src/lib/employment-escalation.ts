/**
 * Employment confirmation escalation levels.
 *
 * When a user has employment_active=true but hasn't confirmed recently,
 * escalation increases over time. The clock NEVER auto-resumes at any level.
 */

export type EscalationLevel = 'none' | 'day7' | 'day14' | 'day30' | 'day45' | 'day60'

/**
 * Compute escalation level based on how overdue a confirmation is.
 *
 * @param daysSinceConfirmed - days since last confirmation, or null if never confirmed
 * @param daysSinceActive - days since employment was toggled on
 * @returns the current escalation level
 *
 * Escalation starts from the later of:
 *   - 7 days after activation (if never confirmed)
 *   - 30 days after last confirmation (if previously confirmed)
 *
 * Overdue days map to escalation tiers:
 *   0-6  days overdue  → day7
 *   7-22 days overdue  → day14
 *   23-37 days overdue → day30
 *   38-52 days overdue → day45
 *   53+  days overdue  → day60
 */
export function getEscalationLevel(
  daysSinceConfirmed: number | null,
  daysSinceActive: number,
): EscalationLevel {
  const daysSinceDue = daysSinceConfirmed !== null
    ? daysSinceConfirmed - 30
    : daysSinceActive - 7

  if (daysSinceDue < 0) return 'none'
  if (daysSinceDue >= 53) return 'day60'
  if (daysSinceDue >= 38) return 'day45'
  if (daysSinceDue >= 23) return 'day30'
  if (daysSinceDue >= 7) return 'day14'
  return 'day7'
}

/**
 * Get user-facing copy for a given escalation level.
 * Tone scales from gentle to firm, but never alarming.
 */
export function getEscalationCopy(
  level: EscalationLevel,
  employer: string,
): { banner: string; detail: string } {
  switch (level) {
    case 'day7':
      return {
        banner: `Is your bridge role at ${employer} still active?`,
        detail: 'A quick confirmation keeps your records accurate.',
      }
    case 'day14':
      return {
        banner: `We haven't confirmed your employment at ${employer} recently.`,
        detail: 'Your clock is paused, but we need to verify. Please confirm your status.',
      }
    case 'day30':
      return {
        banner: `Your employment at ${employer} hasn't been confirmed in over a month.`,
        detail: 'Please confirm within the next 2 weeks so your records stay accurate.',
      }
    case 'day45':
      return {
        banner: `Employment unconfirmed for over 6 weeks at ${employer}.`,
        detail: 'If this role has ended, please update immediately so your clock reflects the correct days.',
      }
    case 'day60':
      return {
        banner: `Employment status at ${employer} has been unverified for over 2 months.`,
        detail: 'Please confirm immediately. If your role has ended, your clock should be running.',
      }
    default:
      return {
        banner: `Is your bridge role at ${employer} still active?`,
        detail: 'Confirming helps keep your records accurate.',
      }
  }
}
