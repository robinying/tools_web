export const MIN_FONT_SCALE = 0.5
export const MAX_FONT_SCALE = 2

export interface DensityRow {
  name: string
  bucket: string
  densityDpi: number
  scale: number
  dp: number
  px: number
  spAsPx: number
}

const densities = [
  { name: 'ldpi', bucket: 'ldpi', densityDpi: 120, scale: 0.75 },
  { name: 'mdpi (基准)', bucket: 'mdpi', densityDpi: 160, scale: 1 },
  { name: 'hdpi', bucket: 'hdpi', densityDpi: 240, scale: 1.5 },
  { name: 'xhdpi', bucket: 'xhdpi', densityDpi: 320, scale: 2 },
  { name: 'xxhdpi', bucket: 'xxhdpi', densityDpi: 480, scale: 3 },
  { name: 'xxxhdpi', bucket: 'xxxhdpi', densityDpi: 640, scale: 4 },
]

export function isValidFontScale(value: number): boolean {
  return Number.isFinite(value) && value >= MIN_FONT_SCALE && value <= MAX_FONT_SCALE
}

export function isValidDensityValue(value: number): boolean {
  return Number.isFinite(value)
}

export function buildDensityRows(
  mode: 'dp' | 'px',
  value: number,
  fontScale: number,
): DensityRow[] | null {
  if (!isValidDensityValue(value) || !isValidFontScale(fontScale)) return null

  return densities.map((density) => {
    if (mode === 'dp') {
      const px = value * density.scale
      return {
        ...density,
        dp: value,
        px: round(px),
        spAsPx: round(px * fontScale),
      }
    }

    const dp = value / density.scale
    return {
      ...density,
      dp: round(dp),
      px: value,
      spAsPx: round(value * fontScale),
    }
  })
}

function round(value: number): number {
  return Math.round(value * 100) / 100
}
