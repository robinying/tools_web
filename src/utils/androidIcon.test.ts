import { describe, expect, it } from 'vitest'
import { calculateIconGeometry, createAdaptiveIconXml, iconFileName, ICON_DENSITIES } from './androidIcon'

describe('Android icon helpers', () => {
  it('defines standard launcher density sizes', () => {
    expect(ICON_DENSITIES.map((item) => item.size)).toEqual([48, 72, 96, 144, 192])
  })

  it('centers a square crop with padding', () => {
    expect(calculateIconGeometry(400, 200, 100, 10)).toEqual({
      sourceX: 100, sourceY: 0, sourceSize: 200, destinationX: 10, destinationY: 10, destinationSize: 80,
    })
  })

  it('normalizes resource file names and adaptive XML', () => {
    expect(iconFileName(' My Icon! ')).toBe('My_Icon_.png')
    expect(createAdaptiveIconXml('ic_launcher', '@color/icon_background')).toContain('@mipmap/ic_launcher_foreground')
  })
})
