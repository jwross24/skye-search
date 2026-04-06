'use client'

import { useState, useTransition, useRef } from 'react'
import { Plus, Link, X, Loader2, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { addManualJob, type ManualJobInput } from '@/app/jobs/actions'
import { analyzeJobUrl } from '@/app/jobs/url-analysis-actions'
import type { UrlAnalysisResult } from '@/app/jobs/url-analysis-actions'

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

type VisaPath = (typeof VISA_OPTIONS)[number]['value']
type EmployerType = (typeof EMPLOYER_OPTIONS)[number]['value']

type AnalysisState = 'idle' | 'loading' | 'done' | 'error'

interface AddJobFormProps {
  onClose: () => void
  onAdded?: () => void
}

export function AddJobForm({ onClose, onAdded }: AddJobFormProps) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // URL analysis state
  const [urlValue, setUrlValue] = useState('')
  const [analysisState, setAnalysisState] = useState<AnalysisState>('idle')
  const [analysisError, setAnalysisError] = useState<string | null>(null)
  const [descriptionSummary, setDescriptionSummary] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Controlled fields populated by analysis or manual entry
  const [titleValue, setTitleValue] = useState('')
  const [companyValue, setCompanyValue] = useState('')
  const [locationValue, setLocationValue] = useState('')
  const [visaPath, setVisaPath] = useState<VisaPath>('unknown')
  const [employerType, setEmployerType] = useState<EmployerType>('unknown')
  const [deadlineValue, setDeadlineValue] = useState('')

  // Brief highlight on auto-populated fields so Skye sees what changed
  const [highlightedFields, setHighlightedFields] = useState<Set<string>>(new Set())

  const titleRef = useRef<HTMLInputElement>(null)

  const flashHighlight = (fields: string[]) => {
    setHighlightedFields(new Set(fields))
    setTimeout(() => setHighlightedFields(new Set()), 1500)
  }

  const handleAnalyze = () => {
    if (!urlValue.trim()) return
    setAnalysisError(null)
    setAnalysisState('loading')

    startTransition(async () => {
      const result: UrlAnalysisResult = await analyzeJobUrl(urlValue.trim())

      if (!result.success || !result.fields) {
        setAnalysisState('error')
        setAnalysisError(result.error ?? 'Could not analyze this page. Add details manually.')
        return
      }

      const populated: string[] = []

      if (result.fields.title) {
        setTitleValue(result.fields.title)
        populated.push('title')
      }
      if (result.fields.company) {
        setCompanyValue(result.fields.company)
        populated.push('company')
      }
      if (result.fields.location) {
        setLocationValue(result.fields.location)
        populated.push('location')
      }
      if (result.fields.visa_path && result.fields.visa_path !== 'unknown') {
        setVisaPath(result.fields.visa_path)
        populated.push('visa_path')
      }
      if (result.fields.employer_type && result.fields.employer_type !== 'unknown') {
        setEmployerType(result.fields.employer_type)
        populated.push('employer_type')
      }
      if (result.fields.application_deadline) {
        setDeadlineValue(result.fields.application_deadline)
        populated.push('deadline')
      }
      if (result.fields.description_summary) {
        setDescriptionSummary(result.fields.description_summary)
      }

      setAnalysisState('done')
      flashHighlight(populated)

      // Focus title so Skye reviews from the top
      setTimeout(() => titleRef.current?.focus(), 50)
    })
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    const form = new FormData(e.currentTarget)
    const input: ManualJobInput = {
      title: titleValue || (form.get('title') as string),
      company: companyValue || (form.get('company') as string),
      url: urlValue || (form.get('url') as string) || undefined,
      location: locationValue || (form.get('location') as string) || undefined,
      visa_path:
        visaPath !== 'unknown'
          ? visaPath
          : ((form.get('visa_path') as ManualJobInput['visa_path']) || undefined),
      employer_type:
        employerType !== 'unknown'
          ? employerType
          : ((form.get('employer_type') as ManualJobInput['employer_type']) || undefined),
      application_deadline: deadlineValue || (form.get('deadline') as string) || undefined,
      notes: (form.get('notes') as string) || undefined,
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

  // Dynamic class for fields that may be highlighted after analysis
  const fieldClass = (field: string) =>
    `w-full rounded-xl border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ocean/30 transition-colors duration-500 ${
      highlightedFields.has(field) ? 'border-ocean/40 bg-ocean/5' : 'border-border/50'
    }`

  // "Look it up" button appears when URL is entered but title is still empty
  const showAnalyzeButton = urlValue.trim().length > 0 && !titleValue.trim()

  return (
    <div className="rounded-2xl border border-border/50 bg-card p-6 animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-base font-semibold text-foreground">Add a job</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Found something outside your daily picks? Add it here.
          </p>
        </div>
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
        {/* URL field with "Look it up" analysis trigger */}
        <div>
          <label htmlFor="url" className="block text-sm font-medium text-foreground mb-1">
            <span className="inline-flex items-center gap-1">
              <Link className="size-3" aria-hidden /> Job URL
            </span>
          </label>
          <div className="flex gap-2">
            <input
              id="url"
              name="url"
              type="url"
              value={urlValue}
              onChange={(e) => {
                setUrlValue(e.target.value)
                // Reset analysis state when URL changes
                if (analysisState !== 'idle') {
                  setAnalysisState('idle')
                  setAnalysisError(null)
                }
              }}
              placeholder="https://..."
              className="flex-1 rounded-xl border border-border/50 bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ocean/30"
            />
            {showAnalyzeButton && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={handleAnalyze}
                disabled={isPending || analysisState === 'loading'}
                aria-label="Look up job details from this URL"
                className="shrink-0 gap-1.5 text-ocean hover:text-ocean hover:bg-ocean/10 border border-ocean/20"
              >
                {isPending || analysisState === 'loading' ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" aria-hidden />
                    <span>Reading...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="size-3.5" aria-hidden />
                    <span>Look it up</span>
                  </>
                )}
              </Button>
            )}
          </div>

          {/* Analysis status — screen reader live region */}
          <div aria-live="polite" aria-atomic="true">
            {(isPending || analysisState === 'loading') && (
              <p className="mt-1.5 text-xs text-muted-foreground">Reading the posting...</p>
            )}
            {analysisError && (
              <p className="mt-1.5 text-xs text-amber-warm" role="alert">
                {analysisError}
              </p>
            )}
            {analysisState === 'done' && !analysisError && (
              <p className="mt-1.5 text-xs text-jade/70">
                Fields filled in below — review and edit anything before saving.
              </p>
            )}
          </div>
        </div>

        {/* Required fields */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-foreground mb-1">
              Job title <span className="text-muted-foreground">*</span>
            </label>
            <input
              ref={titleRef}
              id="title"
              name="title"
              type="text"
              required
              value={titleValue}
              onChange={(e) => setTitleValue(e.target.value)}
              placeholder="Research Scientist"
              className={fieldClass('title')}
            />
          </div>
          <div>
            <label htmlFor="company" className="block text-sm font-medium text-foreground mb-1">
              Company / Org <span className="text-muted-foreground">*</span>
            </label>
            <input
              id="company"
              name="company"
              type="text"
              required
              value={companyValue}
              onChange={(e) => setCompanyValue(e.target.value)}
              placeholder="Woods Hole Oceanographic"
              className={fieldClass('company')}
            />
          </div>
        </div>

        {/* Location */}
        <div>
          <label htmlFor="location" className="block text-sm font-medium text-foreground mb-1">
            Location
          </label>
          <input
            id="location"
            name="location"
            type="text"
            value={locationValue}
            onChange={(e) => setLocationValue(e.target.value)}
            placeholder="Boston, MA"
            className={fieldClass('location')}
          />
        </div>

        {/* Immigration context */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="visa_path"
              className="block text-sm font-medium text-foreground mb-1"
            >
              Sponsorship path
            </label>
            <select
              id="visa_path"
              name="visa_path"
              value={visaPath}
              onChange={(e) => setVisaPath(e.target.value as VisaPath)}
              className={fieldClass('visa_path')}
            >
              {VISA_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              htmlFor="employer_type"
              className="block text-sm font-medium text-foreground mb-1"
            >
              Organization type
            </label>
            <select
              id="employer_type"
              name="employer_type"
              value={employerType}
              onChange={(e) => setEmployerType(e.target.value as EmployerType)}
              className={fieldClass('employer_type')}
            >
              {EMPLOYER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
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
              value={deadlineValue}
              onChange={(e) => setDeadlineValue(e.target.value)}
              className={fieldClass('deadline')}
            />
          </div>
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-foreground mb-1">
              Notes
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={2}
              placeholder="Why this role caught your eye"
              className="w-full rounded-xl border border-border/50 bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ocean/30 resize-none"
            />
          </div>
        </div>

        {/* Description summary from AI analysis — italic paragraph, no card */}
        {descriptionSummary && (
          <p className="text-xs italic text-muted-foreground leading-relaxed border-l-2 border-ocean/20 pl-3">
            {descriptionSummary}
          </p>
        )}

        {error && <p className="text-sm text-amber-warm">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
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
