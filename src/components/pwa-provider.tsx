'use client'

import { usePWA } from '@/hooks/use-pwa'

export function PWAProvider({ children }: { children: React.ReactNode }) {
  const { canInstall, promptInstall, dismissInstall } = usePWA()

  return (
    <>
      {canInstall && (
        <div
          role="dialog"
          aria-label="Install SkyeSearch"
          aria-modal="false"
          className="fixed bottom-20 left-4 right-4 z-50 mx-auto max-w-sm animate-in slide-in-from-bottom-4 md:bottom-4"
        >
          <div className="rounded-2xl border border-ocean/20 bg-background p-4 shadow-lg">
            <p className="text-sm font-medium text-ocean-deep">
              Keep SkyeSearch on your home screen
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              One tap to your immigration dashboard and daily picks.
            </p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={promptInstall}
                className="rounded-lg bg-ocean px-4 py-1.5 text-xs font-medium text-white hover:bg-ocean-deep transition-colors"
              >
                Install
              </button>
              <button
                type="button"
                onClick={dismissInstall}
                className="rounded-lg px-4 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Not now
              </button>
            </div>
          </div>
        </div>
      )}
      {children}
    </>
  )
}
