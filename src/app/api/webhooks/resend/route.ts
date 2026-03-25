import { type NextRequest, NextResponse } from 'next/server'
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

    // Event routing — downstream beads will add handlers here
    const eventType = (event as { type?: string })?.type
    switch (eventType) {
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

    return NextResponse.json({ received: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
