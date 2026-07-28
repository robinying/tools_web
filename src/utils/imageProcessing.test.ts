import { describe, expect, it } from 'vitest'
import {
  calculateOutputSize,
  calculateWatermarkPosition,
  getOutputFormatInfo,
  makeOutputFileName,
  normalizeQuality,
} from './imageProcessing'

describe('image processing helpers', () => {
  it('maps output formats to browser MIME types and extensions', () => {
    expect(getOutputFormatInfo('jpeg')).toEqual({
      mimeType: 'image/jpeg',
      extension: 'jpg',
      supportsQuality: true,
    })
    expect(getOutputFormatInfo('png').supportsQuality).toBe(false)
    expect(getOutputFormatInfo('webp').extension).toBe('webp')
  })

  it('bounds lossy quality values', () => {
    expect(normalizeQuality(-1)).toBe(0)
    expect(normalizeQuality(0.72)).toBe(0.72)
    expect(normalizeQuality(2)).toBe(1)
    expect(normalizeQuality(Number.NaN)).toBe(0.8)
  })

  it('preserves aspect ratio without enlarging source images', () => {
    expect(calculateOutputSize({ width: 4_000, height: 2_000 }, 1_000)).toEqual({
      width: 1_000,
      height: 500,
    })
    expect(calculateOutputSize({ width: 300, height: 200 }, 1_000)).toEqual({
      width: 300,
      height: 200,
    })
  })

  it('uses the original dimensions when no maximum edge is requested', () => {
    expect(calculateOutputSize({ width: 640, height: 480 }, 0)).toEqual({ width: 640, height: 480 })
  })

  it('calculates nine watermark placements with a margin', () => {
    const canvas = { width: 1_000, height: 800 }
    const mark = { width: 200, height: 100 }
    expect(calculateWatermarkPosition(canvas, mark, 'top-left', 24)).toEqual({ x: 24, y: 24 })
    expect(calculateWatermarkPosition(canvas, mark, 'center', 24)).toEqual({ x: 400, y: 350 })
    expect(calculateWatermarkPosition(canvas, mark, 'bottom-right', 24)).toEqual({ x: 776, y: 676 })
  })

  it('keeps an oversized watermark within the image bounds', () => {
    expect(
      calculateWatermarkPosition(
        { width: 100, height: 80 },
        { width: 150, height: 40 },
        'bottom-right',
        10,
      ),
    ).toEqual({ x: 0, y: 30 })
  })

  it('creates an export filename from the original stem and output format', () => {
    expect(makeOutputFileName('photo.final.png', '-compressed', 'webp')).toBe('photo.final-compressed.webp')
    expect(makeOutputFileName('image', '-watermarked', 'jpeg')).toBe('image-watermarked.jpg')
  })
})
