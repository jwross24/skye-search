import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { usePushNotifications } from './use-push-notifications'

function log(step: string, detail: string) {
  process.stdout.write(`  [use-push-notifications] ${step}: ${detail}\n`)
}

// ─── Browser API mocks ──────────────────────────────────────────────────────

const mockGetSubscription = vi.fn().mockResolvedValue(null)
const mockSubscribe = vi.fn()
const mockUnsubscribe = vi.fn().mockResolvedValue(true)
const mockPushManager = {
  getSubscription: mockGetSubscription,
  subscribe: mockSubscribe,
}
const mockSWReady = Promise.resolve({ pushManager: mockPushManager })

const mockFetch = vi.fn().mockResolvedValue({ ok: true })

beforeEach(() => {
  vi.clearAllMocks()

  // Reset fetch mock
  vi.stubGlobal('fetch', mockFetch)

  // Mock VAPID env var
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U'

  // Mock serviceWorker
  Object.defineProperty(navigator, 'serviceWorker', {
    value: { ready: mockSWReady },
    configurable: true,
    writable: true,
  })

  // Mock PushManager
  Object.defineProperty(window, 'PushManager', {
    value: {},
    configurable: true,
    writable: true,
  })

  // Mock Notification (default permission)
  Object.defineProperty(window, 'Notification', {
    value: {
      permission: 'default',
      requestPermission: vi.fn().mockResolvedValue('granted'),
    },
    configurable: true,
    writable: true,
  })

  const mockSubscriptionObj = {
    endpoint: 'https://fcm.googleapis.com/fcm/send/test',
    toJSON: () => ({
      endpoint: 'https://fcm.googleapis.com/fcm/send/test',
      keys: { p256dh: 'test-p256dh', auth: 'test-auth' },
    }),
    unsubscribe: mockUnsubscribe,
  }
  mockSubscribe.mockResolvedValue(mockSubscriptionObj)
  mockGetSubscription.mockResolvedValue(null)
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('usePushNotifications', () => {
  it('reports unsupported when APIs missing', () => {
    log('1', 'Deleting serviceWorker from navigator')
    // The hook guards with `'serviceWorker' in navigator` — delete to make the check fail
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (navigator as any).serviceWorker

    const { result } = renderHook(() => usePushNotifications())
    log('2', `permission=${result.current.permission}`)
    expect(result.current.permission).toBe('unsupported')
    expect(result.current.isSubscribed).toBe(false)
  })

  it('reads initial permission state from Notification.permission', async () => {
    log('1', 'Setting Notification.permission to denied')
    Object.defineProperty(window, 'Notification', {
      value: { permission: 'denied', requestPermission: vi.fn() },
      configurable: true,
      writable: true,
    })

    const { result } = renderHook(() => usePushNotifications())
    await waitFor(() => {
      expect(result.current.permission).toBe('denied')
    })
    log('2', 'Correct: permission is denied')
  })

  it('detects existing subscription on mount', async () => {
    log('1', 'Mocking existing subscription')
    mockGetSubscription.mockResolvedValue({
      endpoint: 'https://fcm.googleapis.com/fcm/send/existing',
      unsubscribe: mockUnsubscribe,
    })

    const { result } = renderHook(() => usePushNotifications())

    await waitFor(() => {
      expect(result.current.isSubscribed).toBe(true)
    })
    log('2', 'isSubscribed=true detected from existing subscription')
  })

  it('subscribe: requests permission, subscribes, posts to server', async () => {
    log('1', 'Calling subscribe()')
    const { result } = renderHook(() => usePushNotifications())

    let success: boolean | undefined
    await act(async () => {
      success = await result.current.subscribe()
    })

    log('2', `subscribe returned ${success}`)
    expect(success).toBe(true)
    expect(result.current.isSubscribed).toBe(true)

    expect(mockFetch).toHaveBeenCalledWith('/api/push/subscribe', expect.objectContaining({
      method: 'POST',
    }))
    log('3', 'POST to /api/push/subscribe called')
  })

  it('subscribe: returns false if permission denied', async () => {
    log('1', 'Notification.requestPermission returns denied')
    Object.defineProperty(window, 'Notification', {
      value: {
        permission: 'default',
        requestPermission: vi.fn().mockResolvedValue('denied'),
      },
      configurable: true,
      writable: true,
    })

    const { result } = renderHook(() => usePushNotifications())

    let success: boolean | undefined
    await act(async () => {
      success = await result.current.subscribe()
    })

    expect(success).toBe(false)
    expect(result.current.isSubscribed).toBe(false)
    expect(mockFetch).not.toHaveBeenCalled()
    log('2', 'Returned false, no fetch call made')
  })

  it('subscribe: returns false if server POST fails', async () => {
    log('1', 'Server returns error')
    mockFetch.mockResolvedValueOnce({ ok: false })

    const { result } = renderHook(() => usePushNotifications())

    let success: boolean | undefined
    await act(async () => {
      success = await result.current.subscribe()
    })

    expect(success).toBe(false)
    expect(result.current.isSubscribed).toBe(false)
    log('2', 'Returns false when server rejects subscription')
  })

  it('subscribe: returns false if VAPID key missing', async () => {
    log('1', 'Removing VAPID key')
    delete process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

    const { result } = renderHook(() => usePushNotifications())

    let success: boolean | undefined
    await act(async () => {
      success = await result.current.subscribe()
    })

    expect(success).toBe(false)
    log('2', 'Returns false when VAPID key not configured')
  })

  it('subscribe: no-ops if permission is unsupported', async () => {
    log('1', 'Deleting PushManager to simulate unsupported browser')
    // The hook guards with `'PushManager' in window` — delete to make the check fail
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (window as any).PushManager

    const { result } = renderHook(() => usePushNotifications())
    // Wait for initial effect to mark as unsupported
    await waitFor(() => expect(result.current.permission).toBe('unsupported'))

    let success: boolean | undefined
    await act(async () => {
      success = await result.current.subscribe()
    })

    expect(success).toBe(false)
    expect(mockFetch).not.toHaveBeenCalled()
    log('2', 'No-op on unsupported browser')
  })

  it('unsubscribe: calls PushManager.unsubscribe and DELETE endpoint', async () => {
    log('1', 'Mocking existing subscription for unsubscribe')
    const existingSub = {
      endpoint: 'https://fcm.googleapis.com/fcm/send/test',
      unsubscribe: mockUnsubscribe,
      toJSON: () => ({ endpoint: 'https://fcm.googleapis.com/fcm/send/test', keys: {} }),
    }
    mockGetSubscription.mockResolvedValue(existingSub)

    const { result } = renderHook(() => usePushNotifications())
    await waitFor(() => expect(result.current.isSubscribed).toBe(true))

    await act(async () => {
      await result.current.unsubscribe()
    })

    expect(mockUnsubscribe).toHaveBeenCalled()
    expect(mockFetch).toHaveBeenCalledWith('/api/push/subscribe', expect.objectContaining({
      method: 'DELETE',
    }))
    expect(result.current.isSubscribed).toBe(false)
    log('2', 'Unsubscribed: SW unsubscribed + DELETE called')
  })

  it('isLoading transitions correctly during subscribe', async () => {
    log('1', 'Checking isLoading state transitions')
    // Delay the subscribe promise so we can capture intermediate state
    let resolveSubscribe!: (v: unknown) => void
    mockSubscribe.mockReturnValue(new Promise((r) => { resolveSubscribe = r }))

    const { result } = renderHook(() => usePushNotifications())

    act(() => {
      result.current.subscribe()
    })

    log('2', `isLoading during subscribe: ${result.current.isLoading}`)
    expect(result.current.isLoading).toBe(true)

    await act(async () => {
      resolveSubscribe({
        endpoint: 'https://fcm.googleapis.com/test',
        toJSON: () => ({ endpoint: 'https://fcm.googleapis.com/test', keys: { p256dh: 'k', auth: 'a' } }),
        unsubscribe: mockUnsubscribe,
      })
    })

    expect(result.current.isLoading).toBe(false)
    log('3', 'isLoading reset after completion')
  })
})
