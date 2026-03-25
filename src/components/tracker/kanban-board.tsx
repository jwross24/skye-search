'use client'

import { useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { List, LayoutGrid } from 'lucide-react'
import { ApplicationCard } from './application-card'
import { CardDetail } from './card-detail'
import type { SeedJob } from '@/db/seed'

// ─── Types ──────────────────────────────────────────────────────────────────

export type KanbanStatus = 'interested' | 'applied' | 'interview' | 'offer' | 'rejected'

export interface TrackedApplication {
  id: string
  job: SeedJob
  status: KanbanStatus
  dateAdded: string
  notes: string
  nextAction: string
  nextActionDate: string
  contacts: { name: string; email: string; role: string }[]
}

// ─── Constants ──────────────────────────────────────────────────────────────

const COLUMNS: { id: KanbanStatus; label: string; emptyMessage: string }[] = [
  { id: 'interested', label: 'Interested', emptyMessage: 'Check your daily picks for ideas' },
  { id: 'applied', label: 'Applied', emptyMessage: 'Ready to submit? Move a card here' },
  { id: 'interview', label: 'Interview', emptyMessage: 'Responses will show up here' },
  { id: 'offer', label: 'Offer', emptyMessage: 'The goal. Keep going.' },
]

const REJECTED_COLUMN = {
  id: 'rejected' as KanbanStatus,
  label: 'Rejected',
  emptyMessage: 'Rejections are data, not failure',
}

const ALL_STATUSES: KanbanStatus[] = ['interested', 'applied', 'interview', 'offer', 'rejected']

// ─── Board ──────────────────────────────────────────────────────────────────

interface KanbanBoardProps {
  initialApplications: TrackedApplication[]
}

export function KanbanBoard({ initialApplications }: KanbanBoardProps) {
  const [applications, setApplications] = useState(initialApplications)
  const [selectedApp, setSelectedApp] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'board' | 'list'>('board')

  const moveApplication = (appId: string, newStatus: KanbanStatus) => {
    setApplications((prev) =>
      prev.map((app) => (app.id === appId ? { ...app, status: newStatus } : app)),
    )
  }

  const updateApplication = (appId: string, updates: Partial<TrackedApplication>) => {
    setApplications((prev) =>
      prev.map((app) => (app.id === appId ? { ...app, ...updates } : app)),
    )
  }

  const selectedApplication = applications.find((a) => a.id === selectedApp) ?? null

  const columnCounts = ALL_STATUSES.reduce(
    (acc, status) => {
      acc[status] = applications.filter((a) => a.status === status).length
      return acc
    },
    {} as Record<KanbanStatus, number>,
  )

  return (
    <div data-testid="kanban-board">
      {/* Header bar */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <p className="text-sm text-muted-foreground">
            {applications.length} application{applications.length !== 1 ? 's' : ''}
          </p>
          <div className="flex gap-1 text-xs text-muted-foreground/70">
            {COLUMNS.map((col, i) => (
              <span key={col.id}>
                {i > 0 && <span className="mx-1">·</span>}
                {columnCounts[col.id]} {col.label.toLowerCase()}
              </span>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setViewMode(viewMode === 'board' ? 'list' : 'board')}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
            aria-label={viewMode === 'board' ? 'Switch to list view' : 'Switch to board view'}
            data-testid="view-toggle"
          >
            {viewMode === 'board' ? <List className="size-4" /> : <LayoutGrid className="size-4" />}
          </button>
        </div>
      </div>

      {/* Board view */}
      {viewMode === 'board' && (
        <div
          className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 lg:mx-0 lg:px-0"
          data-testid="board-view"
        >
          {COLUMNS.map((column) => (
            <KanbanColumn
              key={column.id}
              column={column}
              applications={applications.filter((a) => a.status === column.id)}
              onMove={moveApplication}
              onSelect={setSelectedApp}
            />
          ))}
          <KanbanColumn
            column={REJECTED_COLUMN}
            applications={applications.filter((a) => a.status === 'rejected')}
            onMove={moveApplication}
            onSelect={setSelectedApp}
            isRejected
          />
        </div>
      )}

      {/* List view */}
      {viewMode === 'list' && (
        <div className="space-y-2" data-testid="list-view">
          {applications.map((app) => (
            <ApplicationCard
              key={app.id}
              application={app}
              layout="list"
              onMove={moveApplication}
              onSelect={() => setSelectedApp(app.id)}
            />
          ))}
          {applications.length === 0 && (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No applications yet — check your daily picks
            </p>
          )}
        </div>
      )}

      {/* Detail panel */}
      <AnimatePresence>
        {selectedApplication && (
          <CardDetail
            application={selectedApplication}
            onClose={() => setSelectedApp(null)}
            onUpdate={(updates) => updateApplication(selectedApplication.id, updates)}
            onMove={(status) => moveApplication(selectedApplication.id, status)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Column ─────────────────────────────────────────────────────────────────

function KanbanColumn({
  column,
  applications,
  onMove,
  onSelect,
  isRejected = false,
}: {
  column: { id: KanbanStatus; label: string; emptyMessage: string }
  applications: TrackedApplication[]
  onMove: (appId: string, status: KanbanStatus) => void
  onSelect: (appId: string) => void
  isRejected?: boolean
}) {
  return (
    <div
      className={`flex-shrink-0 w-64 lg:w-72 ${isRejected ? 'opacity-70' : ''}`}
      data-testid={`column-${column.id}`}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-foreground">
          {column.label}
        </h3>
        <span className="text-xs text-muted-foreground tabular-nums">
          {applications.length}
        </span>
      </div>
      <div className="space-y-2 min-h-[120px]">
        {applications.map((app) => (
          <ApplicationCard
            key={app.id}
            application={app}
            layout="card"
            onMove={onMove}
            onSelect={() => onSelect(app.id)}
          />
        ))}
        {applications.length === 0 && (
          <p className="text-xs text-muted-foreground/60 py-6 text-center leading-relaxed">
            {column.emptyMessage}
          </p>
        )}
      </div>
    </div>
  )
}

export { ALL_STATUSES, COLUMNS }
