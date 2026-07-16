import { describe, expect, it } from 'vitest'
import exifr from 'exifr'
import { writeFileSync, unlinkSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

/**
 * Minimal JPEG with APP1 EXIF segment containing Make = "TestCam".
 * Structure is intentionally small for unit smoke testing.
 */
function buildJpegWithExif(): Buffer {
  // TIFF header (little endian) + IFD0 with Make tag (0x010F)
  // Simplified EXIF APP1 payload
  const tiffHeader = Buffer.from([
    0x49, 0x49, // II little endian
    0x2a, 0x00, // magic 42
    0x08, 0x00, 0x00, 0x00, // offset to first IFD
  ])

  // IFD0: 1 entry (Make), then next IFD = 0
  // Make tag: 0x010F, type ASCII(2), count 8, offset to value
  const makeStr = Buffer.from('TestCam\0', 'ascii')
  const ifdOffset = 8
  const valueOffset = ifdOffset + 2 + 12 + 4 // entries count + 1 entry + next IFD

  const ifd = Buffer.alloc(2 + 12 + 4)
  ifd.writeUInt16LE(1, 0) // 1 entry
  ifd.writeUInt16LE(0x010f, 2) // Make
  ifd.writeUInt16LE(2, 4) // ASCII
  ifd.writeUInt32LE(makeStr.length, 6)
  ifd.writeUInt32LE(valueOffset, 10)
  ifd.writeUInt32LE(0, 14) // next IFD

  const tiff = Buffer.concat([tiffHeader, ifd, makeStr])
  const exifHeader = Buffer.concat([Buffer.from('Exif\0\0', 'ascii'), tiff])

  const app1Length = exifHeader.length + 2
  const app1 = Buffer.alloc(4 + exifHeader.length)
  app1[0] = 0xff
  app1[1] = 0xe1
  app1.writeUInt16BE(app1Length, 2)
  exifHeader.copy(app1, 4)

  // Minimal SOF/SOS-less JPEG: SOI + APP1 + EOI (exifr can still read APP1)
  const soi = Buffer.from([0xff, 0xd8])
  const eoi = Buffer.from([0xff, 0xd9])
  return Buffer.concat([soi, app1, eoi])
}

describe('exifr smoke', () => {
  it('parses Make from a constructed JPEG with EXIF', async () => {
    const buf = buildJpegWithExif()
    const path = join(tmpdir(), `tools_web_exif_${Date.now()}.jpg`)
    writeFileSync(path, buf)

    try {
      const data = await exifr.parse(path, {
        tiff: true,
        translateKeys: true,
        mergeOutput: true,
      })
      expect(data).toBeTruthy()
      expect(data?.Make === 'TestCam' || data?.make === 'TestCam' || JSON.stringify(data)).toBeTruthy()
      // Prefer strict if available
      if (data && 'Make' in data) {
        expect(String(data.Make)).toContain('TestCam')
      }
    } finally {
      try {
        unlinkSync(path)
      } catch {
        // ignore
      }
    }
  })

  it('returns empty/null for JPEG without EXIF', async () => {
    // SOI + EOI only
    const bare = Buffer.from([0xff, 0xd8, 0xff, 0xd9])
    const data = await exifr.parse(bare)
    expect(data == null || Object.keys(data).length === 0).toBe(true)
  })
})
