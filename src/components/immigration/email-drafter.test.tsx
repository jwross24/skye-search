import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EmailDrafter } from './email-drafter'

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

const BASE_DATA = {
  postdocEndDate: '2026-04-11',
  employer: 'Boston University',
  daysUsed: 7,
  optExpiry: '2026-08-15',
  dsoName: 'Jane Smith',
  fullName: 'Wei Chen',
  employmentActive: false,
  planCActive: false,
  offerAccepted: false,
  hrContact: '[HR Contact]',
}

describe('EmailDrafter — template visibility', () => {
  it('always shows the Employment Status Change template', () => {
    render(<EmailDrafter data={BASE_DATA} />)
    expect(screen.getByText('Employment status change')).toBeDefined()
  })

  it('does NOT show SEVIS Release when planCActive=false', () => {
    render(<EmailDrafter data={{ ...BASE_DATA, planCActive: false }} />)
    expect(screen.queryByText('SEVIS release request')).toBeNull()
  })

  it('shows SEVIS Release only when planCActive=true', () => {
    render(<EmailDrafter data={{ ...BASE_DATA, planCActive: true }} />)
    expect(screen.getByText('SEVIS release request')).toBeDefined()
  })

  it('does NOT show I-983 when employmentActive=false', () => {
    render(<EmailDrafter data={{ ...BASE_DATA, employmentActive: false }} />)
    expect(screen.queryByText('I-983 training plan submission')).toBeNull()
  })

  it('shows I-983 only when employmentActive=true', () => {
    render(<EmailDrafter data={{ ...BASE_DATA, employmentActive: true }} />)
    expect(screen.getByText('I-983 training plan submission')).toBeDefined()
  })

  it('does NOT show Premium Processing when offerAccepted=false', () => {
    render(<EmailDrafter data={{ ...BASE_DATA, offerAccepted: false }} />)
    expect(screen.queryByText('Premium processing request')).toBeNull()
  })

  it('shows Premium Processing only when offerAccepted=true', () => {
    render(<EmailDrafter data={{ ...BASE_DATA, offerAccepted: true }} />)
    expect(screen.getByText('Premium processing request')).toBeDefined()
  })
})

describe('EmailDrafter — pre-filled content', () => {
  it('Employment template body contains employer name', () => {
    render(<EmailDrafter data={BASE_DATA} />)
    const textareas = screen.getAllByRole('textbox')
    // First textarea is the Employment Status Change body
    expect(textareas[0].textContent ?? (textareas[0] as HTMLTextAreaElement).value).toContain('Boston University')
  })

  it('Employment template body contains days used', () => {
    render(<EmailDrafter data={BASE_DATA} />)
    const textareas = screen.getAllByRole('textbox')
    expect((textareas[0] as HTMLTextAreaElement).value).toContain('7 of 150 days')
  })

  it('Employment template body contains formatted postdoc end date', () => {
    render(<EmailDrafter data={BASE_DATA} />)
    const textareas = screen.getAllByRole('textbox')
    expect((textareas[0] as HTMLTextAreaElement).value).toContain('April 11, 2026')
  })

  it('Employment template body contains DSO name', () => {
    render(<EmailDrafter data={BASE_DATA} />)
    const textareas = screen.getAllByRole('textbox')
    expect((textareas[0] as HTMLTextAreaElement).value).toContain('Jane Smith')
  })

  it('Employment template body contains full name', () => {
    render(<EmailDrafter data={BASE_DATA} />)
    const textareas = screen.getAllByRole('textbox')
    expect((textareas[0] as HTMLTextAreaElement).value).toContain('Wei Chen')
  })
})

describe('EmailDrafter — disclaimer', () => {
  it('shows disclaimer on Employment Status Change template', () => {
    render(<EmailDrafter data={BASE_DATA} />)
    const disclaimers = screen.getAllByText(/Review before sending/)
    expect(disclaimers.length).toBeGreaterThanOrEqual(1)
  })

  it('shows disclaimer on all visible templates', () => {
    render(
      <EmailDrafter
        data={{ ...BASE_DATA, planCActive: true, employmentActive: true, offerAccepted: true }}
      />,
    )
    const disclaimers = screen.getAllByText(/Review before sending/)
    expect(disclaimers.length).toBe(4) // All 4 templates
  })
})

describe('EmailDrafter — copy to clipboard', () => {
  it('clicking Copy calls clipboard.writeText', async () => {
    const user = userEvent.setup()
    // happy-dom's navigator.clipboard is getter-only — use defineProperty with a fresh spy
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      writable: true,
      configurable: true,
    })

    render(<EmailDrafter data={BASE_DATA} />)

    const copyButtons = screen.getAllByRole('button', { name: 'Copy' })
    await user.click(copyButtons[0])

    expect(writeText).toHaveBeenCalledOnce()
    const written = writeText.mock.calls[0][0] as string
    expect(written).toContain('OPT Employment Change')
    expect(written).toContain('Boston University')
  })
})

describe('EmailDrafter — mailto link', () => {
  it('Open in email link encodes subject', () => {
    render(<EmailDrafter data={BASE_DATA} />)
    // aria-label is "Open <heading> in your email client"
    const emailLinks = screen.getAllByRole('link', { name: /in your email client/i })
    const href = emailLinks[0].getAttribute('href') ?? ''
    expect(href).toContain('mailto:')
    expect(href).toContain('OPT%20Employment%20Change')
  })

  it('Open in email link encodes body', () => {
    render(<EmailDrafter data={BASE_DATA} />)
    const emailLinks = screen.getAllByRole('link', { name: /in your email client/i })
    const href = emailLinks[0].getAttribute('href') ?? ''
    expect(href).toContain('body=')
    expect(href).toContain('Boston%20University')
  })
})

describe('EmailDrafter — textarea editing', () => {
  it('editing the textarea updates the value', async () => {
    const user = userEvent.setup()
    render(<EmailDrafter data={BASE_DATA} />)

    const textareas = screen.getAllByRole('textbox')
    const first = textareas[0] as HTMLTextAreaElement

    await user.clear(first)
    await user.type(first, 'Custom body text')

    expect(first.value).toContain('Custom body text')
  })

  it('editing the textarea updates what gets copied', async () => {
    const user = userEvent.setup()
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      writable: true,
      configurable: true,
    })

    render(<EmailDrafter data={BASE_DATA} />)

    const textareas = screen.getAllByRole('textbox')
    await user.clear(textareas[0])
    await user.type(textareas[0], 'My edited body')

    const copyButtons = screen.getAllByRole('button', { name: 'Copy' })
    await user.click(copyButtons[0])

    const written = writeText.mock.calls[0][0] as string
    expect(written).toContain('My edited body')
  })
})
