import { Section, Text, Link } from '@react-email/components'
import { BaseLayout, BRAND } from '../base-layout'
import { AlertBanner } from '../components/alert-banner'

interface CronFailureAlertProps {
  executionDate: string
  errorMessage: string
  triggerSource: string
  userId?: string
}

export function CronFailureAlert({
  executionDate,
  errorMessage,
  triggerSource,
  userId,
}: CronFailureAlertProps) {
  return (
    <BaseLayout preview={`SkyeSearch health check failed — ${triggerSource} — ${executionDate}`}>
      <AlertBanner
        level="urgent"
        title="Health check failed"
        message="A scheduled health check detected a problem. Review the failure details below."
      />

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
          Failure details
        </Text>
        <Text style={{ fontSize: '13px', color: BRAND.textMuted, margin: '0 0 4px', lineHeight: '1.5' }}>
          <strong>Date:</strong> {executionDate}
        </Text>
        <Text style={{ fontSize: '13px', color: BRAND.textMuted, margin: '0 0 4px', lineHeight: '1.5' }}>
          <strong>Source:</strong> {triggerSource}
        </Text>
        {userId && (
          <Text style={{ fontSize: '13px', color: BRAND.textMuted, margin: '0 0 4px', lineHeight: '1.5' }}>
            <strong>User:</strong> {userId}
          </Text>
        )}
        <Section
          style={{
            backgroundColor: '#fef2f2',
            borderRadius: '8px',
            padding: '12px',
            marginTop: '8px',
          }}
        >
          <Text style={{ fontSize: '12px', color: '#991b1b', margin: 0, fontFamily: 'monospace', lineHeight: '1.4' }}>
            {errorMessage}
          </Text>
        </Section>
      </Section>

      <Text style={{ fontSize: '13px', color: BRAND.textMuted, lineHeight: '1.5', margin: '0 0 12px' }}>
        Check the <Link href="https://supabase.com/dashboard" style={{ color: BRAND.ocean }}>Supabase dashboard</Link>,{' '}
        Vercel function logs, and cron_execution_log table for more context.
      </Text>
    </BaseLayout>
  )
}
