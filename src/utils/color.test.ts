import { describe, expect, it } from 'vitest'
import { parseColor, toAndroidArgb, toHexRgb } from './color'
import { md5Text } from './md5'

describe('color', () => {
  it('parses RRGGBB and AARRGGBB', () => {
    const c = parseColor('#6200EE')
    expect(c).toEqual({ r: 0x62, g: 0x00, b: 0xee, a: 255 })
    expect(toHexRgb(c!)).toBe('#6200EE')
    expect(toAndroidArgb(c!)).toBe('#FF6200EE')

    const a = parseColor('#806200EE')
    expect(a?.a).toBe(0x80)
    expect(a?.r).toBe(0x62)
  })
})

describe('md5', () => {
  it('matches known vector', () => {
    expect(md5Text('')).toBe('d41d8cd98f00b204e9800998ecf8427e')
    expect(md5Text('hello')).toBe('5d41402abc4b2a76b9719d911017c592')
  })
})
