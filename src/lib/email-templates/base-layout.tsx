import {
  Html,
  Head,
  Preview,
  Body,
  Container,
  Section,
  Text,
  Link,
  Hr,
  Tailwind,
} from '@react-email/components'
import type { ReactNode } from 'react'

// ─── Brand Colors (inlined — email clients don't support CSS variables) ────

export const BRAND = {
  ocean: '#2563eb',
  oceanLight: '#60a5fa',
  oceanDeep: '#1e3a5f',
  jade: '#059669',
  jadeLight: '#10b981',
  amberWarm: '#d97706',
  bg: '#fafaf9',
  bgDark: '#1c1917',
  text: '#1c1917',
  textMuted: '#78716c',
  textDark: '#fafaf9',
  textMutedDark: '#a8a29e',
  card: '#ffffff',
  cardDark: '#292524',
  border: '#e7e5e4',
  borderDark: '#44403c',
} as const

// ─── Base Layout ──────────────────────────────────────────────────────────

interface BaseLayoutProps {
  preview: string
  children: ReactNode
}

export function BaseLayout({ preview, children }: BaseLayoutProps) {
  return (
    <Html lang="en">
      <Tailwind>
        <Head />
        <Preview>{preview}</Preview>
        <Body
          style={{ backgroundColor: BRAND.bg, fontFamily: FONT_STACK, margin: 0, padding: 0 }}
          className="dark:bg-[#1c1917]"
        >
          <Container style={{ maxWidth: '600px', margin: '0 auto', padding: '24px 16px' }}>
            {/* Header */}
            <Section style={{ paddingBottom: '24px' }}>
              <Text
                style={{
                  fontSize: '18px',
                  fontWeight: 700,
                  color: BRAND.oceanDeep,
                  letterSpacing: '-0.025em',
                  margin: 0,
                }}
              >
                SkyeSearch
              </Text>
            </Section>

            {/* Content */}
            {children}

            {/* Footer */}
            <Hr style={{ borderColor: BRAND.border, margin: '32px 0 24px' }} />
            <Section>
              <Text style={{ fontSize: '12px', lineHeight: '18px', color: BRAND.textMuted, margin: '0 0 8px' }}>
                This is not legal advice. Immigration rules change frequently.
                Always verify with your DSO or immigration attorney before
                making decisions based on information in this email.
              </Text>
              <Text style={{ fontSize: '12px', lineHeight: '18px', color: BRAND.textMuted, margin: 0 }}>
                <Link href="{{unsubscribeUrl}}" style={{ color: BRAND.ocean, textDecoration: 'none' }}>
                  Unsubscribe
                </Link>
                {' '}·{' '}
                <Link href="https://skye-search.vercel.app" style={{ color: BRAND.ocean, textDecoration: 'none' }}>
                  Open SkyeSearch
                </Link>
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  )
}

// ─── Font Stack ──────────────────────────────────────────────────────────

const FONT_STACK =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Ubuntu, sans-serif'

export { FONT_STACK }
