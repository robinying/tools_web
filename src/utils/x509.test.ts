import { describe, expect, it } from 'vitest'
import { parseX509Certificate, pemCertificateToDer } from './x509'

function tlv(tag: number, ...content: number[]): number[] {
  return [tag, content.length, ...content]
}

function commonName(name: string): number[] {
  const value = [...new TextEncoder().encode(name)]
  const attribute = tlv(0x30, ...tlv(0x06, 0x55, 0x04, 0x03), ...tlv(0x0c, ...value))
  return tlv(0x30, ...tlv(0x31, ...attribute))
}

function fixtureCertificate(): ArrayBuffer {
  const tbs = tlv(
    0x30,
    ...tlv(0x02, 0x01),
    ...tlv(0x30),
    ...commonName('Issuer'),
    ...tlv(0x30),
    ...commonName('Subject'),
    ...tlv(0x30),
  )
  return new Uint8Array(tlv(0x30, ...tbs, ...tlv(0x30), ...tlv(0x03, 0x00))).buffer
}

describe('X.509 parsing', () => {
  it('parses the issuer and subject from a certificate structure', () => {
    expect(parseX509Certificate(fixtureCertificate())).toEqual({
      issuer: 'Issuer',
      subject: 'Subject',
    })
  })

  it('rejects arbitrary DER and non-certificate PEM labels', () => {
    expect(() => parseX509Certificate(new Uint8Array([0x30, 0x00]).buffer)).toThrow('X.509')
    expect(() => pemCertificateToDer('-----BEGIN PRIVATE KEY-----\nAA==\n-----END PRIVATE KEY-----'))
      .toThrow('BEGIN CERTIFICATE')
  })
})
