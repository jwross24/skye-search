import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type { Database } from '@/types/database'

type VisaPath = Database['public']['Enums']['visa_path_type']
type Confidence = Database['public']['Enums']['cap_exempt_confidence_type']

// ─── Non-cap-exempt visa path configs ───────────────────────────────────────

const visaPathConfig: Record<
  VisaPath,
  { label: string; className: string; ariaLabel: string }
> = {
  cap_exempt: {
    label: 'Cap-Exempt',
    className: '', // handled by confidence tiers below
    ariaLabel: 'Cap-exempt employer — can sponsor H1-B year-round without lottery',
  },
  cap_subject: {
    label: 'Cap-Subject',
    className: 'bg-badge-cap-subject/15 text-badge-cap-subject border-badge-cap-subject/30',
    ariaLabel: 'Cap-subject employer — H1-B requires lottery',
  },
  opt_compatible: {
    label: 'OPT Compatible',
    className: 'bg-badge-opt/15 text-badge-opt border-badge-opt/30',
    ariaLabel: 'OPT compatible employer — E-Verify, STEM-related',
  },
  canada: {
    label: 'Canada',
    className: 'bg-badge-canada/15 text-badge-canada border-badge-canada/30',
    ariaLabel: 'Canadian employer — Express Entry pathway',
  },
  unknown: {
    label: 'Unknown',
    className: 'bg-muted text-muted-foreground border-border',
    ariaLabel: 'Visa sponsorship status unknown',
  },
}

// ─── Cap-exempt confidence tiers ────────────────────────────────────────────
// Three visually distinct tiers per bead 55l spec.
// Badge green (#16a34a) is DISTINCT from jade theme green (#059669).

const capExemptTiers: Record<Confidence, {
  label: string
  icon: string
  className: string
  ariaLabel: string
}> = {
  confirmed: {
    label: 'Cap-Exempt',
    icon: '✓',
    className: 'bg-badge-cap-exempt text-white border-badge-cap-exempt font-semibold',
    ariaLabel: 'Cap-exempt confirmed — multiple signals agree this employer can sponsor H1-B without lottery',
  },
  likely: {
    label: 'Cap-Exempt',
    icon: '',
    className: 'bg-badge-cap-exempt/15 text-badge-cap-exempt border-badge-cap-exempt/40 font-medium',
    ariaLabel: 'Cap-exempt likely — strong indicators suggest this employer can sponsor H1-B without lottery',
  },
  unverified: {
    label: 'Cap-Exempt',
    icon: '?',
    className: 'bg-badge-cap-exempt/10 text-badge-cap-exempt/80 border-badge-cap-exempt/25',
    ariaLabel: 'Cap-exempt unverified — weak signal only, verify with employer',
  },
  none: {
    label: 'Cap-Exempt',
    icon: '',
    className: 'bg-muted text-muted-foreground border-border',
    ariaLabel: 'No cap-exempt indicators found',
  },
}

const CAP_EXEMPT_DISCLAIMER = 'Verify cap-exempt status with employer before relying on this for immigration decisions. Subject to USCIS determination.'

// ─── Component ──────────────────────────────────────────────────────────────

interface VisaBadgeProps {
  visaPath: VisaPath
  confidence?: Confidence
}

export function VisaBadge({ visaPath, confidence }: VisaBadgeProps) {
  // Non-cap-exempt paths: simple badge, no tooltip
  if (visaPath !== 'cap_exempt') {
    const config = visaPathConfig[visaPath]
    return (
      <Badge
        variant="outline"
        className={`text-xs ${config.className}`}
        aria-label={config.ariaLabel}
      >
        {config.label}
      </Badge>
    )
  }

  // Cap-exempt: three-tier visual treatment with tooltip
  const tier = capExemptTiers[confidence ?? 'none']

  return (
    <TooltipProvider delay={300}>
      <Tooltip>
        <TooltipTrigger
          render={
            <Badge
              variant="outline"
              className={`text-xs ${tier.className} cursor-help`}
              aria-label={tier.ariaLabel}
            />
          }
        >
          {tier.icon && <span aria-hidden="true">{tier.icon}</span>}
          {tier.label}
          {tier.icon && <span className="sr-only">({confidence})</span>}
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-64 text-xs">
          {CAP_EXEMPT_DISCLAIMER}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

// Exported for testing
export { capExemptTiers, CAP_EXEMPT_DISCLAIMER }
