import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PWAProvider } from './pwa-provider'

function log(step: string, detail: string) {
  process.stdout.write(`  [pwa-provider] Step ${step}: ${detail}\n`)
}

// Mock usePWA hook
const mockPromptInstall = vi.fn()
const mockDismissInstall = vi.fn()

vi.mock('@/hooks/use-pwa', () => ({
  usePWA: vi.fn(() => ({
    canInstall: false,
    isInstalled: false,
    promptInstall: mockPromptInstall,
    dismissInstall: mockDismissInstall,
  })),
}))

import { usePWA } from '@/hooks/use-pwa'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('PWAProvider', () => {
  it('renders children without install banner by default', () => {
    log('1', 'Rendering with canInstall=false')
    render(
      <PWAProvider>
        <div>App Content</div>
      </PWAProvider>
    )

    log('2', 'Children rendered, no install banner')
    expect(screen.getByText('App Content')).toBeInTheDocument()
    expect(screen.queryByText('Keep SkyeSearch on your home screen')).not.toBeInTheDocument()
  })

  it('shows install banner when canInstall is true', () => {
    log('1', 'Setting canInstall=true')
    vi.mocked(usePWA).mockReturnValue({
      canInstall: true,
      isInstalled: false,
      promptInstall: mockPromptInstall,
      dismissInstall: mockDismissInstall,
    })

    render(
      <PWAProvider>
        <div>App Content</div>
      </PWAProvider>
    )

    log('2', 'Install banner visible with correct ARIA role')
    expect(screen.getByText('Keep SkyeSearch on your home screen')).toBeInTheDocument()
    expect(screen.getByText('Install')).toBeInTheDocument()
    expect(screen.getByText('Not now')).toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: 'Install SkyeSearch' })).toBeInTheDocument()
  })

  it('calls promptInstall when Install is clicked', async () => {
    log('1', 'Setting up install banner')
    vi.mocked(usePWA).mockReturnValue({
      canInstall: true,
      isInstalled: false,
      promptInstall: mockPromptInstall,
      dismissInstall: mockDismissInstall,
    })

    render(
      <PWAProvider>
        <div>App Content</div>
      </PWAProvider>
    )

    log('2', 'Clicking Install button')
    await userEvent.click(screen.getByText('Install'))
    expect(mockPromptInstall).toHaveBeenCalled()
    log('3', 'promptInstall called')
  })

  it('calls dismissInstall when Not now is clicked', async () => {
    log('1', 'Setting up install banner')
    vi.mocked(usePWA).mockReturnValue({
      canInstall: true,
      isInstalled: false,
      promptInstall: mockPromptInstall,
      dismissInstall: mockDismissInstall,
    })

    render(
      <PWAProvider>
        <div>App Content</div>
      </PWAProvider>
    )

    log('2', 'Clicking Not now')
    await userEvent.click(screen.getByText('Not now'))
    expect(mockDismissInstall).toHaveBeenCalled()
    log('3', 'dismissInstall called')
  })

  it('shows warm copy in install banner', () => {
    log('1', 'Checking UX copy')
    vi.mocked(usePWA).mockReturnValue({
      canInstall: true,
      isInstalled: false,
      promptInstall: mockPromptInstall,
      dismissInstall: mockDismissInstall,
    })

    render(
      <PWAProvider>
        <div />
      </PWAProvider>
    )

    log('2', 'Checking description text')
    expect(
      screen.getByText(/One tap to your immigration dashboard/)
    ).toBeInTheDocument()
  })
})
