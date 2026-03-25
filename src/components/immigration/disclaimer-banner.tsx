'use client'

import { Button } from '@/components/ui/button'

interface DisclaimerBannerProps {
  onAcknowledge: () => void
}

export function DisclaimerBanner({ onAcknowledge }: DisclaimerBannerProps) {
  return (
    <div
      role="alert"
      className="animate-in fade-in duration-300 mb-8 border-l-2 border-amber-warm/40 pl-4 py-3"
      data-testid="disclaimer-banner"
    >
      <p className="text-sm text-foreground font-medium mb-1">
        Before you begin
      </p>
      <p className="text-sm text-muted-foreground leading-relaxed max-w-lg mb-3">
        SkyeSearch tracks immigration timelines based on the information you
        provide. This is not legal advice. Always verify dates and eligibility
        with your DSO or immigration attorney.
      </p>
      <Button
        variant="outline"
        size="sm"
        onClick={onAcknowledge}
        className="text-ocean border-ocean/20 hover:bg-ocean/5"
      >
        I understand
      </Button>
    </div>
  )
}
