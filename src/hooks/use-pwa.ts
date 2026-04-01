'use client'

import { useEffect, useState, useCallback, useRef } from 'react'

const VISIT_COUNT_KEY = 'skye-pwa-visits'
const INSTALL_DISMISSED_KEY = 'skye-pwa-install-dismissed'
const VISITS_BEFORE_PROMPT = 3

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function getIsStandalone(): boolean {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in navigator && (navigator as { standalone?: boolean }).standalone === true)
  )
}

export function usePWA(daysUsed?: number) {
  const [canInstall, setCanInstall] = useState(false)
  const [isInstalled, setIsInstalled] = useState(getIsStandalone)
  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null)

  // Register service worker
  useEffect(() => {
    if (!navigator.serviceWorker) return

    navigator.serviceWorker.register('/sw.js').catch(() => {
      // SW registration failed — likely unsupported context
    })
  }, [])

  // Update app badge when daysUsed changes
  useEffect(() => {
    if (daysUsed == null) return
    if (!('setAppBadge' in navigator)) return

    navigator.setAppBadge(daysUsed).catch(() => {
      // Badging API not supported or permission denied
    })
  }, [daysUsed])

  // Listen for install prompt + track visits
  useEffect(() => {
    // Track visits
    const visits = parseInt(localStorage.getItem(VISIT_COUNT_KEY) || '0', 10) + 1
    localStorage.setItem(VISIT_COUNT_KEY, String(visits))

    const dismissed = localStorage.getItem(INSTALL_DISMISSED_KEY)
    const shouldPrompt = visits >= VISITS_BEFORE_PROMPT && !dismissed

    const handler = (e: Event) => {
      e.preventDefault()
      deferredPromptRef.current = e as BeforeInstallPromptEvent
      if (shouldPrompt) {
        setCanInstall(true)
      }
    }

    window.addEventListener('beforeinstallprompt', handler)

    // Detect install completion
    const installHandler = () => {
      setIsInstalled(true)
      setCanInstall(false)
      deferredPromptRef.current = null
    }
    window.addEventListener('appinstalled', installHandler)

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
      window.removeEventListener('appinstalled', installHandler)
    }
  }, [])

  const promptInstall = useCallback(async () => {
    if (!deferredPromptRef.current) return

    await deferredPromptRef.current.prompt()
    const choice = await deferredPromptRef.current.userChoice

    if (choice.outcome === 'dismissed') {
      localStorage.setItem(INSTALL_DISMISSED_KEY, 'true')
    }

    setCanInstall(false)
    deferredPromptRef.current = null
  }, [])

  const dismissInstall = useCallback(() => {
    localStorage.setItem(INSTALL_DISMISSED_KEY, 'true')
    setCanInstall(false)
  }, [])

  return { canInstall, isInstalled, promptInstall, dismissInstall }
}
