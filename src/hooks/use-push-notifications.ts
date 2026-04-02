'use client'

import { useEffect, useState, useCallback } from 'react'

type PermissionState = 'default' | 'granted' | 'denied' | 'unsupported'

/**
 * Hook for managing Web Push notification subscriptions.
 *
 * Flow:
 * 1. Check if push is supported (serviceWorker + PushManager + Notification)
 * 2. Check current permission state
 * 3. On enable: request permission → subscribe via PushManager → POST to /api/push/subscribe
 * 4. On disable: unsubscribe → DELETE /api/push/subscribe
 *
 * The VAPID public key (NEXT_PUBLIC_VAPID_PUBLIC_KEY) is used by the browser
 * to create the subscription. The server uses the private key to sign messages.
 */
export function usePushNotifications() {
  const [permission, setPermission] = useState<PermissionState>('default')
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // Check initial state
  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
      setPermission('unsupported')
      return
    }

    setPermission(Notification.permission as PermissionState)

    // Check if already subscribed
    navigator.serviceWorker.ready.then(reg => {
      reg.pushManager.getSubscription().then(sub => {
        setIsSubscribed(!!sub)
      })
    })
  }, [])

  const subscribe = useCallback(async () => {
    if (permission === 'unsupported') return false
    setIsLoading(true)

    try {
      // Request permission
      const result = await Notification.requestPermission()
      setPermission(result as PermissionState)

      if (result !== 'granted') {
        setIsLoading(false)
        return false
      }

      // Get SW registration
      const reg = await navigator.serviceWorker.ready

      // Subscribe to push
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      if (!vapidKey) {
        console.error('NEXT_PUBLIC_VAPID_PUBLIC_KEY not configured')
        setIsLoading(false)
        return false
      }

      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
      })

      // Send subscription to server
      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: subscription.toJSON() }),
      })

      if (!res.ok) {
        throw new Error('Failed to store subscription')
      }

      setIsSubscribed(true)
      return true
    } catch (err) {
      console.error('Push subscription failed:', err)
      return false
    } finally {
      setIsLoading(false)
    }
  }, [permission])

  const unsubscribe = useCallback(async () => {
    setIsLoading(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const subscription = await reg.pushManager.getSubscription()

      if (subscription) {
        await subscription.unsubscribe()
      }

      await fetch('/api/push/subscribe', { method: 'DELETE' })
      setIsSubscribed(false)
    } catch (err) {
      console.error('Push unsubscribe failed:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  return { permission, isSubscribed, isLoading, subscribe, unsubscribe }
}

/**
 * Convert a base64url-encoded string to a Uint8Array.
 * Required by PushManager.subscribe() for applicationServerKey.
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}
