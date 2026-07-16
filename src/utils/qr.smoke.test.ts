import { describe, expect, it } from 'vitest'
import QRCode from 'qrcode'
import jsQR from 'jsqr'
import { PNG } from 'pngjs'

async function dataUrlToRgba(dataUrl: string): Promise<{
  data: Uint8ClampedArray
  width: number
  height: number
}> {
  const b64 = dataUrl.split(',')[1]
  if (!b64) throw new Error('invalid data url')
  const buf = Buffer.from(b64, 'base64')
  const png = PNG.sync.read(buf)
  return {
    data: new Uint8ClampedArray(png.data),
    width: png.width,
    height: png.height,
  }
}

describe('qr generate + decode smoke', () => {
  it('round-trips a URL payload', async () => {
    const payload = 'https://android-lab.local/deep?x=1'
    const dataUrl = await QRCode.toDataURL(payload, {
      width: 320,
      margin: 2,
      errorCorrectionLevel: 'M',
    })
    expect(dataUrl.startsWith('data:image/png')).toBe(true)

    const { data, width, height } = await dataUrlToRgba(dataUrl)
    const code = jsQR(data, width, height, { inversionAttempts: 'attemptBoth' })
    expect(code).toBeTruthy()
    expect(code?.data).toBe(payload)
  })

  it('round-trips plain text and chinese', async () => {
    const payload = 'Android Lab 二维码测试'
    const dataUrl = await QRCode.toDataURL(payload, {
      width: 280,
      margin: 2,
      errorCorrectionLevel: 'M',
    })
    const { data, width, height } = await dataUrlToRgba(dataUrl)
    const code = jsQR(data, width, height, { inversionAttempts: 'attemptBoth' })
    expect(code?.data).toBe(payload)
  })

  it('rejects empty content', async () => {
    await expect(QRCode.toDataURL('', { width: 128 })).rejects.toBeTruthy()
  })
})
