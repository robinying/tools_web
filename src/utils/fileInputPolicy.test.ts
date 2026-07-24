import { describe, expect, it } from 'vitest'
import {
  IMAGE_FILE_MAX_BYTES,
  IMAGE_MAX_EDGE,
  IMAGE_MAX_PIXELS,
  scaleToMaxEdge,
  validateImageDimensions,
} from './fileInputPolicy'

describe('file input policy', () => {
  it('uses documented byte limits', () => {
    expect(IMAGE_FILE_MAX_BYTES).toBe(25 * 1024 * 1024)
  })

  it('accepts valid image dimensions at configured limits', () => {
    expect(validateImageDimensions({ width: IMAGE_MAX_EDGE, height: 1 })).toBeNull()
    expect(validateImageDimensions({ width: 6_000, height: 4_000 })).toBeNull()
  })

  it('rejects oversized images before expensive processing', () => {
    expect(validateImageDimensions({ width: IMAGE_MAX_EDGE + 1, height: 1 })).toContain('边长')
    expect(validateImageDimensions({ width: 6_000, height: 4_001 }, IMAGE_MAX_PIXELS, 10_000)).toContain('像素')
  })

  it('bounds processing dimensions while retaining aspect ratio', () => {
    expect(scaleToMaxEdge({ width: 4_000, height: 2_000 }, 720)).toEqual({ width: 720, height: 360 })
    expect(scaleToMaxEdge({ width: 300, height: 200 }, 720)).toEqual({ width: 300, height: 200 })
  })
})
