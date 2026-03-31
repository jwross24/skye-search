/**
 * E2E: Vote persistence
 * Prevents: Jobs reappearing after page refresh (the vote-not-persisted bug class)
 *
 * Flow: Navigate to /jobs → vote "Not for me" on first job → refresh → verify job is gone
 */
import { test, expect } from '@playwright/test'

test.describe('Vote persistence', () => {
  test('voted job does not reappear after page refresh', async ({ page }) => {
    await page.goto('/jobs')
    await page.waitForLoadState('networkidle')

    // Find pick cards
    const cards = page.locator('[data-testid^="pick-card-"]')
    await expect(cards.first()).toBeVisible({ timeout: 10_000 })

    // Get the title text of the first job card
    const firstCard = cards.first()
    const firstTitle = await firstCard.locator('h3').first().textContent()
    expect(firstTitle).toBeTruthy()

    // Click "Not for me" — this opens the tag picker
    const notForMeButton = firstCard.locator('button:has-text("Not for me")')
    await notForMeButton.click()

    // Tag picker appears — click "Skip" to fire the vote
    // Wait for the server action response to complete before proceeding
    const skipButton = firstCard.locator('button:has-text("Skip")')
    await expect(skipButton).toBeVisible({ timeout: 5000 })

    await Promise.all([
      page.waitForResponse((resp) => resp.url().includes('/jobs') && resp.status() === 200, { timeout: 10_000 }),
      skipButton.click(),
    ])

    // Give the server action time to write to Supabase
    await page.waitForTimeout(2000)

    // Refresh to verify persistence
    await page.reload()
    await page.waitForLoadState('networkidle')

    // Verify the voted job is no longer in the pick cards
    const remainingTitles = await page.locator('[data-testid^="pick-card-"] h3').allTextContents()
    expect(remainingTitles).not.toContain(firstTitle)
  })
})
