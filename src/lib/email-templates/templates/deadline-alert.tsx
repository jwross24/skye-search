import { Section, Text, Link } from '@react-email/components'
import { BaseLayout, BRAND, BASE_URL } from '../base-layout'
import { JobCard } from '../components/job-card'
import { AlertBanner } from '../components/alert-banner'

interface DeadlineJob {
  title: string
  company: string
  visaPath: string
  location?: string
  url?: string
  daysLeft: number
  deadline: string
}

interface DeadlineAlertProps {
  jobs: DeadlineJob[]
  unsubscribeUrl?: string
}

export function DeadlineAlert({ jobs, unsubscribeUrl }: DeadlineAlertProps) {
  const closestDeadline = Math.min(...jobs.map((j) => j.daysLeft))
  const urgencyWord = closestDeadline <= 1 ? 'tomorrow' : `in ${closestDeadline} days`

  return (
    <BaseLayout
      preview={`${jobs.length} application ${jobs.length === 1 ? 'deadline' : 'deadlines'} closing soon`}
      unsubscribeUrl={unsubscribeUrl}
    >
      <AlertBanner
        level={closestDeadline <= 1 ? 'urgent' : 'warning'}
        title={`Deadline${jobs.length > 1 ? 's' : ''} closing ${urgencyWord}`}
        message={
          jobs.length === 1
            ? `${jobs[0].company} closes ${urgencyWord}. Worth a look before it's gone.`
            : `${jobs.length} positions close within 72 hours. Here's what's on the clock.`
        }
      />

      {jobs.map((job, i) => (
        <Section key={i} style={{ marginBottom: '4px' }}>
          <JobCard
            title={job.title}
            company={job.company}
            visaPath={job.visaPath}
            location={job.location}
            url={job.url}
          />
          <Text style={{ fontSize: '12px', color: BRAND.amberWarm, margin: '-4px 0 8px 20px', fontWeight: 500 }}>
            {job.daysLeft === 0
              ? 'Due today'
              : job.daysLeft === 1
                ? 'Due tomorrow'
                : `${job.daysLeft} days left — ${job.deadline}`}
          </Text>
        </Section>
      ))}

      <Section style={{ textAlign: 'center' as const, padding: '12px 0' }}>
        <Link
          href={`${BASE_URL}/jobs`}
          style={{
            display: 'inline-block',
            backgroundColor: BRAND.ocean,
            color: '#ffffff',
            fontSize: '14px',
            fontWeight: 600,
            padding: '10px 24px',
            borderRadius: '8px',
            textDecoration: 'none',
          }}
        >
          View your picks
        </Link>
      </Section>
    </BaseLayout>
  )
}
