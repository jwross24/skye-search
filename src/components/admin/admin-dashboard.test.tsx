import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.stubGlobal('fetch', vi.fn(() =>
  Promise.resolve({ ok: false, json: () => Promise.resolve(null) }),
))

import { AdminDashboard } from './admin-dashboard'

describe('AdminDashboard', () => {
  it('renders the dashboard header', () => {
    render(<AdminDashboard />)
    expect(screen.getByText('Pipeline Dashboard')).toBeTruthy()
  })

  it('shows auto-refresh interval', () => {
    render(<AdminDashboard />)
    expect(screen.getByText('auto-refresh: 30s')).toBeTruthy()
  })
})
