import { Section, Text } from '@react-email/components'
import { BRAND } from '../base-layout'

interface ClockStatusProps {
  daysRemaining: number
  totalDays: number
  label?: string
}

export function ClockStatus({ daysRemaining, totalDays, label = 'Unemployment days remaining' }: ClockStatusProps) {
  const urgency = daysRemaining <= 30 ? 'critical' : daysRemaining <= 60 ? 'warning' : 'normal'
  const accentColor = urgency === 'critical' ? BRAND.amberWarm : urgency === 'warning' ? BRAND.amberWarm : BRAND.ocean

  return (
    <Section
      style={{
        backgroundColor: BRAND.card,
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '16px',
        border: `1px solid ${BRAND.border}`,
      }}
    >
      <Text style={{ fontSize: '12px', color: BRAND.textMuted, margin: '0 0 4px', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>
        {label}
      </Text>
      <Text style={{ fontSize: '32px', fontWeight: 700, color: accentColor, margin: '0 0 4px', lineHeight: '1.1' }}>
        {daysRemaining}
        <span style={{ fontSize: '16px', fontWeight: 400, color: BRAND.textMuted }}> / {totalDays}</span>
      </Text>
      {urgency !== 'normal' && (
        <Text style={{ fontSize: '13px', color: BRAND.amberWarm, margin: 0 }}>
          {urgency === 'critical' ? 'Time is running short — prioritize cap-exempt roles' : 'Worth keeping an eye on this'}
        </Text>
      )}
    </Section>
  )
}
