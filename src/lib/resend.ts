import type { ReactNode } from 'react'
import { Resend } from 'resend'

// ─── Environment Guards ─────────────────────────────────────────────────────

function getRequiredEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

// ─── Client ─────────────────────────────────────────────────────────────────

let _client: Resend | null = null

export function getResendClient(): Resend {
  if (!_client) {
    _client = new Resend(getRequiredEnv('RESEND_API_KEY'))
  }
  return _client
}

// ─── Types ──────────────────────────────────────────────────────────────────

export interface SendEmailParams {
  to: string | string[]
  subject: string
  react?: ReactNode
  html?: string
  text?: string
  replyTo?: string
  cc?: string[]
  bcc?: string[]
  idempotencyKey?: string
}

export interface SendEmailResult {
  id: string
}

// ─── Send ───────────────────────────────────────────────────────────────────

export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  const resend = getResendClient()
  const from = getRequiredEnv('RESEND_FROM_EMAIL')
  const to = Array.isArray(params.to) ? params.to : [params.to]

  // Resend SDK uses discriminated unions — must provide exactly one of react/html/text
  const base = { from, to, subject: params.subject, replyTo: params.replyTo, cc: params.cc, bcc: params.bcc }
  const payload = params.react
    ? { ...base, react: params.react }
    : params.html
      ? { ...base, html: params.html }
      : { ...base, text: params.text ?? '' }

  const { data, error } = params.idempotencyKey
    ? await resend.emails.send(payload, { idempotencyKey: params.idempotencyKey })
    : await resend.emails.send(payload)

  if (error) {
    throw new Error(`Resend send failed: ${error.message} (${error.name})`)
  }

  if (!data?.id) {
    throw new Error('Resend send failed: no message ID returned')
  }

  return { id: data.id }
}

// ─── Domain Verification ────────────────────────────────────────────────────

export async function checkDomainStatus(): Promise<{
  verified: boolean
  domain: string
  spf: string
  dkim: string
}> {
  const resend = getResendClient()
  const { data, error } = await resend.domains.list()

  if (error) {
    throw new Error(`Resend domain list failed: ${error.message}`)
  }

  const fromEmail = getRequiredEnv('RESEND_FROM_EMAIL')
  const domainName = fromEmail.split('@')[1]
  const domain = data?.data?.find((d) => d.name === domainName)

  if (!domain) {
    return { verified: false, domain: domainName, spf: 'not_found', dkim: 'not_found' }
  }

  return {
    verified: domain.status === 'verified',
    domain: domain.name,
    spf: domain.status,
    dkim: domain.status,
  }
}

// ─── Webhook Verification ───────────────────────────────────────────────────

export function verifyWebhookSignature(
  resend: Resend,
  payload: string,
  headers: { id: string; timestamp: string; signature: string },
): unknown {
  const secret = getRequiredEnv('RESEND_WEBHOOK_SECRET')

  return resend.webhooks.verify({
    payload,
    headers,
    webhookSecret: secret,
  })
}

// ─── Reset (for testing) ────────────────────────────────────────────────────

export function _resetClient(): void {
  _client = null
}
