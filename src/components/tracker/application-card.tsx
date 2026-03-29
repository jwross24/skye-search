'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import type { TrackedApplication, KanbanStatus } from './kanban-board'

const VISA_BADGE: Record<string, { label: string; className: string }> = {
  cap_exempt: { label: 'Cap-exempt', className: 'bg-jade/10 text-jade' },
  cap_subject: { label: 'Cap-subject', className: 'bg-amber-warm/10 text-amber-warm' },
  opt_compatible: { label: 'OPT', className: 'bg-ocean/10 text-ocean' },
  canada: { label: 'Canada', className: 'bg-muted text-muted-foreground' },
  unknown: { label: 'Unknown', className: 'bg-muted text-muted-foreground/60' },
}

const STATUS_OPTIONS: { value: KanbanStatus; label: string }[] = [
  { value: 'interested', label: 'Interested' },
  { value: 'tailoring', label: 'Tailoring' },
  { value: 'applied', label: 'Applied' },
  { value: 'phone_screen', label: 'Phone Screen' },
  { value: 'interview', label: 'Interview' },
  { value: 'offer', label: 'Offer' },
  { value: 'rejected', label: 'Rejected' },
]

interface ApplicationCardProps {
  application: TrackedApplication
  layout: 'card' | 'list'
  onMove: (appId: string, status: KanbanStatus) => void
  onSelect: () => void
}

export function ApplicationCard({ application, layout, onMove, onSelect }: ApplicationCardProps) {
  const [showStatusMenu, setShowStatusMenu] = useState(false)
  const badge = VISA_BADGE[application.job.visa_path] ?? VISA_BADGE.unknown

  const handleStatusChange = (newStatus: KanbanStatus) => {
    onMove(application.id, newStatus)
    setShowStatusMenu(false)
  }

  if (layout === 'list') {
    return (
      <div
        className="flex items-center gap-3 px-4 py-3 rounded-xl bg-card hover:bg-accent/30 transition-colors cursor-pointer"
        data-testid={`card-${application.id}`}
        role="button"
        tabIndex={0}
        onClick={onSelect}
        onKeyDown={(e) => e.key === 'Enter' && onSelect()}
      >
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">
            {application.job.title}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {application.job.company}
          </p>
        </div>
        <span className={`flex-shrink-0 text-[10px] px-1.5 py-0.5 rounded-full ${badge.className}`}>
          {badge.label}
        </span>
        {/* Tap-to-move selector for mobile/list */}
        <div className="relative flex-shrink-0">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setShowStatusMenu(!showStatusMenu)
            }}
            className="flex items-center gap-1 text-xs text-muted-foreground px-2 py-1 rounded-md hover:bg-accent/50 min-h-[44px]"
            aria-label={`Move ${application.job.title}`}
            data-testid={`card-${application.id}-move-button`}
          >
            {STATUS_OPTIONS.find((s) => s.value === application.status)?.label}
            <ChevronDown className="size-3" />
          </button>
          {showStatusMenu && (
            <StatusMenu
              currentStatus={application.status}
              onSelect={handleStatusChange}
              onClose={() => setShowStatusMenu(false)}
            />
          )}
        </div>
      </div>
    )
  }

  // Card layout (board view)
  return (
    <div
      className="px-3 py-2.5 rounded-xl bg-card hover:bg-accent/30 transition-colors cursor-pointer group"
      data-testid={`card-${application.id}`}
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => e.key === 'Enter' && onSelect()}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground leading-tight truncate">
            {application.job.title}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            {application.job.company}
          </p>
        </div>
        {/* Move button (visible on hover) */}
        <div className="relative flex-shrink-0">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setShowStatusMenu(!showStatusMenu)
            }}
            className="opacity-0 group-hover:opacity-100 focus:opacity-100 p-1 rounded text-muted-foreground hover:text-foreground transition-opacity"
            aria-label={`Move ${application.job.title}`}
            data-testid={`card-${application.id}-move-button`}
          >
            <ChevronDown className="size-3.5" />
          </button>
          {showStatusMenu && (
            <StatusMenu
              currentStatus={application.status}
              onSelect={handleStatusChange}
              onClose={() => setShowStatusMenu(false)}
            />
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 mt-2">
        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${badge.className}`}>
          {badge.label}
        </span>
        <span className="text-[10px] text-muted-foreground/50">
          {new Date(application.dateAdded + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })}
        </span>
      </div>
      {application.nextAction && (
        <p className="text-[10px] text-muted-foreground mt-1.5 truncate">
          Next: {application.nextAction}
        </p>
      )}
    </div>
  )
}

// ─── Status Menu ────────────────────────────────────────────────────────────

function StatusMenu({
  currentStatus,
  onSelect,
  onClose,
}: {
  currentStatus: KanbanStatus
  onSelect: (status: KanbanStatus) => void
  onClose: () => void
}) {
  return (
    <>
      {/* Backdrop — stopPropagation prevents the click from reaching the card's onSelect */}
      <div
        className="fixed inset-0 z-40"
        onClick={(e) => { e.stopPropagation(); onClose() }}
        role="presentation"
      />
      {/* Menu */}
      <div
        className="absolute right-0 top-full mt-1 z-50 bg-popover border border-border rounded-lg shadow-lg py-1 min-w-[140px]"
        role="menu"
        tabIndex={-1}
        onKeyDown={(e) => e.key === 'Escape' && onClose()}
        data-testid="status-menu"
      >
        {STATUS_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            role="menuitem"
            onClick={(e) => {
              e.stopPropagation()
              onSelect(option.value)
            }}
            disabled={option.value === currentStatus}
            className={`w-full text-left px-3 py-1.5 text-sm transition-colors
              ${option.value === currentStatus
                ? 'text-muted-foreground/40 cursor-default'
                : 'text-foreground hover:bg-accent/50 cursor-pointer'
              }`}
            data-testid={`status-${option.value}`}
          >
            {option.label}
            {option.value === currentStatus && (
              <span className="ml-2 text-xs text-muted-foreground/40">current</span>
            )}
          </button>
        ))}
      </div>
    </>
  )
}

export { VISA_BADGE, STATUS_OPTIONS }
