import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { usePWA } from './use-pwa'

function log(step: string, detail: string) {
  process.stdout.write(`  [use-pwa] Step ${step}: ${detail}\n`)
}

// Mock navigator APIs
const mockRegister = vi.fn().mockResolvedValue(undefined)
const mockSetAppBadge = vi.fn().mockResolvedValue(undefined)

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()

  // Mock serviceWorker
  Object.defineProperty(navigator, 'serviceWorker', {
    value: { register: mockRegister },
    configurable: true,
    writable: true,
  })

  // Mock setAppBadge
  Object.defineProperty(navigator, 'setAppBadge', {
    value: mockSetAppBadge,
    configurable: true,
    writable: true,
  })

  // Mock matchMedia for standalone check
  Object.defineProperty(window, 'matchMedia', {
    value: vi.fn().mockReturnValue({ matches: false }),
    configurable: true,
    writable: true,
  })
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('usePWA', () => {
  it('registers service worker on mount', async () => {
    log('1', 'Rendering hook')
    renderHook(() => usePWA())
    log('2', 'Checking SW registration')

    expect(mockRegister).toHaveBeenCalledWith('/sw.js')
  })

  it('sets app badge when daysUsed is provided', async () => {
    log('1', 'Rendering with daysUsed=31')
    renderHook(() => usePWA(31))
    log('2', 'Checking badge API call')

    expect(mockSetAppBadge).toHaveBeenCalledWith(31)
  })

  it('does not set badge when daysUsed is undefined', () => {
    log('1', 'Rendering without daysUsed')
    renderHook(() => usePWA())
    log('2', 'Badge API should not be called')

    expect(mockSetAppBadge).not.toHaveBeenCalled()
  })

  it('updates badge when daysUsed changes', () => {
    log('1', 'Initial render with daysUsed=31')
    const { rerender } = renderHook(({ days }) => usePWA(days), {
      initialProps: { days: 31 },
    })
    expect(mockSetAppBadge).toHaveBeenCalledWith(31)

    log('2', 'Rerender with daysUsed=32')
    rerender({ days: 32 })
    expect(mockSetAppBadge).toHaveBeenCalledWith(32)
    log('3', 'Badge updated correctly')
  })

  it('tracks visit count in localStorage', () => {
    log('1', 'First visit')
    renderHook(() => usePWA())
    expect(localStorage.getItem('skye-pwa-visits')).toBe('1')

    log('2', 'Second visit')
    renderHook(() => usePWA())
    expect(localStorage.getItem('skye-pwa-visits')).toBe('2')
    log('3', 'Visit count incremented')
  })

  it('does not show install prompt before 3 visits', () => {
    log('1', 'First visit — canInstall should be false')
    const { result } = renderHook(() => usePWA())
    expect(result.current.canInstall).toBe(false)
    log('2', 'Correct: no premature install prompt')
  })

  it('detects standalone mode as installed', () => {
    log('1', 'Setting standalone matchMedia')
    Object.defineProperty(window, 'matchMedia', {
      value: vi.fn().mockReturnValue({ matches: true }),
      configurable: true,
    })

    const { result } = renderHook(() => usePWA())
    log('2', `isInstalled=${result.current.isInstalled}`)
    expect(result.current.isInstalled).toBe(true)
  })

  it('handles beforeinstallprompt event after 3 visits', () => {
    log('1', 'Simulating 3 prior visits')
    localStorage.setItem('skye-pwa-visits', '2') // Will become 3 on next render

    const { result } = renderHook(() => usePWA())

    log('2', 'Dispatching beforeinstallprompt')
    const mockPrompt = vi.fn().mockResolvedValue(undefined)
    const event = new Event('beforeinstallprompt', { cancelable: true })
    Object.defineProperties(event, {
      prompt: { value: mockPrompt },
      userChoice: { value: Promise.resolve({ outcome: 'accepted' }) },
    })

    act(() => {
      window.dispatchEvent(event)
    })

    log('3', `canInstall=${result.current.canInstall}`)
    expect(result.current.canInstall).toBe(true)
  })

  it('dismissInstall sets flag in localStorage', () => {
    log('1', 'Calling dismissInstall')
    const { result } = renderHook(() => usePWA())
    act(() => result.current.dismissInstall())

    log('2', 'Checking localStorage')
    expect(localStorage.getItem('skye-pwa-install-dismissed')).toBe('true')
    expect(result.current.canInstall).toBe(false)
  })

  it('gracefully handles missing setAppBadge', () => {
    log('1', 'Removing setAppBadge from navigator')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (navigator as any).setAppBadge

    log('2', 'Rendering with daysUsed — should not throw')
    expect(() => renderHook(() => usePWA(50))).not.toThrow()
  })

  it('gracefully handles missing serviceWorker', () => {
    log('1', 'Removing serviceWorker from navigator')
    Object.defineProperty(navigator, 'serviceWorker', {
      value: undefined,
      configurable: true,
    })

    log('2', 'Rendering — should not throw')
    expect(() => renderHook(() => usePWA())).not.toThrow()
  })
})
