'use client'

import { useState } from 'react'
import {
  MapPin,
  Building2,
  Clock,
  ChevronDown,
  ChevronUp,
  Heart,
  X,
  Bookmark,
  ExternalLink,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { VisaBadge } from '@/components/visa-badge'
import { UrgencyIndicator } from './urgency-indicator'
import { TagPicker } from './tag-picker'
import { getImmigrationContext, formatDeadline } from './job-row'
import type { SeedJob } from '@/db/seed'
import type { VoteDecision, DismissTag } from '@/app/jobs/actions'

interface PickCardProps {
  job: SeedJob
  urgencyScore: number
  index: number
  onVote: (index: number, decision: VoteDecision, tags?: DismissTag[]) => void
  staggerIndex: number
}

export function PickCard({ job, urgencyScore, index, onVote, staggerIndex }: PickCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [showTags, setShowTags] = useState(false)

  const immigrationContext = getImmigrationContext(job)
  const deadline = formatDeadline(job.application_deadline, '2026-03-24')

  const handleVote = (decision: VoteDecision) => {
    if (decision === 'not_for_me') {
      setShowTags(true)
      return
    }
    // Parent (DailyBatch) handles the voted state and re-renders
    onVote(index, decision)
  }

  const handleTagSelect = (tags: DismissTag[]) => {
    setShowTags(false)
    onVote(index, 'not_for_me', tags)
  }

  const handleTagSkip = () => {
    setShowTags(false)
    onVote(index, 'not_for_me')
  }

  return (
    <article
      className="animate-in fade-in slide-in-from-bottom-2 duration-300 fill-mode-both"
      style={{ animationDelay: `${Math.min(staggerIndex, 8) * 50}ms` }}
      data-testid={`pick-card-${index}`}
    >
      <div className="py-5 group">
        {/* Main card content — tappable to expand */}
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ocean/30 rounded-lg -mx-2 px-2 py-1 transition-colors hover:bg-accent/50"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-1.5">
              {/* Title + badge */}
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
              </div>

              {/* Immigration context */}
              {immigrationContext && (
                <p className="text-xs font-medium text-jade">
                  {immigrationContext}
                </p>
              )}

              {/* Urgency + deadline */}
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

            {/* Expand indicator */}
            <div className="shrink-0 pt-1 text-muted-foreground/50">
              {expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
            </div>
          </div>
        </button>

        {/* Expanded view — full description */}
        {expanded && (
          <div className="animate-in fade-in duration-200 mt-3 pl-0.5 space-y-3">
            <p className="text-sm text-muted-foreground leading-relaxed">
              {job.why_fits}
            </p>
            {job.salary && (
              <p className="text-sm text-foreground/70">{job.salary}</p>
            )}
            {job.skills_required.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {job.skills_required.map((skill) => (
                  <span
                    key={skill}
                    className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            )}
            {job.url && (
              <a
                href={job.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-xs text-ocean hover:text-ocean-deep hover:bg-ocean/5 transition-colors"
              >
                View posting
                <ExternalLink className="size-3" />
              </a>
            )}
          </div>
        )}

        {/* Tag picker for dismissals */}
        {showTags && (
          <TagPicker onSelect={handleTagSelect} onSkip={handleTagSkip} />
        )}

        {/* Action buttons — always visible */}
        {!showTags && (
          <div className="flex items-center gap-2 mt-3">
            <Button
              size="sm"
              onClick={(e) => { e.stopPropagation(); handleVote('interested') }}
              className="gap-1 bg-jade/10 text-jade border-jade/20 hover:bg-jade/20 hover:text-jade border"
            >
              <Heart className="size-3.5" />
              Interested
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => { e.stopPropagation(); handleVote('not_for_me') }}
              className="gap-1 text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" />
              Not for me
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => { e.stopPropagation(); handleVote('save_for_later') }}
              className="gap-1 text-muted-foreground hover:text-foreground"
            >
              <Bookmark className="size-3.5" />
              Save
            </Button>
          </div>
        )}
      </div>

      {/* Separator */}
      <div className="h-px bg-border/50" />
    </article>
  )
}
