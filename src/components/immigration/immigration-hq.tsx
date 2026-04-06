'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ClockDisplay } from './clock-display'
import { CalibrationFlow } from './calibration-flow'
import { DisclaimerBanner } from './disclaimer-banner'
import { EmploymentToggle, type EmploymentData } from './employment-toggle'
import { PostdocExtension } from './postdoc-extension'
import { StrategyMap } from './strategy-map'
import { toast } from 'sonner'
import { saveCalibration, acknowledgeDisclaimer, toggleEmployment } from '@/app/immigration/actions'
import type { SeedImmigrationStatus, SeedPlan } from '@/db/seed'

interface ImmigrationHQProps {
  immigrationStatus: SeedImmigrationStatus | null
  today: string
  plans: SeedPlan[]
  lastCronRun?: string | null
  gapAlert?: string | null
  disclaimerAcked?: boolean
}

export function ImmigrationHQ({
  immigrationStatus,
  today,
  plans,
  lastCronRun = null,
  gapAlert = null,
  disclaimerAcked: initialDisclaimerAcked = false,
}: ImmigrationHQProps) {
  const [disclaimerAcked, setDisclaimerAcked] = useState(initialDisclaimerAcked)
  const [calibrated, setCalibrated] = useState(
    (immigrationStatus?.initial_days_used ?? 0) > 0,
  )
  const [daysUsed, setDaysUsed] = useState(immigrationStatus?.initial_days_used ?? 0)
  const [dataSource, setDataSource] = useState(immigrationStatus?.initial_days_source ?? 'user_reported')
  const [employed, setEmployed] = useState(immigrationStatus?.employment_active ?? false)
  const [employmentOverride, setEmploymentOverride] = useState(false)
  const [haltedSince, setHaltedSince] = useState<string | null>(
    immigrationStatus?.employment_active ? (immigrationStatus?.calibration_date ?? today) : null,
  )
  const [haltSource, setHaltSource] = useState<string | null>(
    immigrationStatus?.employment_active ? 'PostDoc' : null,
  )
  const [postdocEndDate, setPostdocEndDate] = useState(
    immigrationStatus?.postdoc_end_date ?? '',
  )

  // Update PWA app badge with unemployment day count
  useEffect(() => {
    if (daysUsed > 0 && 'setAppBadge' in navigator) {
      navigator.setAppBadge(daysUsed).catch(() => {})
    }
  }, [daysUsed])

  const handleDisclaimerAck = async () => {
    setDisclaimerAcked(true)
    const result = await acknowledgeDisclaimer()
    if (result && !result.success) {
      setDisclaimerAcked(false)
      toast.error("Couldn't save your acknowledgment. Try again in a moment.")
    }
  }

  const handleCalibration = async (days: number, dsoConfirmed: boolean) => {
    const prevDays = daysUsed
    const prevSource = dataSource
    const prevCalibrated = calibrated
    setDaysUsed(days)
    setDataSource(dsoConfirmed ? 'dso_confirmed' : 'user_reported')
    setCalibrated(true)
    const result = await saveCalibration({
      initial_days_used: days,
      dso_confirmed: dsoConfirmed,
      calibration_date: today,
    })
    if (result && !result.success) {
      setDaysUsed(prevDays)
      setDataSource(prevSource)
      setCalibrated(prevCalibrated)
      toast.error("Couldn't save your calibration. Try again in a moment.")
    }
  }

  const handleEmploymentToggle = async (isEmployed: boolean, data?: EmploymentData) => {
    const prevEmployed = employed
    const prevOverride = employmentOverride
    const prevHaltedSince = haltedSince
    const prevHaltSource = haltSource
    setEmployed(isEmployed)
    if (isEmployed && data) {
      setEmploymentOverride(data.eligibility_override)
      setHaltedSince(data.start_date)
      setHaltSource('Manual')
    } else if (!isEmployed) {
      setHaltedSince(null)
      setHaltSource(null)
    }
    const result = await toggleEmployment(isEmployed, data?.start_date)
    if (result && !result.success) {
      setEmployed(prevEmployed)
      setEmploymentOverride(prevOverride)
      setHaltedSince(prevHaltedSince)
      setHaltSource(prevHaltSource)
      toast.error("Couldn't update your employment status. Try again in a moment.")
    }
  }

  const daysRemaining = 150 - daysUsed
  const optExpiry = immigrationStatus?.opt_expiry ?? ''
  const optExpiryPassed = optExpiry ? today > optExpiry : false
  const isGracePeriod = optExpiryPassed && !employed

  // Resolve status label for display
  const getStatusLabel = (): string | undefined => {
    if (!calibrated) return undefined
    if (today <= postdocEndDate) return 'Employed (PostDoc)'
    if (employed) return 'Employed (Bridge)'
    if (isGracePeriod) return 'Grace Period'
    if (daysRemaining <= 0) return 'Clock Exhausted'
    return 'Unemployed'
  }

  return (
    <div className="flex flex-col lg:flex-row lg:gap-12">
      {/* Main column */}
      <div className="flex-1 min-w-0 max-w-2xl">
        {/* Disclaimer — shown once */}
        {!disclaimerAcked && (
          <DisclaimerBanner onAcknowledge={handleDisclaimerAck} />
        )}

        {/* Calibration — shown if no initial data */}
        {disclaimerAcked && !calibrated && (
          <CalibrationFlow
            onComplete={handleCalibration}
            initialDaysUsed={daysUsed > 0 ? daysUsed : undefined}
          />
        )}

        {/* Clock display — visible whenever calibrated */}
        {calibrated && (
          <>
            <ClockDisplay
              daysRemaining={daysRemaining}
              optExpiry={optExpiry}
              today={today}
              isEmployed={employed}
              dataSource={dataSource}
              isGracePeriod={isGracePeriod}
              statusLabel={getStatusLabel()}
              haltedSince={haltedSince}
              haltSource={haltSource}
              lastCronRun={lastCronRun}
              gapAlert={gapAlert}
            />

            {/* What-if link */}
            <div className="mt-6">
              <Link
                href="/immigration/what-if"
                className="text-sm text-ocean hover:text-ocean-deep transition-colors"
              >
                What if... →
              </Link>
              <p className="text-xs text-muted-foreground/60 mt-0.5">
                See how different scenarios play out
              </p>
            </div>

            {/* Email drafts link */}
            <div className="mt-4">
              <Link
                href="/immigration/emails"
                className="text-sm text-ocean hover:text-ocean-deep transition-colors"
              >
                Email drafts →
              </Link>
              <p className="text-xs text-muted-foreground/60 mt-0.5">
                Pre-filled templates for your DSO and HR contacts
              </p>
            </div>

            {/* Employment toggle */}
            <div className="mt-8 border-t border-border/50 pt-6">
              <EmploymentToggle
                isEmployed={employed}
                today={today}
                onToggle={handleEmploymentToggle}
              />
              {employmentOverride && (
                <p className="mt-2 text-xs text-amber-warm">
                  Eligibility unconfirmed — verify with your DSO
                </p>
              )}
            </div>

            {/* PostDoc extension */}
            {postdocEndDate && (
              <div className="mt-8 border-t border-border/50 pt-6">
                <PostdocExtension
                  currentEndDate={postdocEndDate}
                  today={today}
                  onExtended={setPostdocEndDate}
                />
              </div>
            )}
          </>
        )}

        {/* Persistent footer */}
        <footer className="mt-12 pt-4 border-t border-border/50">
          <p className="text-xs text-muted-foreground/60">
            Dates shown are tracking estimates. Confirm with your DSO or immigration attorney.
          </p>
        </footer>
      </div>

      {/* Side column: Strategy Map (desktop) / Below clocks (mobile) */}
      {calibrated && (
        <div className="mt-10 lg:mt-0 lg:w-80 lg:flex-shrink-0">
          <StrategyMap
            plans={plans}
            daysRemaining={daysRemaining}
            optExpiryDate={optExpiry}
            today={today}
          />
        </div>
      )}
    </div>
  )
}
