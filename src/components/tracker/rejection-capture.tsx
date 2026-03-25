'use client'

import { useEffect } from 'react'
import { motion } from 'framer-motion'
import type { TrackedApplication, RejectionType } from './kanban-board'

const REJECTION_OPTIONS: { value: RejectionType; label: string; description: string }[] = [
  { value: 'form_email', label: 'Form email', description: 'Standard response, nothing personal' },
  { value: 'personalized', label: 'Personalized', description: 'They took time to write back' },
  { value: 'ghosted', label: 'Ghosted', description: 'No response after a while' },
]

interface RejectionCaptureProps {
  application: TrackedApplication
  onConfirm: (rejectionType?: RejectionType) => void
  onCancel: () => void
}

export function RejectionCapture({ application, onConfirm, onCancel }: RejectionCaptureProps) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel() }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onCancel])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-50 flex items-center justify-center"
    >
      <div
        className="absolute inset-0 bg-background/80"
        onClick={onCancel}
        role="presentation"
      />
      <motion.div
        initial={{ y: 8, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 8, opacity: 0 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-sm mx-4 bg-card border border-border rounded-2xl shadow-lg p-5"
        data-testid="rejection-capture"
        role="dialog"
        aria-label={`How was ${application.job.company}'s response?`}
      >
        <p className="text-sm font-medium text-foreground mb-1">
          What happened?
        </p>
        <p className="text-xs text-muted-foreground mb-4">
          Noting how {application.job.company} responded helps you spot patterns over time.
        </p>

        <div className="space-y-2 mb-4">
          {REJECTION_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onConfirm(option.value)}
              className="w-full text-left px-3 py-2.5 rounded-xl bg-muted/50 hover:bg-accent/50 transition-colors min-h-[44px]"
              data-testid={`rejection-${option.value}`}
            >
              <p className="text-sm text-foreground">{option.label}</p>
              <p className="text-xs text-muted-foreground">{option.description}</p>
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => onConfirm(undefined)}
          className="w-full text-center text-xs text-muted-foreground hover:text-foreground py-2 transition-colors"
          data-testid="rejection-skip"
        >
          Skip — just move it
        </button>
      </motion.div>
    </motion.div>
  )
}
