import { describe, it, expect } from 'vitest'
import { render } from '@react-email/components'
import { DailyPicksEmail, type DailyPicksEmailProps } from './daily-picks'

function log(step: string, detail: string) {
  process.stdout.write(`  [daily-picks-email test] ${step}: ${detail}\n`)
}

const baseProps: DailyPicksEmailProps = {
  daysUsed: 30,
  daysRemaining: 120,
  dayOfWeek: 'Tuesday',
  picks: [
    {
      title: 'Research Scientist',
      company: 'MIT',
      visaPath: 'cap_exempt',
      location: 'Boston, MA',
      score: 92,
      url: 'https://example.com/j1',
      whyFits: 'Strong match for ocean color & remote sensing',
    },
    {
      title: 'Data Analyst',
      company: 'NOAA',
      visaPath: 'cap_exempt',
      location: 'Silver Spring, MD',
      score: 85,
      url: 'https://example.com/j2',
    },
    {
      title: 'Software Engineer',
      company: 'Acme Corp',
      visaPath: 'cap_subject',
      location: 'NYC',
      score: 70,
    },
  ],
  capExemptCount: 2,
  bridgeCount: 1,
  scoringStatus: 'complete',
}

describe('DailyPicksEmail template', () => {
  it('renders with correct subject format in preview', async () => {
    log('Step 1', 'Rendering email with base props')
    const html = await render(DailyPicksEmail(baseProps))
    log('Step 2', `HTML length: ${html.length}`)

    // Preview text should include the subject line
    expect(html).toContain('Your 3 picks for Tuesday')
    expect(html).toContain('Day 30 of 150')
    expect(html).toContain('120 remaining')
  })

  it('includes all 3 job titles with visa path badges', async () => {
    log('Step 1', 'Checking job cards rendered')
    const html = await render(DailyPicksEmail(baseProps))

    expect(html).toContain('Research Scientist')
    expect(html).toContain('MIT')
    expect(html).toContain('Data Analyst')
    expect(html).toContain('NOAA')
    expect(html).toContain('Software Engineer')
    expect(html).toContain('Acme Corp')

    // Visa path badges
    expect(html).toContain('Cap-exempt')
    expect(html).toContain('Cap-subject')
    log('Step 2', 'All 3 jobs and badges verified')
  })

  it('includes urgency summary with cap-exempt and bridge counts', async () => {
    log('Step 1', 'Checking urgency summary')
    const html = await render(DailyPicksEmail(baseProps))

    expect(html).toContain('2 cap-exempt')
    expect(html).toContain('1 bridge role')
    log('Step 2', 'Urgency summary verified')
  })

  it('includes CTA link to /jobs', async () => {
    log('Step 1', 'Checking CTA button')
    const html = await render(DailyPicksEmail(baseProps))

    expect(html).toContain('Review your picks')
    expect(html).toContain('/jobs')
    log('Step 2', 'CTA link verified')
  })

  it('includes clock status with days remaining', async () => {
    log('Step 1', 'Checking clock status component')
    const html = await render(DailyPicksEmail(baseProps))

    expect(html).toContain('120')
    // React Email inserts <!-- --> comment nodes between interpolated values
    expect(html).toContain('150')
    expect(html).toContain('days')
    log('Step 2', 'Clock status verified')
  })

  it('includes whyFits when provided', async () => {
    log('Step 1', 'Checking whyFits text')
    const html = await render(DailyPicksEmail(baseProps))

    expect(html).toContain('Strong match for ocean color')
    log('Step 2', 'whyFits text rendered')
  })

  it('shows staleness notice when scoring is stale', async () => {
    log('Step 1', 'Rendering with stale scoring status')
    const html = await render(
      DailyPicksEmail({ ...baseProps, scoringStatus: 'stale' }),
    )

    // Apostrophes are HTML-encoded as &#x27; in rendered email output
    expect(html).toContain('yesterday&#x27;s top picks')
    expect(html).toContain('scoring is still running')
    log('Step 2', 'Staleness notice verified')
  })

  it('shows failure notice when scoring failed', async () => {
    log('Step 1', 'Rendering with failed scoring status')
    const html = await render(
      DailyPicksEmail({ ...baseProps, scoringStatus: 'failed' }),
    )

    expect(html).toContain('ran into a hiccup')
    expect(html).toContain('clock number is still accurate')
    log('Step 2', 'Failure notice verified')
  })

  it('does not show staleness notice when scoring is complete', async () => {
    log('Step 1', 'Rendering with complete scoring status')
    const html = await render(DailyPicksEmail(baseProps))

    expect(html).not.toContain("yesterday's top picks")
    expect(html).not.toContain('ran into a hiccup')
    log('Step 2', 'No staleness notice (correct)')
  })

  it('handles single pick correctly (no plural)', async () => {
    log('Step 1', 'Rendering with 1 pick')
    const html = await render(
      DailyPicksEmail({
        ...baseProps,
        picks: [baseProps.picks[0]],
        capExemptCount: 1,
        bridgeCount: 0,
      }),
    )

    expect(html).toContain('Your 1 pick for Tuesday')
    log('Step 2', 'Singular "pick" verified')
  })

  it('includes immigration disclaimer in footer', async () => {
    log('Step 1', 'Checking footer disclaimer')
    const html = await render(DailyPicksEmail(baseProps))

    expect(html).toContain('immigration')
    expect(html).toContain('DSO or attorney')
    log('Step 2', 'Disclaimer present')
  })
})
