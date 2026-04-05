/**
 * Returns the Monday of the given date's week at 00:00 Eastern Time.
 * Calibration weeks are keyed to the Monday of each week.
 *
 * Computation is done in application code (not DB expressions) so tests
 * can inject a fixed date without relying on database time functions.
 */
export function getCalibrationWeekStart(date: Date): Date {
  // Convert to Eastern Time parts
  const etParts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  }).formatToParts(date)

  const getValue = (type: string) => etParts.find((p) => p.type === type)?.value ?? ''

  const weekday = getValue('weekday') // 'Sun', 'Mon', 'Tue', etc.
  const year = parseInt(getValue('year'), 10)
  const month = parseInt(getValue('month'), 10) - 1 // 0-indexed
  const day = parseInt(getValue('day'), 10)

  // Day of week: 0=Sun, 1=Mon, ..., 6=Sat
  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  }
  const dow = weekdayMap[weekday] ?? 0

  // Days to subtract to reach Monday (day 1).
  // Sunday (0) → subtract 6, Monday (1) → 0, Tuesday (2) → 1, ...
  const daysToMonday = dow === 0 ? 6 : dow - 1

  // Build Monday's date in Eastern Time as a local Date at midnight ET.
  // We construct an ISO string anchored to ET midnight, then parse it.
  const mondayDay = day - daysToMonday

  // Use Date.UTC to avoid local-timezone interference, then correct for ET offset.
  // Simpler: construct as "YYYY-MM-DD" in ET and parse as UTC midnight —
  // the date string is what we actually store (no time component).
  const mondayDate = new Date(Date.UTC(year, month, mondayDay))
  return mondayDate
}
