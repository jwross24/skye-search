'use client'

import { useState } from 'react'
import { MapPin, ExternalLink, Clock, Building2, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { VisaBadge } from '@/components/visa-badge'
import { UrgencyIndicator } from './urgency-indicator'
import type { Job } from '@/types/job'

interface JobRowProps {
  job: Job
  urgencyScore: number
  index: number
  onTrack: (index: number) => void
  isTracked: boolean
  today: string
}

function formatDeadline(deadline: string | null, today: string): string | null {
  if (!deadline) return null
  const deadlineDate = new Date(deadline + 'T00:00:00Z')
  const todayDate = new Date(today + 'T00:00:00Z')
  const daysLeft = Math.ceil(
    (deadlineDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24),
  )

  if (daysLeft < 0) return null
  if (daysLeft === 0) return 'Due today'
  if (daysLeft === 1) return 'Due tomorrow'
  if (daysLeft <= 7) return `${daysLeft} days left`
  if (daysLeft <= 14) return `${daysLeft} days left`

  return deadlineDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

function getImmigrationContext(job: Job): string | null {
  if (job.visa_path === 'cap_exempt') {
    if (job.employer_type === 'university') return 'University — cap-exempt'
    if (job.employer_type === 'nonprofit_research') return 'Nonprofit research — cap-exempt'
    if (job.employer_type === 'cooperative_institute') return 'NOAA cooperative institute'
    if (job.employer_type === 'government_contractor') return 'Gov contractor — cap-exempt'
  }
  if (job.h1b_sponsor_count && job.h1b_sponsor_count > 25) {
    return `Sponsored ${job.h1b_sponsor_count} H1-Bs recently`
  }
  if (job.visa_path === 'canada') return 'Express Entry pathway'
  if (job.visa_path === 'opt_compatible') return 'Stops unemployment clock'
  return null
}

export function JobRow({ job, urgencyScore, index, onTrack, isTracked, today }: JobRowProps) {
  const [tracking, setTracking] = useState(false)
  const deadline = formatDeadline(job.application_deadline, today)
  const immigrationContext = getImmigrationContext(job)

  const handleTrack = async () => {
    setTracking(true)
    await onTrack(index)
  }

  return (
    <article
      className="group relative py-5 first:pt-0 animate-in fade-in slide-in-from-bottom-2 duration-300 fill-mode-both"
      style={{ animationDelay: `${Math.min(index, 12) * 40}ms` }}
      data-testid={`job-row-${index}`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        {/* Left: job info */}
        <div className="min-w-0 flex-1 space-y-1.5">
          {/* Title + badges row */}
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold leading-snug text-foreground">
              {job.title}
            </h3>
            <VisaBadge
              visaPath={job.visa_path}
              confidence={job.visa_path === 'cap_exempt' ? job.cap_exempt_confidence : undefined}
            />
          </div>

          {/* Company + location */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Building2 className="size-3.5 shrink-0" />
              {job.company}
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="size-3.5 shrink-0" />
              {job.location}
            </span>
            {job.salary && (
              <span className="text-foreground/70">{job.salary}</span>
            )}
          </div>

          {/* Immigration context — the differentiator */}
          {immigrationContext && (
            <p className="text-xs font-medium text-jade">
              {immigrationContext}
            </p>
          )}

          {/* Urgency + deadline row */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-0.5">
            <UrgencyIndicator score={urgencyScore} />
            {deadline && (
              <span className="flex items-center gap-1 text-xs text-amber-warm font-medium">
                <Clock className="size-3" />
                {deadline}
              </span>
            )}
          </div>
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-2 shrink-0 sm:flex-col sm:items-end sm:gap-1.5">
          {job.url && (
            <a
              href={job.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-xs text-ocean hover:text-ocean-deep hover:bg-ocean/5 underline-offset-2 transition-colors"
            >
              Apply
              <ExternalLink className="size-3" />
            </a>
          )}
          {isTracked ? (
            <Button
              variant="ghost"
              size="sm"
              disabled
              className="text-jade gap-1"
            >
              <Check className="size-3.5" />
              Tracking
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={handleTrack}
              disabled={tracking}
              className="gap-1 border-ocean/20 text-ocean hover:bg-ocean/5 hover:text-ocean-deep"
            >
              {tracking ? 'Adding...' : 'Track This'}
            </Button>
          )}
        </div>
      </div>

      {/* Separator — subtle, not clinical */}
      <div className="absolute inset-x-0 bottom-0 h-px bg-border/50 group-last:hidden" />
    </article>
  )
}

export { formatDeadline, getImmigrationContext }
