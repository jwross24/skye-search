'use client'

import { useEffect } from 'react'
import { markMilestoneSeen } from '@/app/jobs/momentum-actions'
import type { Milestone } from '@/lib/momentum'

interface MomentumBannerProps {
  message: string | null
  milestone: Milestone | null
}

/**
 * Renders warm momentum text above the daily batch.
 * No cards, no badges, no borders — just warm text that appears naturally.
 *
 * When a new milestone fires, persists the key via markMilestoneSeen so
 * subsequent page loads don't show it again.
 */
export function MomentumBanner({ message, milestone }: MomentumBannerProps) {
  // Fire-and-forget: persist the milestone key after render.
  useEffect(() => {
    if (milestone?.key) {
      markMilestoneSeen(milestone.key)
    }
  }, [milestone?.key])

  if (!message && !milestone) return null

  return (
    <div className="mb-4 space-y-1">
      {message && (
        <p className="text-sm text-muted-foreground leading-relaxed">
          {message}
        </p>
      )}
      {milestone && (
        <p className="text-sm text-jade font-medium animate-in fade-in duration-500">
          {milestone.message}
        </p>
      )}
    </div>
  )
}
