interface DerElement {
  tag: number
  start: number
  contentStart: number
  end: number
}

export interface ParsedCertificate {
  subject: string
  issuer: string
}

function readElement(bytes: Uint8Array, start: number): DerElement {
  if (start + 2 > bytes.length) throw new Error('DER 数据不完整')
  const tag = bytes[start]!
  let cursor = start + 1
  const firstLength = bytes[cursor++]!
  let length: number
  if (firstLength === 0x80) throw new Error('DER 不允许不定长编码')
  if (firstLength < 0x80) {
    length = firstLength
  } else {
    const lengthBytes = firstLength & 0x7f
    if (!lengthBytes || lengthBytes > 4 || cursor + lengthBytes > bytes.length) {
      throw new Error('DER 长度编码无效')
    }
    length = 0
    for (let index = 0; index < lengthBytes; index++) {
      const octet = bytes[cursor++]!
      if (index === 0 && octet === 0) throw new Error('DER 长度编码无效')
      length = (length << 8) | octet
    }
    if (length < 0x80) throw new Error('DER 长度未使用最短编码')
  }
  const end = cursor + length
  if (end > bytes.length) throw new Error('DER 数据不完整')
  return { tag, start, contentStart: cursor, end }
}

function childElements(bytes: Uint8Array, parent: DerElement): DerElement[] {
  const children: DerElement[] = []
  let cursor = parent.contentStart
  while (cursor < parent.end) {
    const child = readElement(bytes, cursor)
    children.push(child)
    cursor = child.end
  }
  if (cursor !== parent.end) throw new Error('DER 容器长度无效')
  return children
}

function decodeString(bytes: Uint8Array, element: DerElement): string {
  const content = bytes.slice(element.contentStart, element.end)
  if (element.tag === 0x1e) {
    if (content.length % 2) throw new Error('BMPString 长度无效')
    let output = ''
    for (let index = 0; index < content.length; index += 2) {
      output += String.fromCharCode((content[index]! << 8) | content[index + 1]!)
    }
    return output
  }
  if (![0x0c, 0x13, 0x14, 0x16].includes(element.tag)) {
    throw new Error('证书名称编码不受支持')
  }
  return new TextDecoder('utf-8', { fatal: false }).decode(content)
}

function isCommonNameOid(bytes: Uint8Array, element: DerElement): boolean {
  const oid = bytes.slice(element.contentStart, element.end)
  return oid.length === 3 && oid[0] === 0x55 && oid[1] === 0x04 && oid[2] === 0x03
}

function parseDistinguishedName(bytes: Uint8Array, name: DerElement): string {
  if (name.tag !== 0x30) throw new Error('证书名称结构无效')
  const names: string[] = []
  for (const relativeName of childElements(bytes, name)) {
    if (relativeName.tag !== 0x31) throw new Error('证书名称集合无效')
    for (const attribute of childElements(bytes, relativeName)) {
      if (attribute.tag !== 0x30) throw new Error('证书属性结构无效')
      const values = childElements(bytes, attribute)
      if (values.length !== 2 || values[0]!.tag !== 0x06) throw new Error('证书属性无效')
      if (isCommonNameOid(bytes, values[0]!)) names.push(decodeString(bytes, values[1]!))
    }
  }
  return names.join(', ') || '（未声明 CN）'
}

export function parseX509Certificate(der: ArrayBuffer): ParsedCertificate {
  const bytes = new Uint8Array(der)
  const certificate = readElement(bytes, 0)
  if (certificate.tag !== 0x30 || certificate.end !== bytes.length) {
    throw new Error('不是完整的 DER X.509 证书')
  }

  const certificateFields = childElements(bytes, certificate)
  if (
    certificateFields.length !== 3 ||
    certificateFields[0]!.tag !== 0x30 ||
    certificateFields[1]!.tag !== 0x30 ||
    certificateFields[2]!.tag !== 0x03 ||
    certificateFields[2]!.contentStart >= certificateFields[2]!.end ||
    bytes[certificateFields[2]!.contentStart] !== 0
  ) {
    throw new Error('不是有效的 X.509 Certificate 结构')
  }

  const tbsFields = childElements(bytes, certificateFields[0]!)
  let index = tbsFields[0]?.tag === 0xa0 ? 1 : 0
  const requiredTags = [0x02, 0x30, 0x30, 0x30, 0x30, 0x30]
  if (tbsFields.length < index + requiredTags.length) {
    throw new Error('证书必填字段不完整')
  }
  for (const tag of requiredTags) {
    if (tbsFields[index++]!.tag !== tag) throw new Error('证书字段类型无效')
  }

  const issuer = parseDistinguishedName(bytes, tbsFields[(tbsFields[0]?.tag === 0xa0 ? 1 : 0) + 2]!)
  const subject = parseDistinguishedName(bytes, tbsFields[(tbsFields[0]?.tag === 0xa0 ? 1 : 0) + 4]!)
  return { subject, issuer }
}

function decodeBase64(base64: string): ArrayBuffer {
  const compact = base64.replace(/\s+/g, '')
  if (!compact || compact.length % 4 || !/^[A-Za-z0-9+/]*={0,2}$/.test(compact)) {
    throw new Error('Base64 证书编码无效')
  }
  const binary = atob(compact)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index)
  return bytes.buffer
}

export function pemCertificateToDer(input: string): { type: string; der: ArrayBuffer } {
  const text = input.trim()
  if (/^-----BEGIN /m.test(text)) {
    const pem = text.match(/^-----BEGIN CERTIFICATE-----\s*([A-Za-z0-9+/=\s]+?)\s*-----END CERTIFICATE-----$/)
    if (!pem) throw new Error('请粘贴 BEGIN CERTIFICATE 格式的 PEM')
    return { type: 'X.509 PEM', der: decodeBase64(pem[1]!) }
  }
  return { type: 'X.509 DER (Base64)', der: decodeBase64(text) }
}
