/**
 * Web Push server utilities.
 *
 * Uses the web-push library to send push notifications via the Web Push Protocol.
 * VAPID keys authenticate the server to browser push services (FCM, APNs, Mozilla).
 * No vendor account needed — just cryptographic identity.
 */
// eslint-disable-next-line @typescript-eslint/no-require-imports
const webpush = require('web-push') as {
  setVapidDetails(subject: string, publicKey: string, privateKey: string): void
  sendNotification(
    subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
    payload: string,
    options?: { TTL?: number; urgency?: string },
  ): Promise<{ statusCode: number; headers: Record<string, string>; body: string }>
}

function requireEnv(name: string): string {
  const val = process.env[name]
  if (!val) throw new Error(`Missing ${name} — run: bunx web-push generate-vapid-keys`)
  return val
}

let _configured = false

function ensureConfigured() {
  if (_configured) return
  const subject = process.env.VAPID_SUBJECT
    ?? (process.env.RESEND_FROM_EMAIL ? `mailto:${process.env.RESEND_FROM_EMAIL.replace(/.*<|>.*/g, '')}` : undefined)
    ?? 'mailto:dev@skye-search.test'
  webpush.setVapidDetails(
    subject,
    requireEnv('NEXT_PUBLIC_VAPID_PUBLIC_KEY'),
    requireEnv('VAPID_PRIVATE_KEY'),
  )
  _configured = true
}

export interface PushSubscription {
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
}

export interface PushPayload {
  title: string
  body: string
  url?: string
  icon?: string
}

export async function sendPushNotification(
  subscription: PushSubscription,
  payload: PushPayload,
): Promise<{ success: boolean; statusCode?: number; error?: string }> {
  ensureConfigured()

  const jsonPayload = JSON.stringify({
    ...payload,
    icon: payload.icon ?? '/icon-192x192.png',
  })

  try {
    const result = await webpush.sendNotification(subscription, jsonPayload, {
      TTL: 3600,
      urgency: 'normal',
    })
    return { success: true, statusCode: result.statusCode }
  } catch (err) {
    const error = err as { statusCode?: number; message?: string }
    // 410 Gone or 404 = subscription expired, should be removed from DB
    if (error.statusCode === 410 || error.statusCode === 404) {
      return { success: false, statusCode: error.statusCode, error: 'subscription_expired' }
    }
    return { success: false, statusCode: error.statusCode, error: error.message }
  }
}
