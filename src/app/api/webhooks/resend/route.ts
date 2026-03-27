import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getResendClient, verifyWebhookSignature } from '@/lib/resend'

export async function POST(req: NextRequest) {
  try {
    const payload = await req.text()

    const id = req.headers.get('svix-id')
    const timestamp = req.headers.get('svix-timestamp')
    const signature = req.headers.get('svix-signature')

    if (!id || !timestamp || !signature) {
      return NextResponse.json(
        { error: 'Missing webhook headers' },
        { status: 400 },
      )
    }

    const resend = getResendClient()
    const event = verifyWebhookSignature(resend, payload, {
      id,
      timestamp,
      signature,
    })

    const eventType = (event as { type?: string })?.type
    const eventData = (event as { data?: Record<string, unknown> })?.data

    switch (eventType) {
      case 'email.received':
        await handleInboundEmail(resend, eventData)
        break
      case 'email.sent':
      case 'email.delivered':
      case 'email.bounced':
      case 'email.complained':
      case 'email.opened':
      case 'email.clicked':
        break
      default:
        break
    }

    // Always return 200 — Resend retries on non-200
    return NextResponse.json({ received: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

// ─── Inbound Email Handler ────────────────────────────────────────────────

/** Webhook event.data shape for email.received */
interface EmailReceivedEventData {
  email_id: string
  from: string
  to: string[]
  subject: string
  created_at: string
}

async function handleInboundEmail(
  resend: ReturnType<typeof getResendClient>,
  eventData: Record<string, unknown> | undefined,
) {
  if (!eventData) return

  const { email_id: emailId } = eventData as unknown as EmailReceivedEventData
  if (!emailId) return

  // Fetch full email content (webhook has metadata only)
  const { data: email } = await resend.emails.receiving.get(emailId)
  if (!email) return

  // Direct client (not createServiceClient) — webhook has no cookie context
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
  )

  // Resolve user — query users table directly (single-user for Phase 0,
  // multi-user would match email.to address to user's configured inbox)
  const { data: users } = await supabase
    .from('users')
    .select('id')
    .limit(1)

  const userId = users?.[0]?.id
  if (!userId) return

  // Extract attachment metadata (store metadata, not file content in Phase 0)
  // email.attachments may be undefined when no attachments (SDK returns void 0)
  const attachments = email.attachments ?? []
  const attachmentsJson = attachments.length > 0
    ? attachments.map((a) => ({
        id: a.id,
        filename: a.filename,
        content_type: a.content_type,
        size: a.size,
      }))
    : null

  const { error } = await supabase.from('raw_inbound_email').insert({
    user_id: userId,
    sender: email.from,
    subject: email.subject,
    body_text: email.text,
    attachments_json: attachmentsJson,
    status: 'unprocessed',
  })

  if (error) {
    console.error(`[inbound-email] Failed to store email ${emailId}: ${error.message}`)
  }
}
