'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Undo2 } from 'lucide-react'
import type { VoteDecision } from '@/app/jobs/actions'

const MESSAGES: Record<VoteDecision, string> = {
  interested: 'Added to your tracker',
  not_for_me: 'Dismissed',
  save_for_later: 'Saved for later',
}

interface UndoToastProps {
  decision: VoteDecision
  onUndo: () => void
  onExpire: () => void
  duration?: number
}

export function UndoToast({ decision, onUndo, onExpire, duration = 4000 }: UndoToastProps) {
  const [progress, setProgress] = useState(100)

  useEffect(() => {
    const start = Date.now()
    const interval = setInterval(() => {
      const elapsed = Date.now() - start
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100)
      setProgress(remaining)
      if (remaining <= 0) {
        clearInterval(interval)
        onExpire()
      }
    }, 50)

    return () => clearInterval(interval)
  }, [duration, onExpire])

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className="flex items-center gap-3 rounded-xl bg-foreground/90 px-4 py-2.5 text-sm text-background shadow-lg"
    >
      <span>{MESSAGES[decision]}</span>
      <button
        type="button"
        onClick={onUndo}
        className="inline-flex items-center gap-1 rounded-lg px-2 py-0.5 font-medium text-ocean-light hover:bg-background/10 transition-colors"
      >
        <Undo2 className="size-3" aria-hidden />
        Undo
      </button>
      {/* Progress bar */}
      <div className="w-12 h-0.5 rounded-full bg-background/20 overflow-hidden">
        <div
          className="h-full bg-ocean-light/60 transition-none"
          style={{ width: `${progress}%` }}
        />
      </div>
    </motion.div>
  )
}
