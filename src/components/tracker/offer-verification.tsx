'use client'

import { useEffect } from 'react'
import { motion } from 'framer-motion'
import type { TrackedApplication } from './kanban-board'

const VERIFICATION_QUESTIONS = [
  'Is this employer cap-exempt (university, nonprofit, or government lab)?',
  'Does the offer include H-1B sponsorship or is it OPT-compatible?',
  'Is there a start date that works with your current authorization timeline?',
]

interface OfferVerificationProps {
  application: TrackedApplication
  onConfirm: () => void
  onCancel: () => void
}

export function OfferVerification({ application, onConfirm, onCancel }: OfferVerificationProps) {
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
        data-testid="offer-verification"
        role="dialog"
        aria-modal="true"
        aria-label={`Verify immigration details for ${application.job.company}`}
      >
        <p className="text-sm font-medium text-foreground mb-1">
          Congratulations on the offer!
        </p>
        <p className="text-xs text-muted-foreground mb-4">
          Before moving {application.job.company} to Offer, double-check these immigration details:
        </p>

        <ul className="space-y-3 mb-5">
          {VERIFICATION_QUESTIONS.map((question, i) => (
            <li key={i} className="flex gap-2.5 text-sm text-foreground leading-relaxed">
              <span className="flex-shrink-0 mt-0.5 size-5 rounded-full bg-ocean/10 text-ocean text-xs flex items-center justify-center">
                {i + 1}
              </span>
              {question}
            </li>
          ))}
        </ul>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 text-center text-sm text-muted-foreground hover:text-foreground py-2.5 rounded-xl hover:bg-muted/50 transition-colors min-h-[44px]"
            data-testid="offer-cancel"
          >
            Go back
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 text-center text-sm font-medium text-white bg-ocean hover:bg-ocean-deep py-2.5 rounded-xl transition-colors min-h-[44px]"
            data-testid="offer-confirm"
          >
            Confirmed, move to Offer
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
