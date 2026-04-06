'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'
import type { TrackedApplication, KanbanStatus } from './kanban-board'
import { VisaBadge } from '@/components/visa-badge'

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
  onUninterest?: (appId: string) => void
}

export function ApplicationCard({ application, layout, onMove, onSelect, onUninterest }: ApplicationCardProps) {
  const [showStatusMenu, setShowStatusMenu] = useState(false)

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
        <VisaBadge
          visaPath={application.job.visa_path}
          confidence={application.job.visa_path === 'cap_exempt' ? application.job.cap_exempt_confidence : undefined}
        />
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
        <VisaBadge
          visaPath={application.job.visa_path}
          confidence={application.job.visa_path === 'cap_exempt' ? application.job.cap_exempt_confidence : undefined}
        />
        <span className="text-[10px] text-muted-foreground/50">
          {new Date(application.dateAdded + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })}
        </span>
      </div>
      {application.nextAction && (
        <p className="text-[10px] text-muted-foreground mt-1.5 truncate">
          Next: {application.nextAction}
        </p>
      )}
      {application.status === 'interested' && onUninterest && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onUninterest(application.id)
          }}
          className="mt-2 text-[11px] text-muted-foreground/50 hover:text-foreground/70 transition-colors"
          data-testid={`card-${application.id}-uninterest`}
          aria-label={`Remove ${application.job.title} from interested`}
        >
          Changed my mind
        </button>
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
  const menuRef = useRef<HTMLDivElement>(null)
  // Compute initial focused index from props (no useEffect + setState needed)
  const firstEnabledIndex = STATUS_OPTIONS.findIndex((o) => o.value !== currentStatus)
  const [focusedIndex, setFocusedIndex] = useState(firstEnabledIndex >= 0 ? firstEnabledIndex : 0)

  // Auto-focus the menu container on mount so keyboard events work immediately
  useEffect(() => {
    menuRef.current?.focus()
  }, [])

  // Keep the focused button scrolled into view + visually focused
  useEffect(() => {
    if (focusedIndex >= 0 && menuRef.current) {
      const buttons = menuRef.current.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')
      buttons[focusedIndex]?.focus()
    }
  }, [focusedIndex])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const enabledIndices = STATUS_OPTIONS
      .map((o, i) => (o.value !== currentStatus ? i : -1))
      .filter((i) => i >= 0)

    if (!enabledIndices.length) return

    switch (e.key) {
      case 'ArrowDown': {
        e.preventDefault()
        const currentPos = enabledIndices.indexOf(focusedIndex)
        const next = currentPos < enabledIndices.length - 1 ? enabledIndices[currentPos + 1] : enabledIndices[0]
        setFocusedIndex(next)
        break
      }
      case 'ArrowUp': {
        e.preventDefault()
        const currentPos = enabledIndices.indexOf(focusedIndex)
        const prev = currentPos > 0 ? enabledIndices[currentPos - 1] : enabledIndices[enabledIndices.length - 1]
        setFocusedIndex(prev)
        break
      }
      case 'Home': {
        e.preventDefault()
        setFocusedIndex(enabledIndices[0])
        break
      }
      case 'End': {
        e.preventDefault()
        setFocusedIndex(enabledIndices[enabledIndices.length - 1])
        break
      }
      case 'Escape':
        onClose()
        break
      case 'Enter':
      case ' ':
        e.preventDefault()
        if (focusedIndex >= 0 && STATUS_OPTIONS[focusedIndex].value !== currentStatus) {
          onSelect(STATUS_OPTIONS[focusedIndex].value)
        }
        break
    }
  }

  return (
    <>
      {/* Backdrop — stopPropagation prevents the click from reaching the card's onSelect */}
      <div
        className="fixed inset-0 z-40"
        onClick={(e) => { e.stopPropagation(); onClose() }}
        role="presentation"
      />
      {/* Menu — WAI-ARIA menu pattern with arrow key navigation */}
      <div
        ref={menuRef}
        className="absolute right-0 top-full mt-1 z-50 bg-popover border border-border rounded-lg shadow-lg py-1 min-w-[140px]"
        role="menu"
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        data-testid="status-menu"
      >
        {STATUS_OPTIONS.map((option, index) => (
          <button
            key={option.value}
            type="button"
            role="menuitem"
            tabIndex={index === focusedIndex ? 0 : -1}
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

export { STATUS_OPTIONS }
