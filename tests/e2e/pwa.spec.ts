/**
 * E2E tests for PWA features: manifest, service worker, offline fallback.
 *
 * These test real browser behavior that unit tests can't cover:
 * - SW actually registers and activates
 * - Offline navigation falls back correctly
 * - Manifest is served with correct fields
 */
import { test, expect } from '@playwright/test'

test.describe('PWA', () => {
  test('manifest.webmanifest is served with correct fields', async ({ page }) => {
    const response = await page.goto('/manifest.webmanifest')
    expect(response?.status()).toBe(200)

    const manifest = await response?.json()
    expect(manifest.name).toBe('SkyeSearch')
    expect(manifest.short_name).toBe('SkyeSearch')
    expect(manifest.start_url).toBe('/immigration')
    expect(manifest.display).toBe('standalone')
    expect(manifest.theme_color).toBe('#1e3a5f')
    expect(manifest.icons.length).toBeGreaterThanOrEqual(2)

    // Verify icon URLs are reachable
    for (const icon of manifest.icons) {
      const iconResp = await page.goto(icon.src)
      expect(iconResp?.status(), `icon ${icon.src} should be reachable`).toBe(200)
    }
  })

  test('service worker registers and activates', async ({ page }) => {
    await page.goto('/offline') // no auth needed
    // Wait for SW to register and fully activate
    const swState = await page.evaluate(async () => {
      if (!('serviceWorker' in navigator)) return 'unsupported'
      const reg = await navigator.serviceWorker.ready
      const sw = reg.active!
      if (sw.state === 'activated') return 'activated'
      // Wait for the 'statechange' event if still activating
      return new Promise<string>(resolve => {
        sw.addEventListener('statechange', () => resolve(sw.state), { once: true })
      })
    })
    expect(swState).toBe('activated')
  })

  test('service worker caches the offline page', async ({ page }) => {
    await page.goto('/offline')
    // Wait for SW to be ready
    await page.evaluate(() => navigator.serviceWorker.ready)

    const cached = await page.evaluate(async () => {
      const cache = await caches.open('skye-v1')
      const keys = await cache.keys()
      return keys.map(k => new URL(k.url).pathname)
    })
    expect(cached).toContain('/offline')
  })

  test('offline navigation shows fallback page', async ({ page, context }) => {
    // First load to register and activate the SW
    await page.goto('/offline')
    await page.evaluate(async () => {
      const reg = await navigator.serviceWorker.ready
      // Ensure the SW is controlling this page
      if (!navigator.serviceWorker.controller) {
        await new Promise<void>(resolve => {
          navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), { once: true })
        })
      }
      return reg.active?.state
    })

    // Go offline and try to navigate
    await context.setOffline(true)
    await page.goto('/some-page-that-does-not-exist')

    // Should see our offline fallback, not a browser error
    await expect(page.locator('text=offline')).toBeVisible({ timeout: 5000 })

    await context.setOffline(false)
  })

  test('offline page is accessible without authentication', async ({ page }) => {
    // Clear all cookies to simulate unauthenticated state
    await page.context().clearCookies()
    const response = await page.goto('/offline')
    // Should NOT redirect to /login
    expect(page.url()).toContain('/offline')
    expect(response?.status()).toBe(200)
    await expect(page.locator('text=offline')).toBeVisible()
  })
})
