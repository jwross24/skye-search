'use client'

import { motion } from 'framer-motion'

interface ProgressArcProps {
  /** 0-1 fill fraction */
  fraction: number
  /** Tailwind color variable name (e.g., 'jade', 'ocean', 'amber-warm') */
  color: string
  /** Size in pixels */
  size?: number
  /** Stroke width */
  strokeWidth?: number
  /** Screen reader label */
  label: string
  /** Content rendered in the center of the arc */
  children?: React.ReactNode
}

export function ProgressArc({
  fraction,
  color,
  size = 160,
  strokeWidth = 8,
  label,
  children,
}: ProgressArcProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const center = size / 2

  // Clamp fraction between 0 and 1
  const clampedFraction = Math.max(0, Math.min(1, fraction))

  return (
    <div
      className="relative inline-flex items-center justify-center"
      role="progressbar"
      aria-valuenow={Math.round(clampedFraction * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="transform -rotate-90"
      >
        {/* Background track */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-border/30"
        />
        {/* Animated fill arc */}
        <motion.circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={`var(--${color})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference}
          initial="initial"
          animate="animate"
          custom={clampedFraction}
          variants={{
            initial: {
              strokeDashoffset: circumference,
              opacity: 0,
            },
            animate: {
              strokeDashoffset: circumference * (1 - clampedFraction),
              opacity: 1,
            },
          }}
          transition={{
            strokeDashoffset: { duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.2 },
            opacity: { duration: 0.4 },
          }}
        />
      </svg>
      {/* Center content */}
      {children && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {children}
        </div>
      )}
    </div>
  )
}
