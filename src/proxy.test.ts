import { describe, it, expect, vi } from 'vitest'
import type { NextRequest } from 'next/server'

// Mock Supabase SSR client — return null user (unauthenticated)
vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
    },
  })),
}))

const { proxy } = await import('./proxy')

function makeNextRequest(path: string): NextRequest {
  const url = new URL(`http://localhost:3000${path}`)
  return {
    nextUrl: {
      pathname: path,
      clone: () => new URL(url),
    },
    cookies: {
      getAll: () => [],
      set: vi.fn(),
    },
    headers: new Headers(),
  } as unknown as NextRequest
}

describe('proxy middleware', () => {
  it('redirects unauthenticated page requests to /login', async () => {
    const response = await proxy(makeNextRequest('/immigration'))
    expect(response.status).toBe(307)
  })

  it('does NOT redirect /login', async () => {
    const response = await proxy(makeNextRequest('/login'))
    expect(response.status).not.toBe(307)
    expect(response.status).not.toBe(302)
  })

  it('does NOT redirect /auth routes', async () => {
    const response = await proxy(makeNextRequest('/auth/callback'))
    expect(response.status).not.toBe(307)
  })

  it('does NOT redirect any /api route', async () => {
    const apiRoutes = [
      '/api/health',
      '/api/cron/unemployment',
      '/api/alerts',
      '/api/webhooks/resend',
      '/api/inbox-count',
    ]

    for (const path of apiRoutes) {
      const response = await proxy(makeNextRequest(path))
      expect(response.status, `${path} was redirected — proxy must exclude /api/*`).not.toBe(307)
      expect(response.status, `${path} was redirected — proxy must exclude /api/*`).not.toBe(302)
    }
  })
})
