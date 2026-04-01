import twilio from 'twilio'

function requireEnv(name: string): string {
  const val = process.env[name]
  if (!val) throw new Error(`Missing ${name} — check .env.local or Vercel env vars`)
  return val
}

let _client: ReturnType<typeof twilio> | null = null

export function getTwilioClient() {
  if (!_client) {
    _client = twilio(
      requireEnv('TWILIO_ACCOUNT_SID'),
      requireEnv('TWILIO_AUTH_TOKEN'),
    )
  }
  return _client
}

export interface SendSmsParams {
  to: string
  body: string
}

export interface SendSmsResult {
  sid: string
  status: string
}

export async function sendSms({ to, body }: SendSmsParams): Promise<SendSmsResult> {
  const client = getTwilioClient()
  const from = requireEnv('TWILIO_FROM_NUMBER')

  const message = await client.messages.create({ to, from, body })
  return { sid: message.sid, status: message.status }
}
