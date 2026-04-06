import { Section, Text, Link } from '@react-email/components'
import { BaseLayout, BRAND, BASE_URL } from '../base-layout'

interface EmploymentConfirmationProps {
  employerName: string | null
  daysSinceConfirmed: number | null
  unsubscribeUrl?: string
}

export function EmploymentConfirmation({
  employerName,
  daysSinceConfirmed,
  unsubscribeUrl,
}: EmploymentConfirmationProps) {
  const employer = employerName || 'your current employer'
  const confirmUrl = `${BASE_URL}/immigration`

  return (
    <BaseLayout
      preview={`Quick check: Is your bridge role at ${employer} still active?`}
      unsubscribeUrl={unsubscribeUrl}
    >
      <Section
        style={{
          backgroundColor: BRAND.card,
          borderRadius: '12px',
          padding: '20px 24px',
          marginBottom: '16px',
          border: `1px solid ${BRAND.border}`,
        }}
      >
        <Text style={{ fontSize: '16px', fontWeight: 600, color: BRAND.text, margin: '0 0 12px' }}>
          Quick check-in
        </Text>
        <Text style={{ fontSize: '14px', color: BRAND.text, margin: '0 0 8px', lineHeight: '1.6' }}>
          Is your bridge role at {employer} still active?
          {daysSinceConfirmed !== null && ` (Last confirmed ${daysSinceConfirmed} days ago.)`}
        </Text>
        <Text style={{ fontSize: '13px', color: BRAND.textMuted, margin: '0 0 4px', lineHeight: '1.5' }}>
          Your unemployment clock is paused while you&apos;re employed.
          A quick confirmation helps keep your records accurate.
        </Text>
      </Section>

      <Section style={{ textAlign: 'center' as const, padding: '8px 0 16px' }}>
        <Link
          href={confirmUrl}
          style={{
            display: 'inline-block',
            backgroundColor: BRAND.jade,
            color: '#ffffff',
            fontSize: '14px',
            fontWeight: 600,
            padding: '10px 24px',
            borderRadius: '8px',
            textDecoration: 'none',
          }}
        >
          Confirm in SkyeSearch
        </Link>
      </Section>

      <Section>
        <Text style={{ fontSize: '12px', color: BRAND.textMuted, margin: 0, lineHeight: '1.5' }}>
          If your role has ended, please update your status in Immigration HQ
          so your clock can resume accurately.
        </Text>
      </Section>
    </BaseLayout>
  )
}
