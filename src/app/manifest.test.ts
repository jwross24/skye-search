import { describe, it, expect } from 'vitest'
import manifest from './manifest'

describe('manifest.json', () => {
  const m = manifest()

  it('has correct app name', () => {
    expect(m.name).toBe('SkyeSearch')
    expect(m.short_name).toBe('SkyeSearch')
  })

  it('starts at /immigration', () => {
    expect(m.start_url).toBe('/immigration')
  })

  it('uses standalone display mode', () => {
    expect(m.display).toBe('standalone')
  })

  it('uses ocean-deep theme color', () => {
    expect(m.theme_color).toBe('#1e3a5f')
  })

  it('includes 192x192 and 512x512 icons', () => {
    const icons = m.icons ?? []
    const sizes = icons.map((i) => i.sizes)
    expect(sizes).toContain('192x192')
    expect(sizes).toContain('512x512')
  })

  it('includes a maskable icon', () => {
    const icons = m.icons ?? []
    const maskable = icons.find((i) => i.purpose === 'maskable')
    expect(maskable).toBeDefined()
    expect(maskable?.sizes).toBe('512x512')
  })

  it('all icons reference PNG files', () => {
    const icons = m.icons ?? []
    for (const icon of icons) {
      expect(icon.type).toBe('image/png')
      expect(icon.src).toMatch(/\.png$/)
    }
  })
})
