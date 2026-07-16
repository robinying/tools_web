export type Radix = 2 | 8 | 10 | 16

export const RADIX_LABELS: Record<Radix, string> = {
  2: '二进制 (Bin)',
  8: '八进制 (Oct)',
  10: '十进制 (Dec)',
  16: '十六进制 (Hex)',
}

export const RADIX_PREFIX: Record<Radix, string> = {
  2: '0b',
  8: '0o',
  10: '',
  16: '0x',
}

/** Normalize user input: strip whitespace, optional 0b/0o/0x prefixes, underscores. */
export function normalizeDigits(raw: string, radix: Radix): string {
  let s = raw.trim().replace(/[\s_]/g, '')
  if (!s) return ''

  const lower = s.toLowerCase()
  if (lower.startsWith('0b') && radix === 2) s = s.slice(2)
  else if (lower.startsWith('0o') && radix === 8) s = s.slice(2)
  else if (lower.startsWith('0x') && radix === 16) s = s.slice(2)

  return s
}

const DIGIT_RE: Record<Radix, RegExp> = {
  2: /^[01]+$/i,
  8: /^[0-7]+$/i,
  10: /^[+-]?\d+$/,
  16: /^[0-9a-f]+$/i,
}

export function isValidDigits(raw: string, radix: Radix): boolean {
  const s = normalizeDigits(raw, radix)
  if (!s) return false
  return DIGIT_RE[radix].test(s)
}

export function parseToBigInt(raw: string, radix: Radix): bigint {
  const s = normalizeDigits(raw, radix)
  if (!s) throw new Error('空输入')
  if (!isValidDigits(raw, radix)) {
    throw new Error(`不是合法的 ${RADIX_LABELS[radix]} 数字`)
  }

  if (radix === 10) {
    return BigInt(s)
  }

  // BigInt('0b…') / BigInt('0o…') / BigInt('0x…')
  const prefix = RADIX_PREFIX[radix]
  return BigInt(prefix + s)
}

export function formatFromBigInt(value: bigint, radix: Radix, options?: {
  group?: boolean
  uppercaseHex?: boolean
}): string {
  const group = options?.group ?? false
  const uppercaseHex = options?.uppercaseHex ?? true

  let abs = value < 0n ? -value : value
  let out = abs.toString(radix)
  if (radix === 16 && uppercaseHex) out = out.toUpperCase()

  if (group) {
    if (radix === 2) out = groupEvery(out, 4)
    else if (radix === 16) out = groupEvery(out, 4)
    else if (radix === 8) out = groupEvery(out, 3)
    else out = groupEvery(out, 3)
  }

  if (value < 0n && radix === 10) return `-${out}`
  if (value < 0n) return `-${out}` // rare; other radices usually unsigned in UI
  return out
}

function groupEvery(s: string, n: number): string {
  const chars = s.split('')
  const parts: string[] = []
  while (chars.length) {
    parts.unshift(chars.splice(-n).join(''))
  }
  return parts.join(' ')
}

/** Bit length of absolute value (0 → 1). */
export function bitLength(value: bigint): number {
  const abs = value < 0n ? -value : value
  if (abs === 0n) return 1
  return abs.toString(2).length
}

/** Two's complement hex for common bit widths when value fits. */
export function toTwosComplementHex(value: bigint, bits: 8 | 16 | 32 | 64): string | null {
  const max = 1n << BigInt(bits)
  const half = max >> 1n
  if (value >= half || value < -half) return null
  const unsigned = value < 0n ? max + value : value
  return unsigned.toString(16).toUpperCase().padStart(bits / 4, '0')
}
