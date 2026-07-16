import { describe, expect, it } from 'vitest'

/** Mirror of DpSpPxView conversion formulas for regression safety. */
function dpToPx(dp: number, scale: number): number {
  return Math.round(dp * scale * 100) / 100
}

function pxToDp(px: number, scale: number): number {
  return Math.round((px / scale) * 100) / 100
}

function spToPx(sp: number, scale: number, fontScale: number): number {
  return Math.round(sp * scale * fontScale * 100) / 100
}

describe('dp/sp/px formulas', () => {
  it('mdpi: 1dp = 1px', () => {
    expect(dpToPx(16, 1)).toBe(16)
    expect(pxToDp(16, 1)).toBe(16)
  })

  it('xxhdpi: 16dp = 48px', () => {
    expect(dpToPx(16, 3)).toBe(48)
    expect(pxToDp(48, 3)).toBe(16)
  })

  it('applies fontScale for sp', () => {
    expect(spToPx(16, 2, 1)).toBe(32)
    expect(spToPx(16, 2, 1.5)).toBe(48)
  })
})
