import { md5Bytes, md5Text } from './md5'

export type HashAlgo = 'MD5' | 'SHA-1' | 'SHA-256'

function toHex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export async function hashText(algo: HashAlgo, text: string): Promise<string> {
  if (algo === 'MD5') return md5Text(text)
  const data = new TextEncoder().encode(text)
  const subtleAlgo = algo === 'SHA-1' ? 'SHA-1' : 'SHA-256'
  const dig = await crypto.subtle.digest(subtleAlgo, data)
  return toHex(dig)
}

export async function hashBytes(algo: HashAlgo, bytes: ArrayBuffer): Promise<string> {
  if (algo === 'MD5') return md5Bytes(new Uint8Array(bytes))
  const subtleAlgo = algo === 'SHA-1' ? 'SHA-1' : 'SHA-256'
  const dig = await crypto.subtle.digest(subtleAlgo, bytes)
  return toHex(dig)
}
