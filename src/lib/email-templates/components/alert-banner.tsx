import { Section, Text } from '@react-email/components'
import { BRAND } from '../base-layout'

type AlertLevel = 'info' | 'warning' | 'urgent'

interface AlertBannerProps {
  level: AlertLevel
  title: string
  message: string
}

const LEVEL_STYLES: Record<AlertLevel, { bg: string; accent: string; titleColor: string }> = {
  info: { bg: '#eff6ff', accent: BRAND.ocean, titleColor: BRAND.oceanDeep },
  warning: { bg: '#fffbeb', accent: BRAND.amberWarm, titleColor: '#92400e' },
  urgent: { bg: '#fef3c7', accent: BRAND.amberWarm, titleColor: '#92400e' },
}

export function AlertBanner({ level, title, message }: AlertBannerProps) {
  const styles = LEVEL_STYLES[level]

  return (
    <Section
      style={{
        backgroundColor: styles.bg,
        borderRadius: '12px',
        padding: '16px 20px',
        marginBottom: '16px',
      }}
    >
      <Text style={{ fontSize: '14px', fontWeight: 600, color: styles.titleColor, margin: '0 0 4px' }}>
        {title}
      </Text>
      <Text style={{ fontSize: '13px', lineHeight: '20px', color: BRAND.text, margin: 0 }}>
        {message}
      </Text>
    </Section>
  )
}
