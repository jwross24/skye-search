'use client'

import { useState, useEffect } from 'react'
import { Bell, BellOff, BellRing, AlertCircle } from 'lucide-react'
import { usePushNotifications } from '@/hooks/use-push-notifications'

export function PushNotificationSection() {
  const { permission, isSubscribed, isLoading, subscribe, unsubscribe } = usePushNotifications()
  const [testSending, setTestSending] = useState(false)
  const [testResult, setTestResult] = useState<string | null>(null)
  // Start false on server (SSR) to avoid hydration mismatch; update after mount.
  const [isSupported, setIsSupported] = useState(false)

  useEffect(() => {
    setIsSupported('serviceWorker' in navigator && 'PushManager' in window)
  }, [])

  const isDenied = permission === 'denied'

  async function handleToggle() {
    if (isSubscribed) {
      await unsubscribe()
    } else {
      await subscribe()
    }
  }

  async function handleSendTest() {
    setTestSending(true)
    setTestResult(null)
    try {
      const res = await fetch('/api/push/test-nudge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      if (res.ok) {
        setTestResult('sent')
      } else {
        const body = await res.json().catch(() => ({}))
        setTestResult(body.error ?? 'Could not send test notification')
      }
    } catch {
      setTestResult('Network error — check your connection')
    } finally {
      setTestSending(false)
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <Bell className="h-5 w-5 text-muted-foreground" />
        <h2 className="text-lg font-semibold">Push notifications</h2>
      </div>

      <p className="text-sm text-muted-foreground">
        Get a friendly nudge each morning with your top pick and clock status.
      </p>

      {!isSupported ? (
        <div className="flex items-start gap-2 rounded-lg bg-muted p-3">
          <AlertCircle className="mt-0.5 h-4 w-4 text-muted-foreground shrink-0" />
          <p className="text-sm text-muted-foreground">
            Push notifications aren&apos;t supported in this browser.
            Try Chrome, Edge, or Safari 16.4+ with the app installed as a PWA.
          </p>
        </div>
      ) : isDenied ? (
        <div className="flex items-start gap-2 rounded-lg bg-muted p-3">
          <BellOff className="mt-0.5 h-4 w-4 text-muted-foreground shrink-0" />
          <p className="text-sm text-muted-foreground">
            Notifications are blocked. To enable them, update your browser or device settings
            for this site, then refresh the page.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <button
            onClick={handleToggle}
            disabled={isLoading}
            role="switch"
            aria-checked={isSubscribed}
            aria-label={isSubscribed ? 'Disable push notifications' : 'Enable push notifications'}
            className={`flex w-full items-center justify-between rounded-lg border p-4 transition-colors ${
              isSubscribed
                ? 'border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950'
                : 'border-border bg-background hover:bg-muted'
            }`}
          >
            <div className="flex items-center gap-3">
              {isSubscribed ? (
                <BellRing className="h-5 w-5 text-green-600 dark:text-green-400" />
              ) : (
                <BellOff className="h-5 w-5 text-muted-foreground" />
              )}
              <div className="text-left">
                <p className="text-sm font-medium">
                  {isSubscribed ? 'Notifications are on' : 'Enable notifications'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isSubscribed
                    ? 'You\'ll get a morning nudge with your top pick'
                    : 'Daily nudge with your best match and clock update'}
                </p>
              </div>
            </div>
            <div className={`h-6 w-11 rounded-full transition-colors ${
              isSubscribed ? 'bg-green-500' : 'bg-muted-foreground/30'
            } relative`}>
              <div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                isSubscribed ? 'translate-x-5' : 'translate-x-0.5'
              }`} />
            </div>
          </button>

          {isSubscribed && (
            <button
              onClick={handleSendTest}
              disabled={testSending}
              className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors disabled:opacity-50"
            >
              {testSending ? 'Sending...' : 'Send a test notification'}
            </button>
          )}

          {testResult === 'sent' && (
            <p className="text-sm text-green-600 dark:text-green-400">
              Test notification sent — check your device!
            </p>
          )}
          {testResult && testResult !== 'sent' && (
            <p className="text-sm text-muted-foreground">
              {testResult}
            </p>
          )}
        </div>
      )}
    </section>
  )
}
