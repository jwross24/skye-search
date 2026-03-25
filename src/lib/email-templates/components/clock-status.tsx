import { Section, Text } from '@react-email/components'
import { BRAND } from '../base-layout'

interface ClockStatusProps {
  daysRemaining: number
  totalDays: number
  label?: string
}

export function ClockStatus({ daysRemaining, totalDays, label = 'Your immigration clock' }: ClockStatusProps) {
  const urgency = daysRemaining <= 30 ? 'critical' : daysRemaining <= 60 ? 'warning' : 'normal'
  const accentColor = urgency === 'critical' ? BRAND.amberWarm : urgency === 'warning' ? BRAND.amberWarm : BRAND.ocean

  return (
    <Section
      style={{
        backgroundColor: BRAND.card,
        borderRadius: '12px',
        padding: '20px 24px',
        marginBottom: '16px',
        border: `1px solid ${BRAND.border}`,
      }}
    >
      <Text style={{ fontSize: '13px', color: BRAND.textMuted, margin: '0 0 6px', letterSpacing: '0.01em' }}>
        {label}
      </Text>
      <Text style={{ fontSize: '36px', fontWeight: 700, color: accentColor, margin: '0 0 4px', lineHeight: '1' }}>
        {daysRemaining}
        <span style={{ fontSize: '15px', fontWeight: 400, color: BRAND.textMuted }}> of {totalDays} days</span>
      </Text>
      {urgency !== 'normal' && (
        <Text style={{ fontSize: '13px', color: BRAND.amberWarm, margin: '4px 0 0', lineHeight: '1.4' }}>
          {urgency === 'critical'
            ? 'Getting close — cap-exempt roles are your strongest path right now'
            : 'Worth keeping an eye on this'}
        </Text>
      )}
    </Section>
  )
}
