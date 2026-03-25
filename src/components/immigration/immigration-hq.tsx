'use client'

import { useState } from 'react'
import { ClockDisplay } from './clock-display'
import { CalibrationFlow } from './calibration-flow'
import { DisclaimerBanner } from './disclaimer-banner'
import type { SeedImmigrationStatus } from '@/db/seed'

interface ImmigrationHQProps {
  immigrationStatus: SeedImmigrationStatus
  today: string
}

export function ImmigrationHQ({ immigrationStatus, today }: ImmigrationHQProps) {
  const [disclaimerAcked, setDisclaimerAcked] = useState(false)
  const [calibrated, setCalibrated] = useState(
    immigrationStatus.initial_days_used > 0,
  )
  const [daysUsed, setDaysUsed] = useState(immigrationStatus.initial_days_used)
  const [dataSource, setDataSource] = useState(immigrationStatus.initial_days_source)

  const handleCalibration = (days: number, dsoConfirmed: boolean) => {
    setDaysUsed(days)
    setDataSource(dsoConfirmed ? 'dso_confirmed' : 'user_reported')
    setCalibrated(true)
  }

  const daysRemaining = 150 - daysUsed

  return (
    <div>
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
        <ClockDisplay
          daysRemaining={daysRemaining}
          optExpiry={immigrationStatus.opt_expiry}
          today={today}
          isEmployed={immigrationStatus.employment_active}
          dataSource={dataSource}
        />
      )}

      {/* Persistent footer */}
      <footer className="mt-12 pt-4 border-t border-border/50">
        <p className="text-xs text-muted-foreground/60">
          Dates shown are tracking estimates. Confirm with your DSO or immigration attorney.
        </p>
      </footer>
    </div>
  )
}
