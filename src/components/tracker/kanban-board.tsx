'use client'

import { useState, useMemo } from 'react'
import { AnimatePresence } from 'framer-motion'
import { List, LayoutGrid } from 'lucide-react'
import { ApplicationCard } from './application-card'
import { CardDetail } from './card-detail'
import { RejectionCapture } from './rejection-capture'
import { OfferVerification } from './offer-verification'
import { useIsMobile } from '@/hooks/use-mobile'
import type { SeedJob } from '@/db/seed'

// ─── Types ──────────────────────────────────────────────────────────────────

export type KanbanStatus = 'interested' | 'applied' | 'phone_screen' | 'interview' | 'offer' | 'rejected'

export type RejectionType = 'form_email' | 'personalized' | 'ghosted'

export interface TrackedApplication {
  id: string
  job: SeedJob
  status: KanbanStatus
  dateAdded: string
  notes: string
  nextAction: string
  nextActionDate: string
  contacts: { name: string; email: string; role: string }[]
  rejectionType?: RejectionType
  offerVerified?: boolean
}

// ─── Constants ──────────────────────────────────────────────────────────────

const COLUMNS: { id: KanbanStatus; label: string; emptyMessage: string }[] = [
  { id: 'interested', label: 'Interested', emptyMessage: 'Check your daily picks for ideas' },
  { id: 'applied', label: 'Applied', emptyMessage: 'Ready to submit? Move a card here' },
  { id: 'phone_screen', label: 'Phone Screen', emptyMessage: 'First conversations land here' },
  { id: 'interview', label: 'Interview', emptyMessage: 'Responses will show up here' },
  { id: 'offer', label: 'Offer', emptyMessage: 'The goal. Keep going.' },
]

/** Statuses that mean a card has advanced past Applied */
const PAST_APPLIED: KanbanStatus[] = ['phone_screen', 'interview', 'offer']

const REJECTED_COLUMN = {
  id: 'rejected' as KanbanStatus,
  label: 'Rejected',
  emptyMessage: 'Rejections are data, not failure',
}

const ALL_STATUSES: KanbanStatus[] = ['interested', 'applied', 'phone_screen', 'interview', 'offer', 'rejected']

// ─── Board ──────────────────────────────────────────────────────────────────

interface KanbanBoardProps {
  initialApplications: TrackedApplication[]
}

export function KanbanBoard({ initialApplications }: KanbanBoardProps) {
  const isMobile = useIsMobile()
  const [applications, setApplications] = useState(initialApplications)
  const [selectedApp, setSelectedApp] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'board' | 'list' | null>(null)
  const [pendingReject, setPendingReject] = useState<string | null>(null)
  const [pendingOffer, setPendingOffer] = useState<string | null>(null)

  // Resolve view mode: null = use mobile default
  const resolvedViewMode = viewMode ?? (isMobile ? 'list' : 'board')

  // Progressive reveal: Phone Screen visible once any card has advanced past Applied
  const showPhoneScreen = useMemo(
    () => applications.some((a) => PAST_APPLIED.includes(a.status)),
    [applications],
  )

  const visibleColumns = useMemo(
    () => showPhoneScreen ? COLUMNS : COLUMNS.filter((c) => c.id !== 'phone_screen'),
    [showPhoneScreen],
  )

  const moveApplication = (appId: string, newStatus: KanbanStatus) => {
    // Intercept moves to Rejected — show quick-capture first
    if (newStatus === 'rejected') {
      setPendingReject(appId)
      return
    }
    // Intercept moves to Offer — show verification prompt first
    if (newStatus === 'offer') {
      setPendingOffer(appId)
      return
    }
    setApplications((prev) =>
      prev.map((app) => (app.id === appId ? { ...app, status: newStatus } : app)),
    )
  }

  const confirmReject = (appId: string, rejectionType?: RejectionType) => {
    setApplications((prev) =>
      prev.map((app) =>
        app.id === appId ? { ...app, status: 'rejected' as KanbanStatus, rejectionType } : app,
      ),
    )
    setPendingReject(null)
  }

  const confirmOffer = (appId: string) => {
    setApplications((prev) =>
      prev.map((app) =>
        app.id === appId ? { ...app, status: 'offer' as KanbanStatus, offerVerified: true } : app,
      ),
    )
    setPendingOffer(null)
  }

  const updateApplication = (appId: string, updates: Partial<TrackedApplication>) => {
    setApplications((prev) =>
      prev.map((app) => (app.id === appId ? { ...app, ...updates } : app)),
    )
  }

  const selectedApplication = applications.find((a) => a.id === selectedApp) ?? null
  const pendingRejectApp = applications.find((a) => a.id === pendingReject) ?? null
  const pendingOfferApp = applications.find((a) => a.id === pendingOffer) ?? null

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
            {visibleColumns.map((col, i) => (
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
            onClick={() => setViewMode(resolvedViewMode === 'board' ? 'list' : 'board')}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
            aria-label={resolvedViewMode === 'board' ? 'Switch to list view' : 'Switch to board view'}
            data-testid="view-toggle"
          >
            {resolvedViewMode === 'board' ? <List className="size-4" /> : <LayoutGrid className="size-4" />}
          </button>
        </div>
      </div>

      {/* Board view */}
      {resolvedViewMode === 'board' && (
        <div
          className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 lg:mx-0 lg:px-0"
          data-testid="board-view"
        >
          {visibleColumns.map((column) => (
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
      {resolvedViewMode === 'list' && (
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

      {/* Rejection quick-capture */}
      <AnimatePresence>
        {pendingRejectApp && (
          <RejectionCapture
            application={pendingRejectApp}
            onConfirm={(rejectionType) => confirmReject(pendingRejectApp.id, rejectionType)}
            onCancel={() => setPendingReject(null)}
          />
        )}
      </AnimatePresence>

      {/* Offer verification prompt */}
      <AnimatePresence>
        {pendingOfferApp && (
          <OfferVerification
            application={pendingOfferApp}
            onConfirm={() => confirmOffer(pendingOfferApp.id)}
            onCancel={() => setPendingOffer(null)}
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

export { ALL_STATUSES, COLUMNS, PAST_APPLIED }
