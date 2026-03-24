import { describe, it, expect } from 'vitest'
import { APP_NAME, MAX_UNEMPLOYMENT_DAYS, DAILY_PICKS_DEFAULT } from './constants'

describe('constants', () => {
  it('has correct app name', () => {
    expect(APP_NAME).toBe('SkyeSearch')
  })

  it('has correct unemployment day limit', () => {
    expect(MAX_UNEMPLOYMENT_DAYS).toBe(150)
  })

  it('has correct default daily picks count', () => {
    expect(DAILY_PICKS_DEFAULT).toBe(8)
  })
})
