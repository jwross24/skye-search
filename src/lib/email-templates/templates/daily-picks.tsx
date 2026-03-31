import { Section, Text, Button } from '@react-email/components'
import { BaseLayout, BRAND, BASE_URL } from '../base-layout'
import { ClockStatus } from '../components/clock-status'
import { JobCard } from '../components/job-card'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface DailyPickJob {
  title: string
  company: string
  visaPath: string
  location?: string
  score?: number
  url?: string
  whyFits?: string
}

export interface DailyPicksEmailProps {
  daysUsed: number
  daysRemaining: number
  dayOfWeek: string
  picks: DailyPickJob[]
  capExemptCount: number
  bridgeCount: number
  scoringStatus: 'complete' | 'stale' | 'failed'
}

// ─── Template ───────────────────────────────────────────────────────────────

export function DailyPicksEmail({
  daysUsed,
  daysRemaining,
  dayOfWeek,
  picks,
  capExemptCount,
  bridgeCount,
  scoringStatus,
}: DailyPicksEmailProps) {
  const count = picks.length
  const subject = `Your ${count} pick${count === 1 ? '' : 's'} for ${dayOfWeek} — Day ${daysUsed} of 150 (${daysRemaining} remaining)`

  const urgencySummary = [
    capExemptCount > 0 && `${capExemptCount} cap-exempt`,
    bridgeCount > 0 && `${bridgeCount} bridge role${bridgeCount > 1 ? 's' : ''}`,
  ]
    .filter(Boolean)
    .join(', ')

  const greeting = capExemptCount > 0
    ? `${capExemptCount} cap-exempt ${capExemptCount === 1 ? 'role' : 'roles'} today — your strongest visa path.`
    : urgencySummary
      ? `Today's strongest matches: ${urgencySummary}.`
      : null

  return (
    <BaseLayout preview={subject}>
      {/* Clock status */}
      <ClockStatus
        daysRemaining={daysRemaining}
        totalDays={150}
        label="Unemployment days remaining"
      />

      {/* Staleness notice if scoring wasn't fresh */}
      {scoringStatus !== 'complete' && (
        <Section
          style={{
            backgroundColor: '#fffbeb',
            borderRadius: '8px',
            padding: '12px 16px',
            marginBottom: '16px',
            border: '1px solid #fde68a',
          }}
        >
          <Text style={{ fontSize: '13px', color: '#92400e', margin: 0, lineHeight: '1.4' }}>
            {scoringStatus === 'stale'
              ? "Showing yesterday's strongest matches while today's are being scored. Fresh picks will be in the app after 9am."
              : "Yesterday's strongest matches for now — scoring had a hiccup. Your clock number is still accurate."}
          </Text>
        </Section>
      )}

      {/* Contextual greeting */}
      {greeting && (
        <Text style={{ fontSize: '14px', color: BRAND.text, margin: '0 0 16px', lineHeight: '1.5' }}>
          {greeting}
        </Text>
      )}

      {/* Job cards */}
      {picks.map((pick, i) => (
        <Section key={i} style={{ marginBottom: '4px' }}>
          <JobCard
            title={pick.title}
            company={pick.company}
            visaPath={pick.visaPath}
            location={pick.location}
            score={pick.score}
            url={pick.url}
          />
          {pick.whyFits && (
            <Text
              style={{
                fontSize: '12px',
                color: BRAND.textMuted,
                margin: '-4px 0 12px 20px',
                lineHeight: '1.4',
                fontStyle: 'italic',
              }}
            >
              {pick.whyFits}
            </Text>
          )}
        </Section>
      ))}

      {/* CTA */}
      <Section style={{ textAlign: 'center', marginTop: '24px' }}>
        <Button
          href={`${BASE_URL}/jobs`}
          style={{
            backgroundColor: BRAND.ocean,
            color: '#ffffff',
            padding: '12px 32px',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 600,
            textDecoration: 'none',
            display: 'inline-block',
          }}
        >
          See today&apos;s picks
        </Button>
      </Section>
    </BaseLayout>
  )
}
