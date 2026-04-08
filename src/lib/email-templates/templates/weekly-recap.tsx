import { Section, Text, Hr } from '@react-email/components'
import { BaseLayout, BRAND } from '../base-layout'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface WeeklyRecapEmailProps {
  weekLabel: string         // "Mar 31 – Apr 6"
  summaryText: string
  jobsReviewed: number
  applicationsSubmitted: number
  interviewsPending: number
  daysRemaining: number
  phase: string
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const PHASE_LABELS: Record<string, string> = {
  launch: 'Getting started',
  active: 'Building momentum',
  response: 'Getting responses',
  pressure: 'Focused push',
}

function StatCell({
  label,
  value,
  color,
}: {
  label: string
  value: string | number
  color: string
}) {
  return (
    <td style={{ padding: '12px 8px', textAlign: 'center' as const, verticalAlign: 'top' as const }}>
      <Text style={{ fontSize: '24px', fontWeight: 700, color, margin: '0 0 2px', lineHeight: '1' }}>
        {value}
      </Text>
      <Text style={{ fontSize: '11px', color: BRAND.textMuted, margin: 0, lineHeight: '1.3' }}>
        {label}
      </Text>
    </td>
  )
}

// ─── Template ───────────────────────────────────────────────────────────────

export function WeeklyRecapEmail({
  weekLabel,
  summaryText,
  jobsReviewed,
  applicationsSubmitted,
  interviewsPending,
  daysRemaining,
  phase,
}: WeeklyRecapEmailProps) {
  const phaseLabel = PHASE_LABELS[phase] ?? phase

  return (
    <BaseLayout preview={`Your week in review — ${weekLabel}`}>
      {/* Title */}
      <Text
        style={{
          fontSize: '20px',
          fontWeight: 600,
          color: BRAND.ocean,
          margin: '0 0 4px',
        }}
      >
        Your week in review
      </Text>
      <Text style={{ fontSize: '14px', color: BRAND.textMuted, margin: '0 0 16px' }}>
        {weekLabel}
      </Text>

      <Hr style={{ borderColor: BRAND.border, margin: '0 0 20px' }} />

      {/* Summary */}
      <Text
        style={{
          fontSize: '15px',
          lineHeight: '24px',
          color: BRAND.text,
          margin: '0 0 24px',
        }}
      >
        {summaryText}
      </Text>

      {/* Stats grid */}
      <Section>
        <table
          width="100%"
          cellPadding={0}
          cellSpacing={0}
          style={{ borderCollapse: 'collapse' as const }}
        >
          <tbody>
            <tr>
              <StatCell label="Jobs reviewed" value={jobsReviewed} color={BRAND.jade} />
              <StatCell
                label="Applications"
                value={applicationsSubmitted}
                color={BRAND.jade}
              />
              <StatCell label="Interviews" value={interviewsPending} color={BRAND.jade} />
              <StatCell
                label="Days remaining"
                value={daysRemaining}
                color={BRAND.amberWarm}
              />
            </tr>
          </tbody>
        </table>
      </Section>

      <Hr style={{ borderColor: BRAND.border, margin: '24px 0' }} />

      {/* Phase indicator + warm sign-off */}
      <Text
        style={{
          fontSize: '12px',
          color: BRAND.textMuted,
          margin: '0 0 4px',
        }}
      >
        Phase: {phaseLabel}
      </Text>
      <Text
        style={{
          fontSize: '14px',
          lineHeight: '22px',
          color: BRAND.text,
          margin: 0,
        }}
      >
        See you next week. You&apos;re doing the work.
      </Text>
    </BaseLayout>
  )
}
