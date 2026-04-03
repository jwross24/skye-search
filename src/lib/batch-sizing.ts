/**
 * Dynamic batch sizing based on clock pressure and employment status.
 *
 * Unemployed: batch scales with urgency (8 → 15 as days drain).
 * Employed full-time cap-exempt: maintenance mode (3 cards).
 * Employed bridge/part-time: fixed 8 (clock paused, still searching).
 */

export type EmploymentMode = 'cap_exempt' | 'bridge' | null

export function getBatchSize(
  daysRemaining: number,
  isEmployed: boolean,
  employmentMode: EmploymentMode,
): number {
  // Employment overrides clock pressure
  if (isEmployed) {
    return employmentMode === 'cap_exempt' ? 3 : 8
  }

  // Unemployed: scale by clock pressure
  if (daysRemaining >= 90) return 8
  if (daysRemaining >= 60) return 10
  if (daysRemaining >= 30) return 12
  return 15
}

/**
 * Warm framing message when batch is larger than the default 8.
 * Never alarm language — frames the increase as a positive.
 */
export function getBatchFramingMessage(batchSize: number): string | null {
  if (batchSize <= 8) return null
  return 'We found a few extra strong matches today'
}
