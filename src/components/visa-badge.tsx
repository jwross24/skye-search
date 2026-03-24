import { Badge } from '@/components/ui/badge'
import type { Database } from '@/types/database'

type VisaPath = Database['public']['Enums']['visa_path_type']
type Confidence = Database['public']['Enums']['cap_exempt_confidence_type']

const visaPathConfig: Record<
  VisaPath,
  { label: string; className: string; ariaLabel: string }
> = {
  cap_exempt: {
    label: 'Cap-Exempt',
    className: 'bg-badge-cap-exempt/15 text-badge-cap-exempt border-badge-cap-exempt/30',
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

const confidenceIndicator: Record<Confidence, string> = {
  confirmed: ' ✓',
  likely: '',
  unverified: ' ?',
  none: '',
}

interface VisaBadgeProps {
  visaPath: VisaPath
  confidence?: Confidence
}

export function VisaBadge({ visaPath, confidence }: VisaBadgeProps) {
  const config = visaPathConfig[visaPath]
  const suffix =
    visaPath === 'cap_exempt' && confidence
      ? confidenceIndicator[confidence]
      : ''

  return (
    <Badge
      variant="outline"
      className={`text-xs font-medium ${config.className}`}
      aria-label={config.ariaLabel}
    >
      {config.label}
      {suffix}
    </Badge>
  )
}
