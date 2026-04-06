'use client'

import { useState } from 'react'
import { toast } from 'sonner'

interface EmailTemplateData {
  postdocEndDate: string | null
  employer: string | null
  daysUsed: number
  optExpiry: string | null
  dsoName: string
  fullName: string
  employmentActive: boolean
  planCActive: boolean
  offerAccepted: boolean
  hrContact: string
}

interface EmailDrafterProps {
  data: EmailTemplateData
}

// Format a date string like '2026-04-11' to 'April 11, 2026'
function formatDate(dateStr: string | null): string {
  if (!dateStr) return '[date]'
  const [year, month, day] = dateStr.split('-').map(Number)
  const d = new Date(year, month - 1, day)
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

function buildEmploymentChangeBody(data: EmailTemplateData): string {
  return `Hi ${data.dsoName},

I am writing to inform you that my employment at ${data.employer ?? '[Employer]'} will end on ${formatDate(data.postdocEndDate)}. As a STEM OPT student, I understand my unemployment clock will resume at that point.

My current unemployment days used: ${data.daysUsed} of 150 days.
My STEM OPT expiration: ${formatDate(data.optExpiry)}.

Please confirm my SEVIS record reflects this change. I am actively applying to cap-exempt positions and will update you when I secure new employment.

Thank you,
${data.fullName}`
}

function buildSevisReleaseBody(data: EmailTemplateData): string {
  return `Hi ${data.dsoName},

I have been accepted to [School] for their [Intake Date] intake. Could you please schedule my SEVIS transfer for approximately four weeks before [Intake Date]?

I will provide all necessary documentation and complete any required paperwork on my end. Please let me know what you need from me to move forward.

Thank you,
${data.fullName}`
}

function buildI983Body(data: EmailTemplateData): string {
  return `Hi ${data.dsoName},

I have accepted a cap-exempt role at [New Employer]. Attached is my I-983 training plan for your review. My unemployment clock should reflect ${data.daysUsed} days used, as the clock pauses from my employment start date upon your confirmation.

Please let me know if you need any additional information or if there are any corrections needed to the training plan.

Thank you,
${data.fullName}`
}

function buildPremiumProcessingBody(data: EmailTemplateData): string {
  return `Hi ${data.hrContact},

Given my STEM OPT expires on ${formatDate(data.optExpiry)}, I would like to request that we file my H-1B petition via Premium Processing. The current fee is $2,805 with a 15-business-day adjudication window. This gives us the most reliable timeline given my work authorization deadline.

I am happy to discuss the timeline or provide any documentation that would help move this forward quickly.

Thank you,
${data.fullName}`
}

interface TemplateSectionProps {
  heading: string
  description: string
  subject: string
  recipientLabel: string
  body: string
}

function TemplateSection({ heading, description, subject, recipientLabel, body: initialBody }: TemplateSectionProps) {
  const [body, setBody] = useState(initialBody)

  const handleCopy = async () => {
    const full = `Subject: ${subject}\n\n${body}`
    try {
      await navigator.clipboard.writeText(full)
      toast.success('Copied to clipboard')
    } catch {
      toast.error("Couldn't copy — try selecting and copying manually.")
    }
  }

  const mailtoHref = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`

  return (
    <section className="py-8 border-b border-border/50 last:border-0">
      <h2 className="text-base font-semibold text-foreground mb-1">{heading}</h2>
      <p className="text-sm text-muted-foreground mb-4">{description}</p>

      <div className="mb-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Subject</p>
        <p className="text-sm text-foreground bg-muted/40 rounded-md px-3 py-2 font-medium">{subject}</p>
      </div>

      <div className="mb-1">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
          To: {recipientLabel}
        </p>
      </div>

      <div className="mb-4">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Body</p>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={10}
          aria-label={`Email body for ${heading}`}
          className="w-full rounded-md border border-border bg-background text-sm text-foreground px-3 py-2.5 resize-y focus:outline-none focus:ring-2 focus:ring-ocean/50 focus:border-ocean"
        />
      </div>

      <div className="flex gap-3 items-center flex-wrap">
        <button
          type="button"
          onClick={handleCopy}
          className="text-sm text-foreground border border-border rounded-md px-4 py-1.5 hover:bg-muted/60 transition-colors"
        >
          Copy
        </button>
        <a
          href={mailtoHref}
          className="text-sm text-white bg-ocean-deep rounded-md px-4 py-1.5 hover:bg-ocean-deep/90 transition-colors"
          aria-label={`Open ${heading} in your email client`}
        >
          Open in email
        </a>
      </div>

      <p className="mt-3 text-xs text-muted-foreground/70">
        Review before sending. This is a starting point, not legal advice.
      </p>
    </section>
  )
}

export function EmailDrafter({ data }: EmailDrafterProps) {
  const employmentSubject = `OPT Employment Change — ${data.fullName}`
  const sevisSubject = `SEVIS Transfer Request — ${data.fullName}`
  const i983Subject = `I-983 Training Plan — ${data.fullName}, ${data.employer ?? '[Employer]'}`
  const premiumSubject = `H-1B Premium Processing Request — ${data.fullName}`

  return (
    <div>
      <TemplateSection
        heading="Employment status change"
        description="Send this to your DSO when your employment ends so they can update your SEVIS record."
        subject={employmentSubject}
        recipientLabel="Your DSO at your school's international office"
        body={buildEmploymentChangeBody(data)}
      />

      {data.planCActive && (
        <TemplateSection
          heading="SEVIS release request"
          description="Send this when you've been accepted to a new school and need your SEVIS record transferred."
          subject={sevisSubject}
          recipientLabel="Your DSO at your current school"
          body={buildSevisReleaseBody(data)}
        />
      )}

      {data.employmentActive && (
        <TemplateSection
          heading="I-983 training plan submission"
          description="Send this to your DSO when you start a new OPT-compatible position so your clock pauses."
          subject={i983Subject}
          recipientLabel="Your DSO at your school's international office"
          body={buildI983Body(data)}
        />
      )}

      {data.offerAccepted && (
        <TemplateSection
          heading="Premium processing request"
          description="Send this to your HR contact when you need to expedite your H-1B petition filing."
          subject={premiumSubject}
          recipientLabel={data.hrContact}
          body={buildPremiumProcessingBody(data)}
        />
      )}
    </div>
  )
}
