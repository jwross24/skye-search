'use client'

import { useState } from 'react'
import { Plus, Link, X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { addManualJob, type ManualJobInput } from '@/app/jobs/actions'

const VISA_OPTIONS = [
  { value: 'cap_exempt', label: 'Cap-exempt (university, nonprofit, gov lab)' },
  { value: 'cap_subject', label: 'Cap-subject (private H-1B)' },
  { value: 'opt_compatible', label: 'OPT compatible' },
  { value: 'canada', label: 'Canada' },
  { value: 'unknown', label: 'Not sure' },
] as const

const EMPLOYER_OPTIONS = [
  { value: 'university', label: 'University' },
  { value: 'nonprofit_research', label: 'Nonprofit research' },
  { value: 'cooperative_institute', label: 'NOAA cooperative institute' },
  { value: 'government_contractor', label: 'Government contractor' },
  { value: 'government_direct', label: 'Government agency (direct)' },
  { value: 'private_sector', label: 'Private sector' },
  { value: 'unknown', label: 'Not sure' },
] as const

interface AddJobFormProps {
  onClose: () => void
  onAdded?: () => void
}

export function AddJobForm({ onClose, onAdded }: AddJobFormProps) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    const form = new FormData(e.currentTarget)
    const input: ManualJobInput = {
      title: form.get('title') as string,
      company: form.get('company') as string,
      url: form.get('url') as string || undefined,
      location: form.get('location') as string || undefined,
      visa_path: (form.get('visa_path') as ManualJobInput['visa_path']) || undefined,
      employer_type: (form.get('employer_type') as ManualJobInput['employer_type']) || undefined,
      application_deadline: form.get('deadline') as string || undefined,
      notes: form.get('notes') as string || undefined,
    }

    try {
      const result = await addManualJob(input)

      if (!result.success) {
        setError(result.error ?? 'Something went wrong')
        return
      }

      onAdded?.()
      onClose()
    } catch {
      setError('Could not save right now. Try again in a moment.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="rounded-2xl border border-border/50 bg-card p-6 animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-base font-semibold text-foreground">Add a job</h3>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="rounded-lg p-1 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Required fields */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-foreground mb-1">
              Job title <span className="text-amber-warm">*</span>
            </label>
            <input
              id="title"
              name="title"
              type="text"
              required
              placeholder="Research Scientist"
              className="w-full rounded-xl border border-border/50 bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ocean/30"
            />
          </div>
          <div>
            <label htmlFor="company" className="block text-sm font-medium text-foreground mb-1">
              Company / Org <span className="text-amber-warm">*</span>
            </label>
            <input
              id="company"
              name="company"
              type="text"
              required
              placeholder="Woods Hole Oceanographic"
              className="w-full rounded-xl border border-border/50 bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ocean/30"
            />
          </div>
        </div>

        {/* URL + Location */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="url" className="block text-sm font-medium text-foreground mb-1">
              <span className="inline-flex items-center gap-1">
                <Link className="size-3" aria-hidden /> Job URL
              </span>
            </label>
            <input
              id="url"
              name="url"
              type="url"
              placeholder="https://..."
              className="w-full rounded-xl border border-border/50 bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ocean/30"
            />
          </div>
          <div>
            <label htmlFor="location" className="block text-sm font-medium text-foreground mb-1">
              Location
            </label>
            <input
              id="location"
              name="location"
              type="text"
              placeholder="Boston, MA"
              className="w-full rounded-xl border border-border/50 bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ocean/30"
            />
          </div>
        </div>

        {/* Immigration context */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="visa_path" className="block text-sm font-medium text-foreground mb-1">
              Visa path
            </label>
            <select
              id="visa_path"
              name="visa_path"
              defaultValue="unknown"
              className="w-full rounded-xl border border-border/50 bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ocean/30"
            >
              {VISA_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="employer_type" className="block text-sm font-medium text-foreground mb-1">
              Employer type
            </label>
            <select
              id="employer_type"
              name="employer_type"
              defaultValue="unknown"
              className="w-full rounded-xl border border-border/50 bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ocean/30"
            >
              {EMPLOYER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Deadline + Notes */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="deadline" className="block text-sm font-medium text-foreground mb-1">
              Application deadline
            </label>
            <input
              id="deadline"
              name="deadline"
              type="date"
              className="w-full rounded-xl border border-border/50 bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ocean/30"
            />
          </div>
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-foreground mb-1">
              Notes
            </label>
            <input
              id="notes"
              name="notes"
              type="text"
              placeholder="Why this role caught your eye"
              className="w-full rounded-xl border border-border/50 bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ocean/30"
            />
          </div>
        </div>

        {error && (
          <p className="text-sm text-amber-warm">{error}</p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={submitting}
            className="gap-1.5 bg-ocean-deep text-white hover:bg-ocean-deep/90"
          >
            {submitting ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Plus className="size-3.5" />
            )}
            Add job
          </Button>
        </div>
      </form>
    </div>
  )
}
