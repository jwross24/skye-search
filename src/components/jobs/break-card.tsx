import { Coffee } from 'lucide-react'
import Link from 'next/link'

interface BreakCardProps {
  breakModeUntil: string
}

export function BreakCard({ breakModeUntil }: BreakCardProps) {
  const endsOn = new Date(breakModeUntil).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className="mt-12 flex flex-col items-center text-center px-6">
      <div className="rounded-full bg-ocean/10 p-4 mb-5">
        <Coffee className="h-8 w-8 text-ocean" />
      </div>
      <h2 className="text-xl font-semibold text-foreground mb-2">
        You&apos;re taking a break
      </h2>
      <p className="text-sm text-foreground/60 max-w-sm leading-relaxed">
        Your jobs will be here when you&apos;re ready. Enjoy some
        time off — you&apos;ve earned it.
      </p>
      <p className="text-xs text-foreground/40 mt-3">
        Break ends {endsOn}
      </p>
      <Link
        href="/settings#break-mode"
        className="mt-5 text-sm text-ocean hover:text-ocean-deep transition-colors"
      >
        End break early
      </Link>
    </div>
  )
}
