export interface Rgba {
  r: number
  g: number
  b: number
  a: number // 0–255
}

/** Parse #RGB #RRGGBB #AARRGGBB #RRGGBBAA (with optional 0x / #) */
export function parseColor(raw: string): Rgba | null {
  let s = raw.trim().replace(/^#/, '').replace(/^0x/i, '')
  if (!s) return null
  if (!/^[0-9a-fA-F]+$/.test(s)) return null

  if (s.length === 3) {
    s = s
      .split('')
      .map((c) => c + c)
      .join('')
  }

  if (s.length === 6) {
    return {
      r: parseInt(s.slice(0, 2), 16),
      g: parseInt(s.slice(2, 4), 16),
      b: parseInt(s.slice(4, 6), 16),
      a: 255,
    }
  }

  if (s.length === 8) {
    // Prefer Android AARRGGBB when alpha looks like leading byte usage;
    // also accept CSS RRGGBBAA via toggle in UI — default Android.
    return {
      a: parseInt(s.slice(0, 2), 16),
      r: parseInt(s.slice(2, 4), 16),
      g: parseInt(s.slice(4, 6), 16),
      b: parseInt(s.slice(6, 8), 16),
    }
  }

  return null
}

export function parseColorCssRgba(raw: string): Rgba | null {
  let s = raw.trim().replace(/^#/, '').replace(/^0x/i, '')
  if (s.length !== 8 || !/^[0-9a-fA-F]+$/.test(s)) return null
  return {
    r: parseInt(s.slice(0, 2), 16),
    g: parseInt(s.slice(2, 4), 16),
    b: parseInt(s.slice(4, 6), 16),
    a: parseInt(s.slice(6, 8), 16),
  }
}

function hex2(n: number): string {
  return Math.max(0, Math.min(255, n | 0))
    .toString(16)
    .toUpperCase()
    .padStart(2, '0')
}

export function toHexRgb(c: Rgba): string {
  return `#${hex2(c.r)}${hex2(c.g)}${hex2(c.b)}`
}

export function toAndroidArgb(c: Rgba): string {
  return `#${hex2(c.a)}${hex2(c.r)}${hex2(c.g)}${hex2(c.b)}`
}

export function toCssRgbaHex(c: Rgba): string {
  return `#${hex2(c.r)}${hex2(c.g)}${hex2(c.b)}${hex2(c.a)}`
}

export function toCssRgba(c: Rgba): string {
  const a = Math.round((c.a / 255) * 1000) / 1000
  return `rgba(${c.r}, ${c.g}, ${c.b}, ${a})`
}

export function toAndroidColorInt(c: Rgba): string {
  // signed 32-bit style display
  const u = ((c.a << 24) | (c.r << 16) | (c.g << 8) | c.b) >>> 0
  const signed = u > 0x7fffffff ? u - 0x100000000 : u
  return `${signed} (0x${u.toString(16).toUpperCase().padStart(8, '0')})`
}
