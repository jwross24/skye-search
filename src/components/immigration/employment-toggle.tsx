'use client'

import { useState } from 'react'
import { Briefcase } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'

export interface EmploymentData {
  employer_name: string
  start_date: string
  hours_per_week: number
  stem_related: boolean
  e_verify: boolean
  paid: boolean
  eligibility_override: boolean
}

interface EmploymentToggleProps {
  isEmployed: boolean
  today: string
  onToggle: (employed: boolean, data?: EmploymentData) => void
}

interface EligibilityIssue {
  field: string
  message: string
}

function checkEligibility(data: Partial<EmploymentData>): EligibilityIssue[] {
  const issues: EligibilityIssue[] = []
  if (data.hours_per_week != null && data.hours_per_week < 20)
    issues.push({ field: 'hours', message: 'Must be 20+ hours per week' })
  if (data.stem_related === false)
    issues.push({ field: 'stem', message: 'Must be directly related to your field of study' })
  if (data.e_verify === false)
    issues.push({ field: 'everify', message: 'Employer must participate in E-Verify' })
  if (data.paid === false)
    issues.push({ field: 'paid', message: 'Must be a paid position' })
  return issues
}

export function EmploymentToggle({ isEmployed, today, onToggle }: EmploymentToggleProps) {
  const [showForm, setShowForm] = useState(false)
  const [showWarning, setShowWarning] = useState(false)
  const [eligibilityIssues, setEligibilityIssues] = useState<EligibilityIssue[]>([])

  // Form state
  const [employerName, setEmployerName] = useState('')
  const [startDate, setStartDate] = useState('')
  const [hours, setHours] = useState('')
  const [stemRelated, setStemRelated] = useState(true)
  const [eVerify, setEVerify] = useState(true)
  const [paid, setPaid] = useState(true)
  const [formError, setFormError] = useState<string | null>(null)

  const resetForm = () => {
    setEmployerName('')
    setStartDate('')
    setHours('')
    setStemRelated(true)
    setEVerify(true)
    setPaid(true)
    setFormError(null)
    setEligibilityIssues([])
  }

  const handleToggleChange = (checked: boolean) => {
    if (checked) {
      resetForm()
      setShowForm(true)
    } else {
      onToggle(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (!employerName.trim()) {
      setFormError('Employer name is required')
      return
    }
    if (!startDate) {
      setFormError('Start date is required')
      return
    }

    const parsedHours = parseInt(hours, 10)
    if (isNaN(parsedHours) || parsedHours < 1) {
      setFormError('Enter your weekly hours')
      return
    }

    const data: EmploymentData = {
      employer_name: employerName.trim(),
      start_date: startDate,
      hours_per_week: parsedHours,
      stem_related: stemRelated,
      e_verify: eVerify,
      paid,
      eligibility_override: false,
    }

    const issues = checkEligibility(data)
    if (issues.length > 0) {
      setEligibilityIssues(issues)
      setShowWarning(true)
      return
    }

    setShowForm(false)
    onToggle(true, data)
  }

  const handleOverride = () => {
    const data: EmploymentData = {
      employer_name: employerName.trim(),
      start_date: startDate,
      hours_per_week: parseInt(hours, 10),
      stem_related: stemRelated,
      e_verify: eVerify,
      paid,
      eligibility_override: true,
    }
    setShowWarning(false)
    setShowForm(false)
    onToggle(true, data)
  }

  const isFutureStart = startDate > today

  return (
    <div data-testid="employment-toggle">
      {/* Toggle row */}
      <div className="flex items-center justify-between py-4">
        <div className="flex items-center gap-3">
          <Briefcase className="size-4 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium text-foreground">
              {isEmployed ? 'Employed' : 'Not employed'}
            </p>
            <p className="text-xs text-muted-foreground">
              {isEmployed
                ? 'Clock paused'
                : 'Toggle when you start a qualifying position'}
            </p>
          </div>
        </div>
        <Switch
          checked={isEmployed}
          onCheckedChange={handleToggleChange}
          aria-label="Employment status"
        />
      </div>

      {/* Employment details form dialog */}
      <Dialog open={showForm} onOpenChange={(open) => {
        setShowForm(open)
        if (!open) resetForm()
      }}>
        <DialogContent className="sm:max-w-md" showCloseButton={false}>
          <DialogTitle className="text-base font-semibold">
            Employment details
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            We need a few details to verify this qualifies under STEM OPT rules.
          </DialogDescription>

          <form onSubmit={handleSubmit} noValidate className="space-y-4 mt-2">
            <div>
              <label htmlFor="employer-name" className="block text-sm font-medium text-foreground mb-1">
                Employer name
              </label>
              <input
                id="employer-name"
                type="text"
                value={employerName}
                onChange={(e) => setEmployerName(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-ocean focus:outline-none focus:ring-2 focus:ring-ocean/20"
                placeholder="e.g. Boston University"
              />
            </div>

            <div>
              <label htmlFor="start-date" className="block text-sm font-medium text-foreground mb-1">
                Start date
              </label>
              <input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-ocean focus:outline-none focus:ring-2 focus:ring-ocean/20"
              />
              {isFutureStart && startDate && (
                <p className="mt-1 text-xs text-amber-warm">
                  Clock will halt automatically on {new Date(startDate + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="hours-week" className="block text-sm font-medium text-foreground mb-1">
                Hours per week
              </label>
              <input
                id="hours-week"
                type="number"
                min={1}
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                className="w-24 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-ocean focus:outline-none focus:ring-2 focus:ring-ocean/20"
                placeholder="20"
              />
            </div>

            {/* Eligibility checkboxes */}
            <div className="space-y-2.5 pt-1">
              <label className="flex items-center gap-2.5 cursor-pointer text-sm">
                <input
                  type="checkbox"
                  checked={stemRelated}
                  onChange={(e) => setStemRelated(e.target.checked)}
                  className="size-4 rounded border-border text-ocean focus:ring-ocean/20"
                />
                Directly related to my STEM field
              </label>
              <label className="flex items-center gap-2.5 cursor-pointer text-sm">
                <input
                  type="checkbox"
                  checked={eVerify}
                  onChange={(e) => setEVerify(e.target.checked)}
                  className="size-4 rounded border-border text-ocean focus:ring-ocean/20"
                />
                E-Verify employer
              </label>
              <label className="flex items-center gap-2.5 cursor-pointer text-sm">
                <input
                  type="checkbox"
                  checked={paid}
                  onChange={(e) => setPaid(e.target.checked)}
                  className="size-4 rounded border-border text-ocean focus:ring-ocean/20"
                />
                Paid position
              </label>
            </div>

            {formError && (
              <p role="alert" className="text-sm text-amber-warm">{formError}</p>
            )}

            <div className="flex gap-2 pt-2">
              <Button type="submit" className="bg-ocean text-white hover:bg-ocean-deep">
                Confirm employment
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setShowForm(false)
                  resetForm()
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Eligibility warning dialog */}
      <Dialog open={showWarning} onOpenChange={setShowWarning}>
        <DialogContent className="sm:max-w-md" showCloseButton={false}>
          <DialogTitle className="text-base font-semibold text-amber-warm">
            Eligibility concern
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground leading-relaxed">
            Under STEM OPT rules, your unemployment clock only stops for
            positions that are paid, 20+ hours/week, directly related to your
            field of study, and at an E-Verify employer.
          </DialogDescription>

          <div className="space-y-1.5 mt-2">
            {eligibilityIssues.map((issue) => (
              <p key={issue.field} className="text-sm text-amber-warm">
                {issue.message}
              </p>
            ))}
          </div>

          <div className="flex gap-2 mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={handleOverride}
              className="text-amber-warm border-amber-warm/30 hover:bg-amber-warm/5"
            >
              Halt clock anyway (verify with DSO)
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowWarning(false)}
            >
              Keep clock running
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export { checkEligibility }
