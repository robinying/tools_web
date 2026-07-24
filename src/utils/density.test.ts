import { describe, expect, it } from 'vitest'
import {
  buildDensityRows,
  isValidFontScale,
  MAX_FONT_SCALE,
  MIN_FONT_SCALE,
} from './density'

describe('isValidFontScale', () => {
  it('accepts supported boundary values', () => {
    expect(isValidFontScale(MIN_FONT_SCALE)).toBe(true)
    expect(isValidFontScale(1)).toBe(true)
    expect(isValidFontScale(MAX_FONT_SCALE)).toBe(true)
  })

  it('rejects invalid numeric values', () => {
    expect(isValidFontScale(Number.NaN)).toBe(false)
    expect(isValidFontScale(Infinity)).toBe(false)
    expect(isValidFontScale(0)).toBe(false)
    expect(isValidFontScale(-1)).toBe(false)
    expect(isValidFontScale(MIN_FONT_SCALE - 0.01)).toBe(false)
    expect(isValidFontScale(MAX_FONT_SCALE + 0.01)).toBe(false)
  })
})

describe('buildDensityRows', () => {
  it('converts dp and sp at the expected density', () => {
    const rows = buildDensityRows('dp', 16, 1.5)
    expect(rows?.find((row) => row.bucket === 'xxhdpi')).toMatchObject({
      dp: 16,
      px: 48,
      spAsPx: 72,
    })
  })

  it('returns null instead of NaN output for invalid input', () => {
    expect(buildDensityRows('dp', 16, Number.NaN)).toBeNull()
    expect(buildDensityRows('px', Infinity, 1)).toBeNull()
  })
})
