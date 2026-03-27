'use client'

import { useState } from 'react'
import { Mail, Tag, EyeOff, Briefcase, ArrowUpRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { classifyEmail, type EmailClassification } from '@/app/emails/actions'

interface Email {
  id: string
  sender: string | null
  subject: string | null
  body_text: string | null
  status: string | null
  created_at: string
}

interface EmailListProps {
  emails: Email[]
}

export function EmailList({ emails }: EmailListProps) {
  if (emails.length === 0) {
    return (
      <div className="py-16">
        <h2 className="text-lg font-semibold text-foreground">
          No emails yet
        </h2>
        <p className="mt-2 max-w-md text-sm text-muted-foreground leading-relaxed">
          Forward job alerts and application updates here. SkyeSearch will
          learn what matters to you over time.
        </p>
      </div>
    )
  }

  const unprocessed = emails.filter((e) => e.status === 'unprocessed')
  const processed = emails.filter((e) => e.status !== 'unprocessed')

  return (
    <div>
      {unprocessed.length > 0 && (
        <section>
          <p className="text-sm text-muted-foreground mb-3" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {unprocessed.length} to classify
          </p>
          <div>
            {unprocessed.map((email) => (
              <EmailRow key={email.id} email={email} showActions />
            ))}
          </div>
        </section>
      )}

      {processed.length > 0 && (
        <section className="mt-8">
          <p className="text-sm text-muted-foreground mb-3">
            Classified
          </p>
          <div>
            {processed.map((email) => (
              <EmailRow key={email.id} email={email} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function EmailRow({ email, showActions }: { email: Email; showActions?: boolean }) {
  const [classifying, setClassifying] = useState(false)

  const handleClassify = async (classification: EmailClassification) => {
    setClassifying(true)
    const result = await classifyEmail(email.id, classification)
    if (!result.success) setClassifying(false)
  }

  const date = new Date(email.created_at)
  const formattedDate = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
  const formattedTime = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })

  return (
    <article className="py-4 group" data-testid={`email-row-${email.id}`}>
      <div className="flex items-start gap-3">
        <div className="shrink-0 pt-0.5">
          <Mail className="size-4 text-muted-foreground/50" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-sm font-medium text-foreground truncate">
              {email.sender ?? 'Unknown sender'}
            </p>
            <span className="shrink-0 text-xs text-muted-foreground">
              {formattedDate} {formattedTime}
            </span>
          </div>

          <p className="text-sm text-foreground/80 mt-0.5 truncate">
            {email.subject ?? '(no subject)'}
          </p>

          {email.body_text && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
              {email.body_text.slice(0, 200)}
            </p>
          )}

          {showActions && !classifying && (
            <div className="flex items-center gap-2 mt-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleClassify('job_alert')}
                className="gap-1 text-xs"
              >
                <Briefcase className="size-3" />
                Job alert
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleClassify('application_update')}
                className="gap-1 text-xs"
              >
                <ArrowUpRight className="size-3" />
                App update
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleClassify('ignore')}
                className="gap-1 text-xs text-muted-foreground"
              >
                <EyeOff className="size-3" />
                Ignore
              </Button>
            </div>
          )}

          {classifying && (
            <p className="text-xs text-muted-foreground/60 mt-2 animate-in fade-in">
              Classified
            </p>
          )}

          {!showActions && email.status && (
            <span className="inline-flex items-center gap-1 mt-1 text-xs text-muted-foreground/60">
              <Tag className="size-3" />
              {email.status === 'classified' ? 'Classified' : 'Ignored'}
            </span>
          )}
        </div>
      </div>

      <div className="h-px bg-border/50 mt-4" />
    </article>
  )
}
