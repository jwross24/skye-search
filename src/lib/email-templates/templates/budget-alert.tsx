import { Section, Text } from '@react-email/components'
import { BaseLayout, BRAND } from '../base-layout'
import { AlertBanner } from '../components/alert-banner'

interface BudgetAlertProps {
  dailyCents: number
  weeklyCents: number
  dailyCapCents: number
  weeklyCapCents: number
}

export function BudgetAlert({
  dailyCents,
  weeklyCents,
  dailyCapCents,
  weeklyCapCents,
}: BudgetAlertProps) {
  const dailyDollars = (dailyCents / 100).toFixed(2)
  const weeklyDollars = (weeklyCents / 100).toFixed(2)
  const dailyCapDollars = (dailyCapCents / 100).toFixed(2)
  const weeklyCapDollars = (weeklyCapCents / 100).toFixed(2)

  return (
    <BaseLayout preview={`API spend this week: $${weeklyDollars}`}>
      <AlertBanner
        level="warning"
        title="Your API spend is getting close to the weekly limit"
        message="Non-essential searches may be paused to stay within your budget. Unemployment tracking and deadline alerts are still running."
      />

      <Section
        style={{
          backgroundColor: BRAND.card,
          borderRadius: '12px',
          padding: '16px 20px',
          marginTop: '16px',
        }}
      >
        <Text style={{ color: BRAND.text, fontSize: '14px', margin: '0 0 8px 0' }}>
          Today: ${dailyDollars} / ${dailyCapDollars}
        </Text>
        <Text style={{ color: BRAND.text, fontSize: '14px', margin: '0 0 8px 0' }}>
          This week: ${weeklyDollars} / ${weeklyCapDollars}
        </Text>
        <Text style={{ color: BRAND.textMuted, fontSize: '13px', margin: '8px 0 0 0' }}>
          You can adjust your spend limits in Settings.
        </Text>
      </Section>
    </BaseLayout>
  )
}
