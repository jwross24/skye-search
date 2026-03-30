import { describe, it, expect, vi } from 'vitest'
import { CircuitBreaker, retryWithBackoff, isRateLimitError } from './rate-limiter'

// ─── CircuitBreaker ─────────────────────────────────────────────────────────

describe('CircuitBreaker', () => {
  it('starts closed', () => {
    const cb = new CircuitBreaker()
    expect(cb.isOpen).toBe(false)
    expect(cb.hasTripped).toBe(false)
    expect(cb.tripCount).toBe(0)
  })

  it('stays closed below threshold', () => {
    const cb = new CircuitBreaker({ threshold: 3 })
    cb.recordFailure()
    cb.recordFailure()
    expect(cb.isOpen).toBe(false)
  })

  it('opens after threshold consecutive failures', () => {
    const cb = new CircuitBreaker({ threshold: 3 })
    cb.recordFailure()
    cb.recordFailure()
    cb.recordFailure()
    expect(cb.isOpen).toBe(true)
    expect(cb.hasTripped).toBe(true)
    expect(cb.tripCount).toBe(1)
  })

  it('resets consecutive count on success', () => {
    const cb = new CircuitBreaker({ threshold: 3 })
    cb.recordFailure()
    cb.recordFailure()
    cb.recordSuccess()
    cb.recordFailure()
    cb.recordFailure()
    expect(cb.isOpen).toBe(false)
  })

  it('waitForCooldown resets state for probe', async () => {
    const cb = new CircuitBreaker({ threshold: 2, cooldownMs: 1 })
    cb.recordFailure()
    cb.recordFailure()
    expect(cb.isOpen).toBe(true)
    await cb.waitForCooldown()
    expect(cb.isOpen).toBe(false)
    // hasTripped stays true (sticky)
    expect(cb.hasTripped).toBe(true)
  })

  it('waitForCooldown shares a single promise across concurrent callers', async () => {
    const cb = new CircuitBreaker({ threshold: 2, cooldownMs: 1 })
    cb.recordFailure()
    cb.recordFailure()
    expect(cb.isOpen).toBe(true)
    // Multiple concurrent waiters should all resolve after the same cooldown
    const results = await Promise.all([
      cb.waitForCooldown(),
      cb.waitForCooldown(),
      cb.waitForCooldown(),
    ])
    expect(results).toHaveLength(3)
    expect(cb.isOpen).toBe(false)
  })

  it('tracks multiple trip counts', async () => {
    const cb = new CircuitBreaker({ threshold: 2, cooldownMs: 1 })
    cb.recordFailure()
    cb.recordFailure()
    expect(cb.tripCount).toBe(1)
    await cb.waitForCooldown()
    cb.recordFailure()
    cb.recordFailure()
    expect(cb.tripCount).toBe(2)
  })

  it('effectiveConcurrency returns base before trip', () => {
    const cb = new CircuitBreaker({ minConcurrency: 2 })
    expect(cb.effectiveConcurrency(5)).toBe(5)
  })

  it('effectiveConcurrency returns minConcurrency after trip', () => {
    const cb = new CircuitBreaker({ threshold: 2, minConcurrency: 2 })
    cb.recordFailure()
    cb.recordFailure()
    expect(cb.effectiveConcurrency(5)).toBe(2)
  })
})

// ─── isRateLimitError ───────────────────────────────────────────────────────

describe('isRateLimitError', () => {
  it('detects 429', () => {
    const { is429, is529 } = isRateLimitError({ status: 429 })
    expect(is429).toBe(true)
    expect(is529).toBe(false)
  })

  it('detects 529', () => {
    const { is429, is529 } = isRateLimitError({ status: 529 })
    expect(is429).toBe(false)
    expect(is529).toBe(true)
  })

  it('returns false for other errors', () => {
    const { is429, is529 } = isRateLimitError({ status: 500 })
    expect(is429).toBe(false)
    expect(is529).toBe(false)
  })

  it('handles errors without status', () => {
    const { is429, is529 } = isRateLimitError(new Error('network'))
    expect(is429).toBe(false)
    expect(is529).toBe(false)
  })
})

// ─── retryWithBackoff ───────────────────────────────────────────────────────

