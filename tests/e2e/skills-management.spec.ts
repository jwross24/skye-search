/**
 * E2E: Skills management persistence
 * Prevents: Skills appearing to save but not persisting (the stub-action bug class)
 *
 * Flow: Navigate to /settings → add skill → refresh → verify persists → remove → refresh → verify gone
 */
import { test, expect } from '@playwright/test'

test.describe.configure({ mode: 'serial' })

const UNIQUE_SKILL = `E2E-Test-${Date.now()}`

test.describe('Skills management', () => {
  test('add skill persists across page refresh', async ({ page }) => {
    await page.goto('/settings')
    await page.waitForLoadState('networkidle')

    // Type a unique skill name
    const input = page.locator('input[placeholder="Add a skill..."]')
    await expect(input).toBeVisible()
    await input.fill(UNIQUE_SKILL)

    // Click Add
    await page.locator('button:has-text("Add")').click()

    // Verify skill appears immediately (optimistic)
    await expect(page.locator(`text=${UNIQUE_SKILL}`)).toBeVisible()

    // Wait for server action to complete
    await page.waitForLoadState('networkidle')

    // Refresh to verify persistence
    await page.reload()
    await page.waitForLoadState('networkidle')

    // Skill should still be there after refresh
    await expect(page.locator(`text=${UNIQUE_SKILL}`)).toBeVisible()
  })

  test('remove skill persists across page refresh', async ({ page }) => {
    await page.goto('/settings')
    await page.waitForLoadState('networkidle')

    // Ensure the skill from the add test is visible (serial mode guarantees order)
    const skillLocator = page.locator(`text=${UNIQUE_SKILL}`)
    await expect(skillLocator).toBeVisible({ timeout: 5000 })

    // Remove the skill
    const removeButton = page.locator(`[aria-label="Remove ${UNIQUE_SKILL}"]`)
    await expect(removeButton).toBeVisible()
    await removeButton.click()

    // Verify skill is gone immediately
    await expect(skillLocator).not.toBeVisible()

    // Wait for server action to complete
    await page.waitForLoadState('networkidle')

    // Refresh to verify persistence
    await page.reload()
    await page.waitForLoadState('networkidle')

    // Skill should still be gone
    await expect(page.locator(`text=${UNIQUE_SKILL}`)).not.toBeVisible()
  })

  test('duplicate skill shows error', async ({ page }) => {
    await page.goto('/settings')
    await page.waitForLoadState('networkidle')

    // Add a known skill first to have a target for duplicate detection
    const dupeTarget = `Dupe-Target-${Date.now()}`
    const input = page.locator('input[placeholder="Add a skill..."]')
    await input.fill(dupeTarget)
    await page.locator('button:has-text("Add")').click()
    await expect(page.locator(`text=${dupeTarget}`)).toBeVisible()
    await page.waitForLoadState('networkidle')

    // Now try adding the same skill again
    await input.fill(dupeTarget)
    await page.locator('button:has-text("Add")').click()

    // Should show error
    await expect(page.locator('text=Already tracked')).toBeVisible()

    // Clean up: remove the test skill
    await page.locator(`[aria-label="Remove ${dupeTarget}"]`).click()
    await page.waitForLoadState('networkidle')
  })
})
