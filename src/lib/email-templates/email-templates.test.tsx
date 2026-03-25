import { describe, it, expect } from 'vitest'
import { render } from '@react-email/components'
import { BaseLayout } from './base-layout'
import { ClockStatus } from './components/clock-status'
import { JobCard } from './components/job-card'
import { AlertBanner } from './components/alert-banner'

function log(step: string, detail: string) {
  process.stdout.write(`  [email-template test] ${step}: ${detail}\n`)
}

// ─── Base Layout ──────────────────────────────────────────────────────────

describe('BaseLayout', () => {
  it('renders valid HTML with header, footer, and disclaimer', async () => {
    log('Step 1', 'Rendering base layout to HTML')
    const html = await render(
      <BaseLayout preview="Test preview text" unsubscribeUrl="https://example.com/unsub">
        <p>Test content</p>
      </BaseLayout>,
    )

    log('Step 2', 'Verifying required elements')
    expect(html).toContain('SkyeSearch')
    expect(html).toContain('informational purposes only')
    expect(html).toContain('Unsubscribe')
    expect(html).toContain('example.com/unsub')
    expect(html).toContain('Test content')
    expect(html).toContain('<!DOCTYPE html')
  })

  it('includes preview text in output', async () => {
    const html = await render(
      <BaseLayout preview="Your daily job picks are ready">
        <p>Content</p>
      </BaseLayout>,
    )

    expect(html).toContain('Your daily job picks are ready')
  })

  it('sets lang="en" on html element', async () => {
    const html = await render(
      <BaseLayout preview="test">
        <p>Content</p>
      </BaseLayout>,
    )

    expect(html).toContain('lang="en"')
  })

  it('footer links to SkyeSearch app', async () => {
    const html = await render(
      <BaseLayout preview="test">
        <p>Content</p>
      </BaseLayout>,
    )

    expect(html).toContain('skye-search.vercel.app')
  })
})

// ─── ClockStatus ──────────────────────────────────────────────────────────

describe('ClockStatus', () => {
  it('renders days remaining', async () => {
    log('Step 1', 'Rendering clock status with 119/150 days')
    const html = await render(
      <BaseLayout preview="test">
        <ClockStatus daysRemaining={119} totalDays={150} />
      </BaseLayout>,
    )

    log('Step 2', 'Verifying days display')
    expect(html).toContain('119')
    expect(html).toContain('150')
    expect(html).toContain('Your immigration clock')
  })

  it('shows warning message when days <= 60', async () => {
    const html = await render(
      <BaseLayout preview="test">
        <ClockStatus daysRemaining={45} totalDays={150} />
      </BaseLayout>,
    )

    expect(html).toContain('keeping an eye on this')
  })

  it('shows critical message when days <= 30', async () => {
    const html = await render(
      <BaseLayout preview="test">
        <ClockStatus daysRemaining={15} totalDays={150} />
      </BaseLayout>,
    )

    expect(html).toContain('cap-exempt roles are your strongest path')
  })

  it('no urgency message when days > 60', async () => {
    const html = await render(
      <BaseLayout preview="test">
        <ClockStatus daysRemaining={100} totalDays={150} />
      </BaseLayout>,
    )

    expect(html).not.toContain('cap-exempt roles')
    expect(html).not.toContain('keeping an eye')
  })
})

// ─── JobCard ──────────────────────────────────────────────────────────────

describe('JobCard', () => {
  it('renders title, company, and visa path', async () => {
    log('Step 1', 'Rendering job card')
    const html = await render(
      <BaseLayout preview="test">
        <JobCard
          title="Postdoc — Remote Sensing"
          company="Brown University"
          visaPath="cap_exempt"
          location="Providence, RI"
          score={92}
        />
      </BaseLayout>,
    )

    log('Step 2', 'Verifying card content')
    expect(html).toContain('Postdoc — Remote Sensing')
    expect(html).toContain('Brown University')
    expect(html).toContain('Cap-exempt')
    expect(html).toContain('Providence, RI')
    expect(html).toContain('92')
    expect(html).toContain('match')
  })

  it('renders link when url provided', async () => {
    const html = await render(
      <BaseLayout preview="test">
        <JobCard
          title="Test Job"
          company="Test Corp"
          visaPath="cap_exempt"
          url="https://example.com/job"
        />
      </BaseLayout>,
    )

    expect(html).toContain('https://example.com/job')
  })

  it('handles unknown visa path gracefully', async () => {
    const html = await render(
      <BaseLayout preview="test">
        <JobCard title="Test" company="Test" visaPath="something_new" />
      </BaseLayout>,
    )

    expect(html).toContain('Unknown')
  })
})

// ─── AlertBanner ──────────────────────────────────────────────────────────

describe('AlertBanner', () => {
  it('renders info alert', async () => {
    const html = await render(
      <BaseLayout preview="test">
        <AlertBanner level="info" title="New matches" message="3 new jobs match your profile" />
      </BaseLayout>,
    )

    expect(html).toContain('New matches')
    expect(html).toContain('3 new jobs match your profile')
  })

  it('renders warning alert', async () => {
    const html = await render(
      <BaseLayout preview="test">
        <AlertBanner level="warning" title="Deadline approaching" message="UCSB application due in 5 days" />
      </BaseLayout>,
    )

    expect(html).toContain('Deadline approaching')
    expect(html).toContain('UCSB application due in 5 days')
  })

  it('renders urgent alert', async () => {
    const html = await render(
      <BaseLayout preview="test">
        <AlertBanner level="urgent" title="Clock update" message="30 unemployment days remaining" />
      </BaseLayout>,
    )

    expect(html).toContain('Clock update')
    expect(html).toContain('30 unemployment days remaining')
  })
})