describe('retryWithBackoff', () => {
  it('returns on first success with 0 retries', async () => {
    const fn = vi.fn().mockResolvedValue('ok')
    const result = await retryWithBackoff(fn, {
      maxRetries: 3,
      backoffBase429Ms: 1,
      backoffBase529Ms: 1,
    })
    expect(result).toEqual({ value: 'ok', retries: 0 })
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('retries on 429 and succeeds', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce({ status: 429, message: 'rate limited' })
      .mockResolvedValue('ok')

    const result = await retryWithBackoff(fn, {
      maxRetries: 3,
      backoffBase429Ms: 1,   // 1ms for fast tests
      backoffBase529Ms: 1,
    })

    expect(result).toEqual({ value: 'ok', retries: 1 })
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('retries on 529 and succeeds', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce({ status: 529, message: 'overloaded' })
      .mockRejectedValueOnce({ status: 529, message: 'overloaded' })
      .mockResolvedValue('ok')

    const result = await retryWithBackoff(fn, {
      maxRetries: 3,
      backoffBase429Ms: 1,
      backoffBase529Ms: 1,
    })

    expect(result).toEqual({ value: 'ok', retries: 2 })
    expect(fn).toHaveBeenCalledTimes(3)
  })

  it('throws after exhausting retries on 429', async () => {
    const fn = vi.fn().mockRejectedValue({ status: 429, message: 'rate limited' })

    await expect(
      retryWithBackoff(fn, {
        maxRetries: 2,
        backoffBase429Ms: 1,
        backoffBase529Ms: 1,
      }),
    ).rejects.toThrow()

    // 1 initial + 2 retries = 3 total
    expect(fn).toHaveBeenCalledTimes(3)
  })

  it('throws immediately on non-rate-limit errors', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('auth failed'))

    await expect(
      retryWithBackoff(fn, {
        maxRetries: 3,
        backoffBase429Ms: 1,
        backoffBase529Ms: 1,
      }),
    ).rejects.toThrow('auth failed')

    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('throws immediately on non-retryable API errors (400, 401)', async () => {
    const fn = vi.fn().mockRejectedValue({ status: 401, message: 'unauthorized' })

    await expect(
      retryWithBackoff(fn, {
        maxRetries: 3,
        backoffBase429Ms: 1,
        backoffBase529Ms: 1,
      }),
    ).rejects.toMatchObject({ status: 401 })

    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('coordinates with circuit breaker', async () => {
    const cb = new CircuitBreaker({ threshold: 2, cooldownMs: 1, minConcurrency: 1 })
    const fn = vi.fn()
      .mockRejectedValueOnce({ status: 429, message: 'rate limited' })
      .mockRejectedValueOnce({ status: 429, message: 'rate limited' })
      .mockResolvedValue('ok')

    const result = await retryWithBackoff(fn, {
      maxRetries: 3,
      backoffBase429Ms: 1,
      backoffBase529Ms: 1,
      circuitBreaker: cb,
    })

    expect(result).toEqual({ value: 'ok', retries: 2 })
    expect(cb.hasTripped).toBe(true)
    expect(cb.tripCount).toBe(1)
  })

  it('circuit breaker pauses before probe after trip', async () => {
    const cb = new CircuitBreaker({ threshold: 1, cooldownMs: 1, minConcurrency: 1 })
    const fn = vi.fn()
      .mockRejectedValueOnce({ status: 529, message: 'overloaded' })
      .mockResolvedValue('ok')

    const result = await retryWithBackoff(fn, {
      maxRetries: 2,
      backoffBase429Ms: 1,
      backoffBase529Ms: 1,
      circuitBreaker: cb,
    })

    // First failure trips the circuit (threshold=1), second attempt goes through after cooldown
    expect(result).toEqual({ value: 'ok', retries: 1 })
    expect(cb.hasTripped).toBe(true)
  })

  it('uses longer backoff for 529 vs 429', async () => {
    const delays: number[] = []
    const originalSetTimeout = globalThis.setTimeout
    vi.spyOn(globalThis, 'setTimeout').mockImplementation((fn: () => void, ms?: number) => {
      if (ms && ms > 0) delays.push(ms)
      return originalSetTimeout(fn, 0) // immediate for test speed
    })

    const fn429 = vi.fn()
      .mockRejectedValueOnce({ status: 429, message: 'rate limited' })
      .mockResolvedValue('ok')

    await retryWithBackoff(fn429, {
      maxRetries: 1,
      backoffBase429Ms: 100,
      backoffBase529Ms: 500,
    })

    const delay429 = delays[delays.length - 1]

    const fn529 = vi.fn()
      .mockRejectedValueOnce({ status: 529, message: 'overloaded' })
      .mockResolvedValue('ok')

    await retryWithBackoff(fn529, {
      maxRetries: 1,
      backoffBase429Ms: 100,
      backoffBase529Ms: 500,
    })

    const delay529 = delays[delays.length - 1]

    expect(delay529).toBeGreaterThan(delay429)

    vi.restoreAllMocks()
  })
})
