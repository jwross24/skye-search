'use client'

import { useState } from 'react'
import { ClockDisplay } from './clock-display'
import { CalibrationFlow } from './calibration-flow'
import { DisclaimerBanner } from './disclaimer-banner'
import { EmploymentToggle, type EmploymentData } from './employment-toggle'
import { StrategyMap } from './strategy-map'
import type { SeedImmigrationStatus, SeedPlan } from '@/db/seed'

interface ImmigrationHQProps {
  immigrationStatus: SeedImmigrationStatus
  today: string
  plans: SeedPlan[]
  lastCronRun?: string | null
  gapAlert?: string | null
}

export function ImmigrationHQ({
  immigrationStatus,
  today,
  plans,
  lastCronRun = null,
  gapAlert = null,
}: ImmigrationHQProps) {
  const [disclaimerAcked, setDisclaimerAcked] = useState(false)
  const [calibrated, setCalibrated] = useState(
    immigrationStatus.initial_days_used > 0,
  )
  const [daysUsed, setDaysUsed] = useState(immigrationStatus.initial_days_used)
  const [dataSource, setDataSource] = useState(immigrationStatus.initial_days_source)
  const [employed, setEmployed] = useState(immigrationStatus.employment_active)
  const [employmentOverride, setEmploymentOverride] = useState(false)
  const [haltedSince, setHaltedSince] = useState<string | null>(
    immigrationStatus.employment_active ? (immigrationStatus.postdoc_end_date ?? today) : null,
  )
  const [haltSource, setHaltSource] = useState<string | null>(
    immigrationStatus.employment_active ? 'PostDoc' : null,
  )

  const handleCalibration = (days: number, dsoConfirmed: boolean) => {
    setDaysUsed(days)
    setDataSource(dsoConfirmed ? 'dso_confirmed' : 'user_reported')
    setCalibrated(true)
  }

  const handleEmploymentToggle = (isEmployed: boolean, data?: EmploymentData) => {
    setEmployed(isEmployed)
    if (isEmployed && data) {
      setEmploymentOverride(data.eligibility_override)
      setHaltedSince(data.start_date)
      setHaltSource('Manual')
    } else if (!isEmployed) {
      setHaltedSince(null)
      setHaltSource(null)
    }
  }

  const daysRemaining = 150 - daysUsed
  const optExpiryPassed = today > immigrationStatus.opt_expiry
  const isGracePeriod = optExpiryPassed && !employed

  // Resolve status label for display
  const getStatusLabel = (): string | undefined => {
    if (!calibrated) return undefined
    if (today <= (immigrationStatus.postdoc_end_date ?? '')) return 'Employed (PostDoc)'
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
          <DisclaimerBanner onAcknowledge={() => setDisclaimerAcked(true)} />
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
              optExpiry={immigrationStatus.opt_expiry}
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
            optExpiryDate={immigrationStatus.opt_expiry}
            today={today}
          />
        </div>
      )}
    </div>
  )
}
