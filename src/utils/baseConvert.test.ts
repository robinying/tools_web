import { describe, expect, it } from 'vitest'
import {
  bitLength,
  formatFromBigInt,
  isValidDigits,
  normalizeDigits,
  parseToBigInt,
  toTwosComplementHex,
} from './baseConvert'

describe('normalizeDigits', () => {
  it('strips spaces, underscores and prefixes', () => {
    expect(normalizeDigits('0b1010_1111', 2)).toBe('10101111')
    expect(normalizeDigits('0o755', 8)).toBe('755')
    expect(normalizeDigits('0xFF_ee', 16)).toBe('FFee')
    expect(normalizeDigits(' 1_000 ', 10)).toBe('1000')
  })
})

describe('isValidDigits', () => {
  it('accepts valid digits per radix', () => {
    expect(isValidDigits('1010', 2)).toBe(true)
    expect(isValidDigits('0b1010', 2)).toBe(true)
    expect(isValidDigits('755', 8)).toBe(true)
    expect(isValidDigits('-42', 10)).toBe(true)
    expect(isValidDigits('0xDeadBeef', 16)).toBe(true)
  })

  it('rejects invalid digits', () => {
    expect(isValidDigits('102', 2)).toBe(false)
    expect(isValidDigits('89', 8)).toBe(false)
    expect(isValidDigits('12.3', 10)).toBe(false)
    expect(isValidDigits('GH', 16)).toBe(false)
    expect(isValidDigits('', 10)).toBe(false)
  })
})

describe('parseToBigInt / formatFromBigInt', () => {
  it('round-trips 255 across all radices', () => {
    expect(parseToBigInt('255', 10)).toBe(255n)
    expect(parseToBigInt('11111111', 2)).toBe(255n)
    expect(parseToBigInt('377', 8)).toBe(255n)
    expect(parseToBigInt('FF', 16)).toBe(255n)
    expect(parseToBigInt('0xFF', 16)).toBe(255n)

    expect(formatFromBigInt(255n, 2)).toBe('11111111')
    expect(formatFromBigInt(255n, 8)).toBe('377')
    expect(formatFromBigInt(255n, 10)).toBe('255')
    expect(formatFromBigInt(255n, 16)).toBe('FF')
  })

  it('supports large integers', () => {
    const raw = '123456789012345678901234567890'
    const n = parseToBigInt(raw, 10)
    expect(formatFromBigInt(n, 10)).toBe(raw)
    expect(parseToBigInt(formatFromBigInt(n, 16), 16)).toBe(n)
    expect(parseToBigInt(formatFromBigInt(n, 2), 2)).toBe(n)
  })

  it('handles negative decimal', () => {
    expect(parseToBigInt('-16', 10)).toBe(-16n)
    expect(formatFromBigInt(-16n, 10)).toBe('-16')
  })

  it('groups digits when requested', () => {
    expect(formatFromBigInt(255n, 2, { group: true })).toBe('1111 1111')
    expect(formatFromBigInt(0xdeadbeefn, 16, { group: true, uppercaseHex: true })).toBe(
      'DEAD BEEF',
    )
    expect(formatFromBigInt(1000n, 10, { group: true })).toBe('1 000')
  })

  it('lowercase hex when uppercaseHex is false', () => {
    expect(formatFromBigInt(255n, 16, { uppercaseHex: false })).toBe('ff')
  })
})

describe('bitLength', () => {
  it('returns expected bit lengths', () => {
    expect(bitLength(0n)).toBe(1)
    expect(bitLength(1n)).toBe(1)
    expect(bitLength(255n)).toBe(8)
    expect(bitLength(256n)).toBe(9)
    expect(bitLength(-255n)).toBe(8)
  })
})

describe('toTwosComplementHex', () => {
  it('encodes positive and negative values within range', () => {
    expect(toTwosComplementHex(127n, 8)).toBe('7F')
    expect(toTwosComplementHex(-1n, 8)).toBe('FF')
    expect(toTwosComplementHex(-128n, 8)).toBe('80')
    expect(toTwosComplementHex(255n, 8)).toBeNull()
    expect(toTwosComplementHex(-129n, 8)).toBeNull()
  })

  it('supports 32-bit', () => {
    expect(toTwosComplementHex(-1n, 32)).toBe('FFFFFFFF')
    expect(toTwosComplementHex(1n, 32)).toBe('00000001')
  })
})
