/**
 * E2E: Score cron endpoint
 * Prevents: Cron endpoint silently failing or not creating task_queue entries
 *
 * Tests the API endpoint directly (no browser needed) using Playwright's request context.
 */
import { test, expect } from '@playwright/test'
import { config } from 'dotenv'
import path from 'path'

// Load .env.local for CRON_SECRET
config({ path: path.resolve(process.cwd(), '.env.local') })

const cronSecret = process.env.CRON_SECRET ?? 'local-dev-cron-secret'

test.describe('Score cron endpoint', () => {
  test('GET /api/cron/score returns success with valid auth', async ({ request }) => {
    const response = await request.get('/api/cron/score', {
      headers: { Authorization: `Bearer ${cronSecret}` },
    })

    expect(response.status()).toBe(200)
    const body = await response.json()
    expect(body.ok).toBe(true)
    // Endpoint returns tasks_created (number) and optionally reason (string)
    expect(typeof body.tasks_created).toBe('number')
  })

  test('GET /api/cron/score rejects without auth', async ({ request }) => {
    const response = await request.get('/api/cron/score')

    expect(response.status()).toBe(401)
  })

  test('GET /api/cron/score rejects wrong secret', async ({ request }) => {
    const response = await request.get('/api/cron/score', {
      headers: { Authorization: 'Bearer wrong-secret-value' },
    })

    expect(response.status()).toBe(401)
  })
})
