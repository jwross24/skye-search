import { Section, Text, Link } from '@react-email/components'
import { BaseLayout, BRAND, BASE_URL } from '../base-layout'
import { ClockStatus } from '../components/clock-status'
import { AlertBanner } from '../components/alert-banner'

interface UnemploymentDigestProps {
  daysRemaining: number
  totalDays: number
  daysUsedThisWeek: number
  employedDaysThisWeek: number
  gapDays: number
  unsubscribeUrl?: string
}

export function UnemploymentDigest({
  daysRemaining,
  totalDays,
  daysUsedThisWeek,
  employedDaysThisWeek,
  gapDays,
  unsubscribeUrl,
}: UnemploymentDigestProps) {
  const urgency = daysRemaining <= 15 ? 'urgent' : daysRemaining <= 30 ? 'warning' : 'info'

  return (
    <BaseLayout
      preview={`${daysRemaining} unemployment days remaining`}
      unsubscribeUrl={unsubscribeUrl}
    >
      {urgency === 'urgent' && (
        <AlertBanner
          level="urgent"
          title={`${daysRemaining} days remaining`}
          message="This is getting tight. Focus on cap-exempt roles and bridge positions that stop the clock."
        />
      )}

      <ClockStatus daysRemaining={daysRemaining} totalDays={totalDays} />

      <Section
        style={{
          backgroundColor: BRAND.card,
          borderRadius: '12px',
          padding: '16px 20px',
          marginBottom: '16px',
          border: `1px solid ${BRAND.border}`,
        }}
      >
        <Text style={{ fontSize: '14px', fontWeight: 600, color: BRAND.text, margin: '0 0 8px' }}>
          This week
        </Text>
        <Text style={{ fontSize: '13px', color: BRAND.textMuted, margin: '0 0 4px', lineHeight: '1.5' }}>
          {daysUsedThisWeek > 0
            ? `${daysUsedThisWeek} unemployment ${daysUsedThisWeek === 1 ? 'day' : 'days'} counted`
            : 'No unemployment days counted'}
          {employedDaysThisWeek > 0 && ` · ${employedDaysThisWeek} employed`}
        </Text>
        {gapDays > 0 && (
          <Text style={{ fontSize: '13px', color: BRAND.amberWarm, margin: '4px 0 0', lineHeight: '1.5' }}>
            {gapDays} {gapDays === 1 ? 'day' : 'days'} with no checkpoint data — these count as unemployed to be safe
          </Text>
        )}
      </Section>

      <Section style={{ textAlign: 'center' as const, padding: '8px 0' }}>
        <Link
          href={`${BASE_URL}/immigration`}
          style={{
            display: 'inline-block',
            backgroundColor: BRAND.ocean,
            color: '#ffffff',
            fontSize: '14px',
            fontWeight: 600,
            padding: '10px 24px',
            borderRadius: '8px',
            textDecoration: 'none',
          }}
        >
          Open Immigration HQ
        </Link>
      </Section>
    </BaseLayout>
  )
}
