import { redirect } from 'next/navigation'
import { createClient } from '@/db/supabase-server'
import { EmailList } from '@/components/emails/email-list'

export default async function EmailsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: emails } = await supabase
    .from('raw_inbound_email')
    .select('id, sender, subject, body_text, status, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Inbox
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Emails forwarded here. Classify them to help SkyeSearch learn what matters.
        </p>
      </div>

      <EmailList emails={emails ?? []} />
    </div>
  )
}
