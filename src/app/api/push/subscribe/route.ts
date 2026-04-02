import { NextResponse } from 'next/server'
import { createClient } from '@/db/supabase-server'

/**
 * POST /api/push/subscribe
 *
 * Stores a Web Push subscription for the authenticated user.
 * Called from the client after PushManager.subscribe() succeeds.
 *
 * Body: { subscription: PushSubscriptionJSON }
 *
 * The subscription object contains:
 * - endpoint: URL for the browser's push service
 * - keys.p256dh: public key for message encryption
 * - keys.auth: authentication secret
 */
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const subscription = body?.subscription

  if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
    return NextResponse.json({ error: 'Invalid push subscription' }, { status: 400 })
  }

  // Upsert: one subscription per user (overwrite if re-subscribing)
  const { error } = await supabase
    .from('users')
    .update({ push_subscription: subscription })
    .eq('id', user.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

/**
 * DELETE /api/push/subscribe
 *
 * Removes the push subscription for the authenticated user.
 */
export async function DELETE() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const { error } = await supabase
    .from('users')
    .update({ push_subscription: null })
    .eq('id', user.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
