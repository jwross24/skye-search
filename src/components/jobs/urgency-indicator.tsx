/**
 * Visual urgency indicator — a thin tide-line that fills based on score.
 * Warm amber at high urgency, ocean blue at moderate, jade at low.
 * Never shows raw numbers. Conveys feeling, not precision.
 */

const urgencyConfig = [
  { min: 0.8, label: 'Top priority', className: 'bg-amber-warm' },
  { min: 0.65, label: 'Strong match', className: 'bg-ocean' },
  { min: 0.5, label: 'Worth exploring', className: 'bg-ocean-light' },
  { min: 0.3, label: 'Keep in mind', className: 'bg-jade-light' },
  { min: 0, label: 'On the radar', className: 'bg-muted-foreground/40' },
] as const

function getUrgencyConfig(score: number) {
  return urgencyConfig.find((c) => score >= c.min) ?? urgencyConfig[urgencyConfig.length - 1]
}

interface UrgencyIndicatorProps {
  score: number
}

export function UrgencyIndicator({ score }: UrgencyIndicatorProps) {
  const config = getUrgencyConfig(score)
  const widthPercent = Math.max(8, Math.min(100, score * 100))

  return (
    <div className="flex items-center gap-2.5">
      <div
        className="h-1.5 w-16 rounded-full bg-border/60 overflow-hidden"
        role="meter"
        aria-valuenow={Math.round(score * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Urgency: ${config.label}`}
      >
        <div
          className={`h-full rounded-full transition-all duration-500 ${config.className}`}
          style={{ width: `${widthPercent}%` }}
        />
      </div>
      <span className="text-xs text-muted-foreground whitespace-nowrap">
        {config.label}
      </span>
    </div>
  )
}

export { getUrgencyConfig }
