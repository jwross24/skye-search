/**
 * Compute next retry timestamp using exponential backoff.
 * Formula: 5 minutes * 6^retryCount
 *   retry 0 → 5 min
 *   retry 1 → 30 min
 *   retry 2 → 3 hours
 */
export function computeNextRetryAt(
  retryCount: number,
  now: Date = new Date(),
): Date {
  const BASE_MS = 5 * 60 * 1000 // 5 minutes
  const delayMs = BASE_MS * Math.pow(6, retryCount)
  return new Date(now.getTime() + delayMs)
}
