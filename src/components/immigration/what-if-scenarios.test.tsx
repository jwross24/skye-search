import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { WhatIfScenarios } from './what-if-scenarios'
import type { ScenarioResult } from '@/lib/what-if-scenarios'

function log(step: string, detail: string) {
  process.stdout.write(`  [what-if-ui] ${step}: ${detail}\n`)
}

const MOCK_SCENARIOS: ScenarioResult[] = [
  {
    id: 'cap_exempt_may',
    title: 'I get a cap-exempt offer in May',
    subtitle: 'University, nonprofit, or government lab',
    projectedDaysUsed: 64,
    projectedStatus: '64 of 150 days used',
    recommendation: "You'd have plenty of runway.",
    tone: 'reassuring',
  },
  {
    id: 'bridge_may',
    title: 'I get a bridge job in May',
    subtitle: '20+ hours, STEM-related, E-Verify employer',
    projectedDaysUsed: 50,
    projectedStatus: 'Clock halts at 50 days — 100 days preserved',
    recommendation: 'Your clock stops and you keep looking.',
    tone: 'encouraging',
  },
  {
    id: 'nothing_june',
    title: 'Nothing by June',
    subtitle: 'No offer, no bridge employment',
    projectedDaysUsed: 81,
    projectedStatus: '81 of 150 days used — 69 remaining',
    recommendation: 'Time to activate Plan C.',
    tone: 'actionable',
  },
  {
    id: 'nothing_august',
    title: 'Nothing by August',
    subtitle: 'OPT expiry approaching',
    projectedDaysUsed: 142,
    projectedStatus: '142 of 150 days used — 14 days to OPT expiry',
    recommendation: 'The plan shifts to a SEVIS transfer.',
    tone: 'urgent',
  },
]

describe('WhatIfScenarios component', () => {
  it('renders all 4 scenario cards', () => {
    log('Step 1', 'Rendering 4 scenarios')
    render(<WhatIfScenarios scenarios={MOCK_SCENARIOS} daysUsed={31} />)

    expect(screen.getByTestId('scenario-cap_exempt_may')).toBeDefined()
    expect(screen.getByTestId('scenario-bridge_may')).toBeDefined()
    expect(screen.getByTestId('scenario-nothing_june')).toBeDefined()
    expect(screen.getByTestId('scenario-nothing_august')).toBeDefined()
    log('Step 2', 'All 4 cards rendered')
  })

  it('each card shows title, projected status, and recommendation', () => {
    log('Step 1', 'Checking card content')
    render(<WhatIfScenarios scenarios={MOCK_SCENARIOS} daysUsed={31} />)

    expect(screen.getByText('I get a cap-exempt offer in May')).toBeDefined()
    expect(screen.getByText('64 of 150 days used')).toBeDefined()
    expect(screen.getByText("You'd have plenty of runway.")).toBeDefined()

    expect(screen.getByText('Nothing by August')).toBeDefined()
    expect(screen.getByText('The plan shifts to a SEVIS transfer.')).toBeDefined()
    log('Step 2', 'Content matches')
  })

  it('shows current days used in context line', () => {
    render(<WhatIfScenarios scenarios={MOCK_SCENARIOS} daysUsed={31} />)
    expect(screen.getByText(/Starting from 31 days used/)).toBeDefined()
  })

  it('shows disclaimer about verification', () => {
    render(<WhatIfScenarios scenarios={MOCK_SCENARIOS} daysUsed={31} />)
    expect(screen.getByText(/always verify with your DSO or attorney/i)).toBeDefined()
  })

  it('shows empty state when no scenarios (uncalibrated)', () => {
    log('Step 1', 'Rendering with empty scenarios')
    render(<WhatIfScenarios scenarios={[]} daysUsed={0} />)
    expect(screen.getByTestId('what-if-empty')).toBeDefined()
    expect(screen.getByText(/Complete your immigration calibration/)).toBeDefined()
    log('Step 2', 'Empty state shown')
  })
})
