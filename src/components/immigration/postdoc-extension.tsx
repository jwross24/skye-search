'use client'

import { useState } from 'react'
import { CalendarClock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogHeader,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'
import { updatePostdocEndDate } from '@/app/immigration/actions'

interface PostdocExtensionProps {
  currentEndDate: string
  today: string
  onExtended: (newEndDate: string) => void
}

export function PostdocExtension({
  currentEndDate,
  today,
  onExtended,
}: PostdocExtensionProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [newDate, setNewDate] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<{
    success: boolean
    message: string
    correctionsCount?: number
  } | null>(null)

  const formatDate = (iso: string) => {
    const d = new Date(iso + 'T00:00:00')
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  }

  const handleSubmit = async () => {
    if (!newDate || newDate <= currentEndDate) return

    setSubmitting(true)
    const res = await updatePostdocEndDate(newDate)
    setSubmitting(false)

    if (res.success && 'corrections_count' in res) {
      setResult({
        success: true,
        message: res.corrections_count && res.corrections_count > 0
          ? `Done! ${res.corrections_count} day${res.corrections_count === 1 ? '' : 's'} corrected on your unemployment clock.`
          : 'All set. No clock adjustments were needed.',
        correctionsCount: res.corrections_count,
      })
      onExtended(newDate)
      setDialogOpen(false)
      setNewDate('')
    } else {
      setResult({
        success: false,
        message: res.error ?? 'Something went wrong. Try again in a moment.',
      })
    }
  }

  const isPostdocActive = today <= currentEndDate
  const daysUntilEnd = Math.ceil(
    (new Date(currentEndDate + 'T00:00:00').getTime() - new Date(today + 'T00:00:00').getTime()) / (1000 * 60 * 60 * 24),
  )

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3">
        <CalendarClock className="mt-0.5 h-4 w-4 text-muted-foreground/70 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">
            PostDoc ends {formatDate(currentEndDate)}
          </p>
          <p className="text-xs text-muted-foreground/70 mt-0.5">
            {isPostdocActive
              ? daysUntilEnd === 0
                ? 'Last day today'
                : `${daysUntilEnd} day${daysUntilEnd === 1 ? '' : 's'} remaining`
              : 'PostDoc period has ended'}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setDialogOpen(true)}
          className="flex-shrink-0 text-xs"
        >
          Update date
        </Button>
      </div>

      {/* Success/error feedback */}
      {result && (
        <div
          className={`rounded-lg px-3 py-2 text-xs ${
            result.success
              ? 'bg-jade/10 text-jade-deep'
              : 'bg-amber-warm/10 text-amber-warm'
          }`}
          role="status"
        >
          {result.message}
          {result.success && (
            <p className="mt-1 text-muted-foreground/70">
              Date entered by you. Confirm with your DSO for official records.
            </p>
          )}
        </div>
      )}

      {/* Confirmation dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update PostDoc end date</DialogTitle>
            <DialogDescription>
              If your DSO issued a new I-20 with an updated program end date,
              enter it here. Your unemployment clock will be recalculated.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <label
                htmlFor="current-end-date"
                className="block text-xs font-medium text-muted-foreground mb-1"
              >
                Current end date
              </label>
              <p id="current-end-date" className="text-sm text-foreground">
                {formatDate(currentEndDate)}
              </p>
            </div>

            <div>
              <label
                htmlFor="new-end-date"
                className="block text-xs font-medium text-muted-foreground mb-1"
              >
                New I-20 end date
              </label>
              <input
                id="new-end-date"
                type="date"
                value={newDate}
                min={currentEndDate}
                onChange={(e) => setNewDate(e.target.value)}
                aria-describedby={newDate && newDate <= currentEndDate ? 'new-date-error' : undefined}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-ocean focus:outline-none focus:ring-2 focus:ring-ocean/20"
              />
              {newDate && newDate <= currentEndDate && (
                <p id="new-date-error" className="mt-1 text-xs text-amber-warm" role="alert">
                  New date must be after {formatDate(currentEndDate)}
                </p>
              )}
            </div>

            <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
              <p className="font-medium text-foreground/80 mb-1">What happens next</p>
              <ul className="space-y-1 list-disc pl-4">
                <li>Your unemployment clock starts counting from {newDate ? formatDate(newDate) : 'the new date'} + 1 day</li>
                <li>Any unemployment days logged before the new end date will be corrected</li>
                <li>Original records are preserved for your attorney</li>
              </ul>
            </div>
          </div>

          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Cancel
            </DialogClose>
            <Button
              onClick={handleSubmit}
              disabled={!newDate || newDate <= currentEndDate || submitting}
            >
              {submitting ? 'Updating...' : 'Confirm update'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
