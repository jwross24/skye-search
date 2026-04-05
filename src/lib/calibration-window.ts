/**
 * Calibration window: Sunday 6pm ET through Sunday 11:59pm ET.
 *
 * In development, set SKYE_FORCE_CALIBRATION=1 to always show the card.
 */
export function isCalibrationWindow(now: Date): boolean {
  // Dev override — makes local testing trivial without waiting for Sunday
  if (process.env.SKYE_FORCE_CALIBRATION === '1') return true

  const etParts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    weekday: 'short',
    hour: 'numeric',
    hour12: false,
  }).formatToParts(now)

  const weekday = etParts.find((p) => p.type === 'weekday')?.value ?? ''
  const hourRaw = etParts.find((p) => p.type === 'hour')?.value ?? '0'
  // Intl hour12: false can return '24' for midnight in some environments
  const hour = hourRaw === '24' ? 0 : Number(hourRaw)

  // Sunday 18:00–23:59 ET
  return weekday === 'Sun' && hour >= 18
}
