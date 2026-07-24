export interface LogcatOptions {
  packageName: string
  tags: string
  priority: string
  buffer: string
  usePid: boolean
  clearFirst: boolean
}

export interface IntentOptions {
  action: string
  dataUri: string
  packageName: string
  component: string
  category: string
  extras: string
  flags: string
}

export interface IntentCommandResult {
  command: string
  error: string | null
}

export interface IntentUriResult {
  uri: string
  error: string | null
}

const PACKAGE_NAME_RE = /^[A-Za-z][A-Za-z0-9_]*(?:\.[A-Za-z][A-Za-z0-9_]*)+$/
const LOG_TAG_RE = /^[A-Za-z0-9_.-]+$/
const FLAG_RE = /^(?:0x[0-9a-fA-F]+|\d+)$/
const BUFFER_VALUES = new Set(['main', 'system', 'crash', 'all'])

export function quotePosixShellArg(value: string): string {
  return `'${value.replace(/'/g, "'\\''")}'`
}

export function buildTagFilter(tags: string, priority: string): string {
  const rawTags = tags
    .split(/[,，\s]+/)
    .map((tag) => tag.trim())
    .filter(Boolean)
  if (!rawTags.length || rawTags.some((tag) => !LOG_TAG_RE.test(tag))) return '*:V'
  return `${rawTags.map((tag) => `${tag}:${priority}`).join(' ')} *:S`
}

export function buildLogcatCommand(options: LogcatOptions): string {
  const filters = buildTagFilter(options.tags, options.priority)
  const selectedBuffer = BUFFER_VALUES.has(options.buffer) ? options.buffer : 'main'
  const prefix = options.clearFirst ? 'adb logcat -c && ' : ''

  if (options.usePid && PACKAGE_NAME_RE.test(options.packageName.trim())) {
    const packageName = quotePosixShellArg(options.packageName.trim())
    const args = [
      'adb logcat',
      `--pid="$(adb shell pidof -s ${packageName})"`,
    ]
    if (selectedBuffer !== 'main') args.push(`-b ${selectedBuffer}`)
    args.push(filters)
    return prefix + args.join(' ')
  }

  const args = ['adb logcat']
  if (selectedBuffer !== 'main') args.push(`-b ${selectedBuffer}`)
  args.push(filters)
  return prefix + args.join(' ')
}

export function getLogcatPackageError(options: Pick<LogcatOptions, 'packageName' | 'usePid'>): string | null {
  if (!options.usePid || !options.packageName.trim()) return null
  return PACKAGE_NAME_RE.test(options.packageName.trim()) ? null : '请输入合法 Android 包名以启用 PID 过滤'
}

function parseExtras(raw: string): Array<{ key: string; value: string }> {
  return raw.split('\n').flatMap((line) => {
    const trimmed = line.trim()
    const separator = trimmed.indexOf('=')
    if (!trimmed || separator < 1) return []
    return [{
      key: trimmed.slice(0, separator).trim(),
      value: trimmed.slice(separator + 1).trim(),
    }]
  })
}

function parseIntentFlags(flags: string): string | null {
  const trimmed = flags.trim()
  if (!trimmed) return null
  return FLAG_RE.test(trimmed) ? trimmed : null
}

export function buildAmStartCommand(options: IntentOptions): IntentCommandResult {
  const invalidFlags = options.flags.trim() && !parseIntentFlags(options.flags)
  if (invalidFlags) {
    return { command: '', error: 'Intent flag 必须是十进制或 0x 开头的十六进制数值' }
  }

  const args = ['am', 'start']
  const pushOption = (flag: string, value: string) => {
    if (value.trim()) args.push(flag, quotePosixShellArg(value.trim()))
  }

  pushOption('-a', options.action)
  pushOption('-d', options.dataUri)
  pushOption('-c', options.category)
  if (options.component.trim()) pushOption('-n', options.component)
  else if (options.packageName.trim()) args.push(quotePosixShellArg(options.packageName.trim()))

  for (const { key, value } of parseExtras(options.extras)) {
    args.push('--es', quotePosixShellArg(key), quotePosixShellArg(value))
  }

  const flags = parseIntentFlags(options.flags)
  if (flags) args.push('-f', flags)
  return { command: `adb shell ${args.join(' ')}`, error: null }
}

function encodeIntentValue(value: string): string {
  return encodeURIComponent(value)
}

export function buildIntentUri(options: IntentOptions): IntentUriResult {
  const invalidFlags = options.flags.trim() && !parseIntentFlags(options.flags)
  if (invalidFlags) {
    return { uri: '', error: 'Intent flag 必须是十进制或 0x 开头的十六进制数值' }
  }

  const rawUri = options.dataUri.trim()
  let url: URL
  try {
    url = new URL(rawUri)
  } catch {
    return { uri: '', error: 'Data URI 必须是完整且合法的 URL' }
  }

  if (!url.host || !url.protocol || !/^https?:$/.test(url.protocol)) {
    return { uri: '', error: 'Data URI 仅支持带主机名的 HTTP 或 HTTPS URL' }
  }

  const hostPath = `${url.host}${url.pathname}${url.search}${url.hash}`
  const segments = [`intent://${hostPath}#Intent`, `scheme=${encodeIntentValue(url.protocol.slice(0, -1))}`]
  const append = (name: string, value: string) => {
    if (value.trim()) segments.push(`${name}=${encodeIntentValue(value.trim())}`)
  }

  append('action', options.action)
  append('package', options.packageName)
  append('component', options.component)
  append('category', options.category)
  for (const { key, value } of parseExtras(options.extras)) {
    segments.push(`S.${encodeIntentValue(key)}=${encodeIntentValue(value)}`)
  }

  const flags = parseIntentFlags(options.flags)
  if (flags) segments.push(`launchFlags=${flags}`)
  segments.push('end')
  return { uri: segments.join(';'), error: null }
}
