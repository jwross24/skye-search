'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { X, ExternalLink } from 'lucide-react'
import type { TrackedApplication, KanbanStatus } from './kanban-board'
import { STATUS_OPTIONS, VISA_BADGE } from './application-card'
import { CoverLetterPanel } from './cover-letter-panel'

interface CardDetailProps {
  application: TrackedApplication
  onClose: () => void
  onUpdate: (updates: Partial<TrackedApplication>) => void
  onMove: (status: KanbanStatus) => void
}

export function CardDetail({ application, onClose, onUpdate, onMove }: CardDetailProps) {
  const [notes, setNotes] = useState(application.notes)
  const [nextAction, setNextAction] = useState(application.nextAction)
  const [nextActionDate, setNextActionDate] = useState(application.nextActionDate)
  const badge = VISA_BADGE[application.job.visa_path] ?? VISA_BADGE.unknown

  const handleSaveNotes = () => {
    onUpdate({ notes, nextAction, nextActionDate })
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-background/80"
        onClick={onClose}
        role="presentation"
      />

      {/* Panel */}
      <motion.div
        initial={{ y: 12, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 12, opacity: 0 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-lg mx-4 bg-card border border-border rounded-2xl shadow-lg overflow-y-auto max-h-[calc(100vh-5rem)] sm:max-h-[calc(100vh-7rem)]"
        data-testid="card-detail"
        role="dialog"
        aria-modal="true"
        aria-label={`${application.job.title} at ${application.job.company}`}
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-semibold text-foreground leading-tight">
                {application.job.title}
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                {application.job.company}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <span className={`text-xs px-2 py-0.5 rounded-full ${badge.className}`}>
                  {badge.label}
                </span>
                {application.job.location && (
                  <span className="text-xs text-muted-foreground">
                    {application.job.location}
                  </span>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
              aria-label="Close"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* Job link */}
          {application.job.url && (
            <a
              href={application.job.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-ocean hover:text-ocean-deep mt-2"
            >
              View posting <ExternalLink className="size-3" />
            </a>
          )}
        </div>

        {/* Status selector */}
        <div className="px-5 py-3 border-t border-border/50">
          <p className="text-xs text-muted-foreground mb-2">Status</p>
          <div className="flex gap-1.5 flex-wrap">
            {STATUS_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => onMove(option.value)}
                className={`text-xs px-3 py-1.5 rounded-lg transition-colors
                  ${option.value === application.status
                    ? 'bg-ocean/10 text-ocean font-medium'
                    : 'bg-muted/50 text-muted-foreground hover:bg-accent/50'
                  }`}
                data-testid={`detail-status-${option.value}`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Cover Letter (Tailoring column) */}
        {(application.status === 'tailoring' || application.status === 'applied') && (
          <CoverLetterPanel
            applicationId={application.id}
            companyName={application.job.company}
            onStatusChange={(newStatus) => onMove(newStatus as KanbanStatus)}
          />
        )}

        {/* Notes */}
        <div className="px-5 py-3 border-t border-border/50">
          <label htmlFor="app-notes" className="text-xs text-muted-foreground mb-1.5 block">
            Notes
          </label>
          <textarea
            id="app-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={handleSaveNotes}
            placeholder="Add notes about this application..."
            className="w-full text-sm bg-transparent border border-border/50 rounded-lg px-3 py-2 resize-none focus:border-ocean focus:outline-none focus:ring-1 focus:ring-ocean/20"
            rows={3}
            data-testid="detail-notes"
          />
        </div>

        {/* Next action */}
        <div className="px-5 py-3 border-t border-border/50">
          <p className="text-xs text-muted-foreground mb-1.5">Next action</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={nextAction}
              onChange={(e) => setNextAction(e.target.value)}
              onBlur={handleSaveNotes}
              placeholder="e.g. Follow up with PI"
              className="flex-1 text-sm bg-transparent border border-border/50 rounded-lg px-3 py-1.5 focus:border-ocean focus:outline-none focus:ring-1 focus:ring-ocean/20"
              data-testid="detail-next-action"
            />
            <input
              type="date"
              value={nextActionDate}
              onChange={(e) => {
                setNextActionDate(e.target.value)
                onUpdate({ nextActionDate: e.target.value })
              }}
              className="text-sm bg-transparent border border-border/50 rounded-lg px-3 py-1.5 focus:border-ocean focus:outline-none focus:ring-1 focus:ring-ocean/20"
              data-testid="detail-next-date"
            />
          </div>
        </div>

        {/* Contacts */}
        {application.contacts.length > 0 && (
          <div className="px-5 py-3 border-t border-border/50">
            <p className="text-xs text-muted-foreground mb-1.5">Contacts</p>
            <div className="space-y-1">
              {application.contacts.map((contact, i) => (
                <p key={i} className="text-sm text-foreground">
                  {contact.name}
                  {contact.role && <span className="text-muted-foreground"> · {contact.role}</span>}
                  {contact.email && (
                    <a href={`mailto:${contact.email}`} className="text-ocean ml-1 text-xs">
                      {contact.email}
                    </a>
                  )}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Why it fits */}
        {application.job.why_fits && (
          <div className="px-5 py-3 border-t border-border/50">
            <p className="text-xs text-muted-foreground mb-1">Why it fits</p>
            <p className="text-sm text-foreground leading-relaxed">
              {application.job.why_fits}
            </p>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}
