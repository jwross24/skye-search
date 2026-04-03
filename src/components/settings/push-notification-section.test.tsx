import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PushNotificationSection } from './push-notification-section'

// Mock the hook before importing the component
const mockSubscribe = vi.fn()
const mockUnsubscribe = vi.fn()
let mockHookReturn = {
  permission: 'default' as NotificationPermission | 'unsupported',
  isSubscribed: false,
  isLoading: false,
  subscribe: mockSubscribe,
  unsubscribe: mockUnsubscribe,
}

vi.mock('@/hooks/use-push-notifications', () => ({
  usePushNotifications: () => mockHookReturn,
}))

describe('PushNotificationSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockHookReturn = {
      permission: 'default',
      isSubscribed: false,
      isLoading: false,
      subscribe: mockSubscribe,
      unsubscribe: mockUnsubscribe,
    }
    // Mock browser APIs
    Object.defineProperty(window, 'navigator', {
      value: { serviceWorker: {}, userAgent: 'test' },
      writable: true,
      configurable: true,
    })
    Object.defineProperty(window, 'PushManager', {
      value: class {},
      writable: true,
      configurable: true,
    })
    // Reset fetch mock
    vi.restoreAllMocks()
  })

  it('renders push notification section heading', async () => {
    render(<PushNotificationSection />)
    expect(screen.getByText('Push notifications')).toBeInTheDocument()
  })

  it('shows enable toggle when not subscribed', async () => {
    render(<PushNotificationSection />)
    // Wait for useEffect to set isSupported=true
    await waitFor(() => {
      expect(screen.getByText('Enable notifications')).toBeInTheDocument()
    })
  })

  it('shows subscribed state when subscribed', async () => {
    mockHookReturn = { ...mockHookReturn, isSubscribed: true }
    render(<PushNotificationSection />)
    await waitFor(() => {
      expect(screen.getByText('Notifications are on')).toBeInTheDocument()
    })
  })

  it('calls subscribe when toggle clicked while not subscribed', async () => {
    const user = userEvent.setup()
    render(<PushNotificationSection />)
    await waitFor(() => screen.getByText('Enable notifications'))
    await user.click(screen.getByRole('switch'))
    expect(mockSubscribe).toHaveBeenCalledOnce()
  })

  it('calls unsubscribe when toggle clicked while subscribed', async () => {
    mockHookReturn = { ...mockHookReturn, isSubscribed: true }
    const user = userEvent.setup()
    render(<PushNotificationSection />)
    await waitFor(() => screen.getByText('Notifications are on'))
    await user.click(screen.getByRole('switch'))
    expect(mockUnsubscribe).toHaveBeenCalledOnce()
  })

  it('toggle button has correct role and aria-checked', async () => {
    render(<PushNotificationSection />)
    await waitFor(() => screen.getByRole('switch'))
    const btn = screen.getByRole('switch')
    expect(btn).toHaveAttribute('aria-checked', 'false')
  })

  it('toggle aria-checked is true when subscribed', async () => {
    mockHookReturn = { ...mockHookReturn, isSubscribed: true }
    render(<PushNotificationSection />)
    await waitFor(() => screen.getByRole('switch'))
    const btn = screen.getByRole('switch')
    expect(btn).toHaveAttribute('aria-checked', 'true')
  })

  it('shows blocked message when permission denied', async () => {
    mockHookReturn = { ...mockHookReturn, permission: 'denied' }
    render(<PushNotificationSection />)
    await waitFor(() => {
      expect(screen.getByText(/Notifications are blocked/)).toBeInTheDocument()
    })
  })

  it('shows unsupported message when browser lacks Push API', async () => {
    // Delete PushManager so 'PushManager' in window is false
    // (setting to undefined leaves the key present; delete removes it)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (window as any).PushManager
    render(<PushNotificationSection />)
    await waitFor(() => {
      expect(screen.getByText(/Push notifications aren't supported/)).toBeInTheDocument()
    })
  })

  it('shows test notification button when subscribed', async () => {
    mockHookReturn = { ...mockHookReturn, isSubscribed: true }
    render(<PushNotificationSection />)
    await waitFor(() => {
      expect(screen.getByText('Send a test notification')).toBeInTheDocument()
    })
  })

  it('hides test notification button when not subscribed', async () => {
    render(<PushNotificationSection />)
    await waitFor(() => screen.getByRole('switch'))
    expect(screen.queryByText('Send a test notification')).not.toBeInTheDocument()
  })

  it('shows warm description copy', () => {
    render(<PushNotificationSection />)
    expect(screen.getByText(/friendly nudge each morning/)).toBeInTheDocument()
  })

  it('sends test notification and shows success message', async () => {
    mockHookReturn = { ...mockHookReturn, isSubscribed: true }
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ok: true }),
    })
    const user = userEvent.setup()
    render(<PushNotificationSection />)
    await waitFor(() => screen.getByText('Send a test notification'))
    await user.click(screen.getByText('Send a test notification'))
    await waitFor(() => {
      expect(screen.getByText(/Test notification sent/)).toBeInTheDocument()
    })
    expect(global.fetch).toHaveBeenCalledWith('/api/push/test-nudge', expect.any(Object))
  })

  it('shows error message when test notification fails', async () => {
    mockHookReturn = { ...mockHookReturn, isSubscribed: true }
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: 'Failed to send notification' }),
    })
    const user = userEvent.setup()
    render(<PushNotificationSection />)
    await waitFor(() => screen.getByText('Send a test notification'))
    await user.click(screen.getByText('Send a test notification'))
    await waitFor(() => {
      expect(screen.getByText('Failed to send notification')).toBeInTheDocument()
    })
  })
})
