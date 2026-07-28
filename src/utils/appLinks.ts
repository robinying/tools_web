import { quotePosixShellArg } from './adbCommand'

const PACKAGE_RE = /^[A-Za-z][A-Za-z0-9_]*(?:\.[A-Za-z][A-Za-z0-9_]*)+$/
const FINGERPRINT_RE = /^[A-Fa-f0-9]{2}(?::[A-Fa-f0-9]{2}){31}$/

export interface AppLinksCommands {
  launch: string
  status: string
  reverify: string | null
  reset: string
  dumpsys: string
}

export interface AssetLinksResult {
  valid: boolean
  errors: string[]
  warnings: string[]
  entries: number
}

export interface AppLinkStatus {
  domain: string
  status: string
}

export function validateAppLinksInput(urlText: string, packageName: string): string | null {
  try {
    const url = new URL(urlText.trim())
    if (!/^https?:$/.test(url.protocol) || !url.hostname) return '链接必须是带主机名的 HTTP 或 HTTPS URL'
  } catch { return '链接必须是完整且合法的 URL' }
  return PACKAGE_RE.test(packageName.trim()) ? null : '请输入合法 Android 包名'
}

export function buildAppLinksCommands(url: string, packageName: string, apiLevel: number): AppLinksCommands {
  const safeUrl = quotePosixShellArg(url.trim())
  const safePackage = quotePosixShellArg(packageName.trim())
  return {
    launch: `adb shell am start -W -a android.intent.action.VIEW -c android.intent.category.BROWSABLE -d ${safeUrl}`,
    status: `adb shell pm get-app-links --user cur ${safePackage}`,
    reverify: apiLevel >= 31 ? `adb shell pm verify-app-links --re-verify ${safePackage}` : null,
    reset: apiLevel >= 31 ? `adb shell pm set-app-links --user cur --package ${safePackage} 0 all` : `adb shell pm clear ${safePackage}`,
    dumpsys: `adb shell dumpsys package ${safePackage}`,
  }
}

export function validateAssetLinks(text: string): AssetLinksResult {
  let value: unknown
  try { value = JSON.parse(text) } catch { return { valid: false, errors: ['assetlinks.json 不是合法 JSON 数组。'], warnings: [], entries: 0 } }
  if (!Array.isArray(value)) return { valid: false, errors: ['assetlinks.json 根节点必须是数组。'], warnings: [], entries: 0 }
  const errors: string[] = []
  const warnings: string[] = []
  value.forEach((entry, index) => {
    if (!entry || typeof entry !== 'object') { errors.push(`第 ${index + 1} 项不是对象。`); return }
    const object = entry as Record<string, unknown>
    const relation = object.relation
    const target = object.target as Record<string, unknown> | undefined
    if (!Array.isArray(relation) || !relation.includes('delegate_permission/common.handle_all_urls')) {
      warnings.push(`第 ${index + 1} 项未声明 delegate_permission/common.handle_all_urls。`)
    }
    if (!target || target.namespace !== 'android_app' || typeof target.package_name !== 'string') {
      errors.push(`第 ${index + 1} 项缺少 android_app target.package_name。`)
      return
    }
    const fingerprints = target.sha256_cert_fingerprints
    if (!Array.isArray(fingerprints) || !fingerprints.length || fingerprints.some((item) => typeof item !== 'string' || !FINGERPRINT_RE.test(item))) {
      errors.push(`第 ${index + 1} 项缺少合法 SHA-256 证书指纹。`)
    }
  })
  return { valid: !errors.length, errors, warnings, entries: value.length }
}

export function parseAppLinksStatus(text: string): AppLinkStatus[] {
  const rows: AppLinkStatus[] = []
  for (const line of text.split(/\r?\n/)) {
    const match = line.trim().match(/^([\w.-]+\.[\w.-]+)\s*:\s*(.+)$/)
    if (match) rows.push({ domain: match[1], status: match[2].trim() })
  }
  return rows
}
