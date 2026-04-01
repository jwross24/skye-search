/**
 * Auth setup: authenticates the test user and saves browser state.
 *
 * Two strategies:
 *   - CI: API-based auth (bypass login form — avoids server action + redirect chain)
 *   - Local: Browser login (tests the actual login flow)
 *
 * The CI strategy calls GoTrue directly, then injects the session as a cookie
 * that Supabase SSR (@supabase/ssr) recognises on the next request.
 *
 * Cookie format: Supabase SSR stores the session under the key
 * `sb-<hostname-prefix>-auth-token` (e.g. `sb-127-auth-token` locally,
 * `sb-<project-ref>-auth-token` on hosted Supabase) encoded as `base64-<base64url-json>`.
 * We set this cookie via context.addCookies() before any navigation so the
 * middleware picks it up on the very first request.
 */
import { test as setup, expect } from '@playwright/test'
import path from 'path'

const AUTH_FILE = path.join(__dirname, '..', '.auth', 'user.json')

const TEST_EMAIL = 'dev@skye-search.test'
const TEST_PASSWORD = 'testpass123'

/**
 * Cookie key used by @supabase/ssr.
 * Format: sb-<hostname-prefix>-auth-token
 * Derived from NEXT_PUBLIC_SUPABASE_URL hostname.
 */
function getSupabaseCookieKey(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54321'
  const hostname = new URL(url).hostname
  // Use first segment of hostname (e.g., "127" from "127.0.0.1", "tuqfrmcxxhbujpgvqufs" from "tuqfrmcxxhbujpgvqufs.supabase.co")
  const prefix = hostname.split('.')[0]
  return `sb-${prefix}-auth-token`
}

setup('authenticate test user', async ({ page, context }) => {
  if (process.env.CI) {
    await apiBasedAuth(page, context)
  } else {
    await browserBasedAuth(page)
  }
})

/**
 * CI strategy: authenticate via GoTrue API, inject session as a cookie.
 * Bypasses: login form → server action → redirect chain (unreliable in CI).
 *
 * @supabase/ssr createBrowserClient stores auth in document.cookie (not
 * localStorage). The cookie value is `base64-<base64url(JSON.stringify(session))>`.
 * We inject this directly via context.addCookies() before the first navigation.
 */
async function apiBasedAuth(
  page: import('@playwright/test').Page,
  context: import('@playwright/test').BrowserContext,
) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54321'
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? ''

  // Step 1: Get session tokens from GoTrue
  const tokenRes = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: anonKey,
    },
    body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
  })

  if (!tokenRes.ok) {
    const err = await tokenRes.text()
    throw new Error(`GoTrue sign-in failed (${tokenRes.status}): ${err}`)
  }

  const session = await tokenRes.json()
  const { access_token, refresh_token, expires_in, expires_at } = session

  if (!access_token || !refresh_token) {
    throw new Error('GoTrue returned no tokens')
  }

  // Step 2: Encode the session as Supabase SSR expects it.
  // Format: "base64-" + base64url(JSON.stringify(sessionObject))
  // Source: @supabase/ssr dist/module/cookies.js (cookieEncoding="base64url")
  const sessionPayload = JSON.stringify({
    access_token,
    refresh_token,
    token_type: 'bearer',
    expires_in: expires_in ?? 3600,
    expires_at: expires_at ?? Math.floor(Date.now() / 1000) + 3600,
    user: session.user,
  })
  const base64url = Buffer.from(sessionPayload)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
  const cookieValue = `base64-${base64url}`

  // Step 3: Inject the session cookie before any navigation so the Next.js
  // proxy (proxy.ts) can call getUser() and establish the session.
  const cookieKey = getSupabaseCookieKey()

  // Set cookie on localhost (Playwright's baseURL) not 127.0.0.1 (Supabase URL).
  // Cookies for 127.0.0.1 don't get sent to localhost requests.
  await context.addCookies([
    {
      name: cookieKey,
      value: cookieValue,
      domain: 'localhost',
      path: '/',
      httpOnly: false,
      secure: false,
      sameSite: 'Lax',
    },
  ])

  // Step 4: Navigate to root — middleware will validate the cookie and let us in.
  await page.goto('/', { waitUntil: 'networkidle', timeout: 60_000 })

  // If still on /login, the cookie injection didn't work — fall back to form login.
  if (page.url().includes('/login')) {
    console.log('[auth.setup] Cookie-based session injection failed, falling back to form login')
    await browserBasedAuth(page)
    return
  }

  await expect(page.locator('h1')).toBeVisible({ timeout: 10_000 })
  await context.storageState({ path: AUTH_FILE })
}

/**
 * Local strategy: fill the login form and submit.
 * Tests the actual user login flow.
 */
async function browserBasedAuth(page: import('@playwright/test').Page) {
  await page.goto('/login', { waitUntil: 'networkidle', timeout: 30_000 })
  await expect(page.locator('input[name="email"]')).toBeVisible({ timeout: 10_000 })

  await page.fill('input[name="email"]', TEST_EMAIL)
  await page.fill('input[name="password"]', TEST_PASSWORD)
  await page.click('button:has-text("Sign in")')

  await page.waitForURL((url) => !url.pathname.includes('/login'), {
    timeout: 30_000,
  })

  await expect(page).not.toHaveURL(/\/login/)
  await expect(page.locator('h1')).toBeVisible({ timeout: 10_000 })

  await page.context().storageState({ path: AUTH_FILE })
}
