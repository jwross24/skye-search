/**
 * Rate limiter utilities for Claude API calls.
 *
 * CircuitBreaker: Pauses requests after consecutive rate-limit failures.
 * scoreOneJobWithRetry: Per-job retry wrapper with 429/529-specific backoff.
 */

// ─── Circuit Breaker ────────────────────────────────────────────────────────

export interface CircuitBreakerOptions {
  /** Number of consecutive failures before opening the circuit */
  threshold: number
  /** Milliseconds to wait when circuit is open before allowing a probe */
  cooldownMs: number
  /** Minimum chunk size to drop to when circuit trips */
  minConcurrency: number
}

export const DEFAULT_CB_OPTIONS: CircuitBreakerOptions = {
  threshold: 3,
  cooldownMs: 30_000,
  minConcurrency: 2,
}

export class CircuitBreaker {
  private consecutiveFailures = 0
  private _isOpen = false
  private _tripped = false
  private _tripCount = 0
  private _cooldownPromise: Promise<void> | null = null
  private opts: CircuitBreakerOptions

  constructor(opts: Partial<CircuitBreakerOptions> = {}) {
    this.opts = { ...DEFAULT_CB_OPTIONS, ...opts }
  }

  get isOpen(): boolean {
    return this._isOpen
  }

  /** Number of times the circuit has tripped in this batch */
  get tripCount(): number {
    return this._tripCount
  }

  /** Whether the circuit has ever tripped (sticky — doesn't reset on half-open) */
  get hasTripped(): boolean {
    return this._tripped
  }

  recordSuccess(): void {
    this.consecutiveFailures = 0
    this._isOpen = false
  }

  recordFailure(): void {
    this.consecutiveFailures++
    if (this.consecutiveFailures >= this.opts.threshold) {
      this._isOpen = true
      this._tripped = true
      this._tripCount++
    }
  }

  /**
   * Wait for cooldown, then transition to half-open. Multiple concurrent callers
   * share the same cooldown promise — only one delay runs, and halfOpen is called
   * once when it resolves.
   */
  async waitForCooldown(): Promise<void> {
    if (!this._cooldownPromise) {
      this._cooldownPromise = delay(this.opts.cooldownMs).then(() => {
        this._isOpen = false
        this.consecutiveFailures = 0
        this._cooldownPromise = null
      })
    }
    await this._cooldownPromise
  }

  /** Effective concurrency: drops to minConcurrency after first trip */
  effectiveConcurrency(baseSize: number): number {
    return this._tripped ? this.opts.minConcurrency : baseSize
  }

  get cooldownMs(): number {
    return this.opts.cooldownMs
  }
}

// ─── Retry with Backoff ─────────────────────────────────────────────────────

export interface RetryOptions {
  /** Max number of retries (on top of the first attempt) */
  maxRetries: number
  /** Base backoff for 429 errors in ms */
  backoffBase429Ms: number
  /** Base backoff for 529 errors in ms */
  backoffBase529Ms: number
  /** Circuit breaker to coordinate across jobs */
  circuitBreaker?: CircuitBreaker
}

export const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxRetries: 3,
  backoffBase429Ms: 2_000,
  backoffBase529Ms: 5_000,
}

export interface RetryResult<T> {
  value: T
  retries: number
}

/**
 * Check if an error is a rate-limit (429) or overloaded (529) error.
 * Works with Anthropic SDK APIError which has a `status` property.
 */
export function isRateLimitError(err: unknown): { is429: boolean; is529: boolean } {
  const status = (err as { status?: number })?.status
  return {
    is429: status === 429,
    is529: status === 529,
  }
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Retry a function with exponential backoff, with special handling for
 * 429 (rate limit) and 529 (overloaded) errors.
 *
 * This runs ON TOP of the Anthropic SDK's built-in retries (maxRetries: 5).
 * By the time our wrapper sees a 429/529, the SDK has already exhausted
 * its own retries. Our wrapper provides a second layer with longer backoff.
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  opts: RetryOptions = DEFAULT_RETRY_OPTIONS,
): Promise<RetryResult<T>> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    // If circuit breaker is open, wait for shared cooldown (prevents probe stampede)
    if (opts.circuitBreaker?.isOpen) {
      await opts.circuitBreaker.waitForCooldown()
    }

    try {
      const value = await fn()
      opts.circuitBreaker?.recordSuccess()
      return { value, retries: attempt }
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))
      const { is429, is529 } = isRateLimitError(err)

      if (is429 || is529) {
        opts.circuitBreaker?.recordFailure()

        // Don't retry if we've exhausted attempts
        if (attempt >= opts.maxRetries) break

        const baseMs = is529 ? opts.backoffBase529Ms : opts.backoffBase429Ms
        const backoffMs = baseMs * Math.pow(2, attempt)
        await delay(backoffMs)
      } else {
        // Non-rate-limit error — don't retry, throw immediately
        throw err
      }
    }
  }

  throw lastError ?? new Error('Max retries exceeded')
}
