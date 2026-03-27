/// <reference lib="deno.ns" />
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts'
import { computeNextRetryAt } from '../_shared/backoff.ts'

const FIXED_NOW = new Date('2026-03-27T12:00:00Z')

Deno.test('retry 0 → 5 minutes', () => {
  const result = computeNextRetryAt(0, FIXED_NOW)
  assertEquals(result.getTime(), FIXED_NOW.getTime() + 5 * 60 * 1000)
})

Deno.test('retry 1 → 30 minutes', () => {
  const result = computeNextRetryAt(1, FIXED_NOW)
  assertEquals(result.getTime(), FIXED_NOW.getTime() + 30 * 60 * 1000)
})

Deno.test('retry 2 → 3 hours', () => {
  const result = computeNextRetryAt(2, FIXED_NOW)
  assertEquals(result.getTime(), FIXED_NOW.getTime() + 180 * 60 * 1000)
})

Deno.test('defaults to Date.now() when no timestamp provided', () => {
  const before = Date.now()
  const result = computeNextRetryAt(0)
  const after = Date.now()
  const expected = 5 * 60 * 1000
  // Result should be ~5 min from now (within the test execution window)
  assertEquals(result.getTime() >= before + expected, true)
  assertEquals(result.getTime() <= after + expected, true)
})
