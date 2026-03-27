/**
 * Email preview — renders a sample email to HTML and writes to /tmp for viewing.
 * Run: bun run src/lib/email-templates/preview.tsx
 */
import { render } from '@react-email/components'
import { BaseLayout } from './base-layout'
import { ClockStatus } from './components/clock-status'
import { JobCard } from './components/job-card'
import { AlertBanner } from './components/alert-banner'
import { writeFileSync } from 'fs'

const SampleEmail = () => (
  <BaseLayout preview="3 new matches today — 119 unemployment days remaining">
    <AlertBanner
      level="info"
      title="3 new matches today"
      message="We found positions that fit your background in remote sensing and environmental science."
    />

    <ClockStatus daysRemaining={119} totalDays={150} />

    <JobCard
      title="Postdoc — Global Land Surface Remote Sensing"
      company="Brown University — IBES"
      visaPath="cap_exempt"
      location="Providence, RI"
      score={92}
      url="https://example.com/job/brown-postdoc"
    />
    <JobCard
      title="Earth System AI Scientist"
      company="CIRES — CU Boulder"
      visaPath="cap_exempt"
      location="Boulder, CO"
      score={87}
    />
    <JobCard
      title="Environmental Data Scientist"
      company="Tetra Tech"
      visaPath="cap_subject"
      location="Boston, MA"
      score={71}
    />

    <AlertBanner
      level="warning"
      title="Application deadline approaching"
      message="UCSB Photon Informed Ecology Lab closes in 5 days. You saved this one last week."
    />
  </BaseLayout>
)

const WarningEmail = () => (
  <BaseLayout preview="45 unemployment days remaining — worth checking in">
    <ClockStatus daysRemaining={45} totalDays={150} />

    <AlertBanner
      level="warning"
      title="Your clock is getting lower"
      message="You have 45 days of unemployment time remaining on STEM OPT. Consider focusing on cap-exempt employers where you can start quickly."
    />

    <JobCard
      title="Research Scientist — Ocean Color"
      company="NASA Goddard"
      visaPath="cap_exempt"
      location="Greenbelt, MD"
      score={95}
    />
  </BaseLayout>
)

const UrgentEmail = () => (
  <BaseLayout preview="15 unemployment days remaining — action needed">
    <ClockStatus daysRemaining={15} totalDays={150} />

    <AlertBanner
      level="urgent"
      title="Your timeline needs attention"
      message="15 unemployment days remaining. Talk to your DSO about your options — they can help you understand what comes next."
    />
  </BaseLayout>
)

async function main() {
  const pages = [
    { name: 'daily-picks', element: <SampleEmail /> },
    { name: 'clock-warning', element: <WarningEmail /> },
    { name: 'clock-urgent', element: <UrgentEmail /> },
  ]

  for (const page of pages) {
    const html = await render(page.element)
    const path = `/tmp/skye-email-${page.name}.html`
    writeFileSync(path, html)
    console.log(`Wrote ${path}`)
  }

  console.log('\nOpen in browser:')
  console.log('  open /tmp/skye-email-daily-picks.html')
  console.log('  open /tmp/skye-email-clock-warning.html')
  console.log('  open /tmp/skye-email-clock-urgent.html')
}

main()
