import { Section, Text, Link } from '@react-email/components'
import { BRAND } from '../base-layout'

interface JobCardProps {
  title: string
  company: string
  visaPath: string
  location?: string
  score?: number
  url?: string
}

const VISA_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  cap_exempt: { bg: '#ecfdf5', text: BRAND.jade, label: 'Cap-exempt' },
  cap_subject: { bg: '#fffbeb', text: BRAND.amberWarm, label: 'Cap-subject' },
  opt_compatible: { bg: '#eff6ff', text: BRAND.ocean, label: 'OPT' },
  canada: { bg: '#f5f5f4', text: BRAND.textMuted, label: 'Canada' },
  unknown: { bg: '#f5f5f4', text: BRAND.textMuted, label: 'Unknown' },
}

export function JobCard({ title, company, visaPath, location, score, url }: JobCardProps) {
  const visa = VISA_COLORS[visaPath] ?? VISA_COLORS.unknown

  return (
    <Section
      style={{
        backgroundColor: BRAND.card,
        borderRadius: '12px',
        padding: '16px 20px',
        marginBottom: '8px',
        border: `1px solid ${BRAND.border}`,
      }}
    >
      <Text style={{ fontSize: '15px', fontWeight: 600, color: BRAND.text, margin: '0 0 2px', lineHeight: '1.3' }}>
        {url ? (
          <Link href={url} style={{ color: BRAND.text, textDecoration: 'none' }}>{title}</Link>
        ) : title}
      </Text>
      <Text style={{ fontSize: '13px', color: BRAND.textMuted, margin: '0 0 8px' }}>
        {company}{location ? ` · ${location}` : ''}
      </Text>
      <Text style={{ margin: 0, fontSize: 0, lineHeight: 0 }}>
        <span
          style={{
            display: 'inline-block',
            fontSize: '11px',
            padding: '2px 8px',
            borderRadius: '9999px',
            backgroundColor: visa.bg,
            color: visa.text,
            fontWeight: 500,
          }}
        >
          {visa.label}
        </span>
        {score !== undefined && (
          <span
            style={{
              display: 'inline-block',
              fontSize: '11px',
              color: BRAND.textMuted,
              marginLeft: '8px',
            }}
          >
            Score: {score}
          </span>
        )}
      </Text>
    </Section>
  )
}
