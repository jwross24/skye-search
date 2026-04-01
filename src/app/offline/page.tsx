'use client'

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-8 text-center">
      <div className="text-6xl" aria-hidden="true">🌊</div>
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-ocean-deep">
          {"You're offline right now"}
        </h1>
        <p className="mx-auto max-w-xs text-sm text-muted-foreground">
          No worries — check your connection and come back when you&apos;re ready.
          Your data will be right here.
        </p>
      </div>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="rounded-xl bg-ocean px-6 py-2.5 text-sm font-medium text-white hover:bg-ocean-deep transition-colors"
      >
        Try again
      </button>
    </div>
  )
}
