import Link from 'next/link'
import { redirect } from 'next/navigation'
import { EmailDrafter } from '@/components/immigration/email-drafter'
import { getEmailTemplateData } from './actions'

export default async function EmailDraftsPage() {
  const data = await getEmailTemplateData()

  if (!data) redirect('/login')

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-2">
        <Link
          href="/immigration"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Immigration HQ
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Email drafts
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pre-filled with your actual dates and status — edit anything before sending.
        </p>
      </div>

      <EmailDrafter data={data} />
    </div>
  )
}
