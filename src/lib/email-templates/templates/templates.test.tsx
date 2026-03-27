import { describe, it, expect } from 'vitest'
import { render } from '@react-email/components'
import { UnemploymentDigest } from './unemployment-digest'
import { DeadlineAlert } from './deadline-alert'
import { CronFailureAlert } from './cron-failure'

function log(step: string, detail: string) {
  process.stdout.write(`  [alert-template test] ${step}: ${detail}\n`)
}

// ─── Unemployment Digest ─────────────────────────────────────────────────────

describe('UnemploymentDigest', () => {
  it('renders days remaining and weekly summary', async () => {
    log('Step 1', 'Rendering unemployment digest with 25 days remaining')
    const html = await render(
      <UnemploymentDigest
        daysRemaining={25}
        totalDays={150}
        daysUsedThisWeek={3}
        employedDaysThisWeek={2}
        gapDays={2}
      />,
    )

    log('Step 2', 'Verifying content')
    expect(html).toContain('25')
    expect(html).toContain('150')
    expect(html).toContain('3 unemployment days counted')
    expect(html).toContain('2 employed')
    // React Email inserts HTML comments between JSX interpolations
    expect(html).toContain('no checkpoint data')
    expect(html).toContain('Immigration HQ')
  })

  it('shows urgent alert when <15 days remaining', async () => {
    const html = await render(
      <UnemploymentDigest
        daysRemaining={10}
        totalDays={150}
        daysUsedThisWeek={5}
        employedDaysThisWeek={0}
        gapDays={0}
      />,
    )

    expect(html).toContain('10 days remaining')
    expect(html).toContain('cap-exempt roles and bridge positions')
  })

  it('shows no gap warning when gapDays is 0', async () => {
    const html = await render(
      <UnemploymentDigest
        daysRemaining={20}
        totalDays={150}
        daysUsedThisWeek={5}
        employedDaysThisWeek={2}
        gapDays={0}
      />,
    )

    expect(html).not.toContain('no checkpoint data')
  })

  it('shows "No unemployment days counted" when 0 this week', async () => {
    const html = await render(
      <UnemploymentDigest
        daysRemaining={28}
        totalDays={150}
        daysUsedThisWeek={0}
        employedDaysThisWeek={7}
        gapDays={0}
      />,
    )

    expect(html).toContain('No unemployment days counted')
  })

  it('includes preview text with days remaining', async () => {
    const html = await render(
      <UnemploymentDigest
        daysRemaining={22}
        totalDays={150}
        daysUsedThisWeek={1}
        employedDaysThisWeek={0}
        gapDays={0}
      />,
    )

    expect(html).toContain('22 unemployment days remaining')
  })
})

// ─── Deadline Alert ──────────────────────────────────────────────────────────

describe('DeadlineAlert', () => {
  const sampleJobs = [
    {
      title: 'Postdoc — Remote Sensing',
      company: 'Brown University',
      visaPath: 'cap_exempt',
      location: 'Providence, RI',
      url: 'https://example.com/job1',
      daysLeft: 2,
      deadline: 'Apr 5',
    },
    {
      title: 'Research Scientist',
      company: 'Woodwell Climate',
      visaPath: 'cap_exempt',
      daysLeft: 1,
      deadline: 'Apr 4',
    },
  ]

  it('renders job cards with deadlines', async () => {
    log('Step 1', 'Rendering deadline alert with 2 jobs')
    const html = await render(<DeadlineAlert jobs={sampleJobs} />)

    log('Step 2', 'Verifying job content')
    expect(html).toContain('Postdoc — Remote Sensing')
    expect(html).toContain('Brown University')
    expect(html).toContain('Research Scientist')
    expect(html).toContain('Woodwell Climate')
    expect(html).toContain('Cap-exempt')
  })

  it('shows correct urgency for tomorrow deadline', async () => {
    const html = await render(
      <DeadlineAlert jobs={[{ ...sampleJobs[1], daysLeft: 1 }]} />,
    )

    expect(html).toContain('tomorrow')
  })

  it('shows "Due today" for 0 days left', async () => {
    const html = await render(
      <DeadlineAlert jobs={[{ ...sampleJobs[0], daysLeft: 0, deadline: 'Today' }]} />,
    )

    expect(html).toContain('Due today')
  })

  it('includes link to job picks', async () => {
    const html = await render(<DeadlineAlert jobs={sampleJobs} />)
    expect(html).toContain('View your picks')
  })

  it('preview text mentions deadline count', async () => {
    const html = await render(<DeadlineAlert jobs={sampleJobs} />)
    expect(html).toContain('2 application deadlines closing soon')
  })

  it('singular form for 1 job', async () => {
    const html = await render(<DeadlineAlert jobs={[sampleJobs[0]]} />)
    expect(html).toContain('1 application deadline closing soon')
  })
})

// ─── Cron Failure Alert ──────────────────────────────────────────────────────

describe('CronFailureAlert', () => {
  it('renders failure details', async () => {
    log('Step 1', 'Rendering cron failure alert')
    const html = await render(
      <CronFailureAlert
        executionDate="2026-03-26"
        errorMessage="Connection refused: ECONNREFUSED 127.0.0.1:54322"
        triggerSource="pg_cron"
        userId="user-123"
      />,
    )

    log('Step 2', 'Verifying failure content')
    expect(html).toContain('Unemployment checkpoint failed')
    expect(html).toContain('2026-03-26')
    expect(html).toContain('pg_cron')
    expect(html).toContain('user-123')
    expect(html).toContain('ECONNREFUSED')
  })

  it('includes preview text with CRON FAILURE', async () => {
    const html = await render(
      <CronFailureAlert
        executionDate="2026-03-26"
        errorMessage="timeout"
        triggerSource="keepalive_gha"
      />,
    )

    expect(html).toContain('CRON FAILURE')
  })

  it('renders without userId (optional field)', async () => {
    const html = await render(
      <CronFailureAlert
        executionDate="2026-03-26"
        errorMessage="DB timeout"
        triggerSource="pg_cron"
      />,
    )

    expect(html).toContain('2026-03-26')
    expect(html).not.toContain('User:') // userId section not rendered
  })

  it('mentions manual backfill in body', async () => {
    const html = await render(
      <CronFailureAlert
        executionDate="2026-03-26"
        errorMessage="error"
        triggerSource="pg_cron"
      />,
    )

    expect(html).toContain('manual backfill')
  })
})
