/**
 * Auth setup: logs in the test user and saves browser state for other specs.
 * Prevents: every test needing to re-authenticate through the login page.
 */
import { test as setup, expect } from '@playwright/test'
import path from 'path'

const AUTH_FILE = path.join(__dirname, '..', '.auth', 'user.json')

setup('authenticate test user', async ({ page }) => {
  await page.goto('/login')
  await page.fill('input[name="email"]', 'dev@skye-search.test')
  await page.fill('input[name="password"]', 'testpass123')
  await page.click('button:has-text("Sign in")')

  // Wait for redirect to home page (not /login)
  await page.waitForURL((url) => !url.pathname.includes('/login'), {
    timeout: 15_000,
  })

  // Verify we're authenticated — check for content only visible to logged-in users
  await expect(page).not.toHaveURL(/\/login/)
  await expect(page.locator('h1')).toBeVisible({ timeout: 10_000 })

  // Save auth state
  await page.context().storageState({ path: AUTH_FILE })
})
