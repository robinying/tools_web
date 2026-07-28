export type FindingSeverity = 'high' | 'medium' | 'low' | 'info'
export type FindingScope = 'manifest' | 'review' | 'compatibility'

export interface ManifestFinding {
  severity: FindingSeverity
  scope: FindingScope
  title: string
  detail: string
  location: string
}

export interface ManifestSummary {
  packageName: string
  components: number
  permissions: string[]
}

export interface ManifestSecurityResult {
  findings: ManifestFinding[]
  summary: ManifestSummary
}

interface XmlNode {
  name: string
  attributes: Record<string, string>
  children: XmlNode[]
}

const DANGEROUS_PERMISSIONS = new Set([
  'android.permission.CAMERA',
  'android.permission.RECORD_AUDIO',
  'android.permission.ACCESS_FINE_LOCATION',
  'android.permission.ACCESS_COARSE_LOCATION',
  'android.permission.READ_CONTACTS',
  'android.permission.WRITE_CONTACTS',
  'android.permission.READ_MEDIA_IMAGES',
  'android.permission.POST_NOTIFICATIONS',
])

function parseAttributes(source: string): Record<string, string> {
  const attributes: Record<string, string> = {}
  const attributeRe = /([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g
  let match: RegExpExecArray | null
  while ((match = attributeRe.exec(source))) {
    attributes[match[1]] = match[2] ?? match[3] ?? ''
  }
  return attributes
}

function parseManifestXml(xml: string): XmlNode {
  const root: XmlNode = { name: '__root__', attributes: {}, children: [] }
  const stack = [root]
  const tagRe = /<!--[\s\S]*?-->|<\?[^>]*\?>|<![^>]*>|<[^>]+>/g
  let match: RegExpExecArray | null
  while ((match = tagRe.exec(xml))) {
    const tag = match[0]
    if (tag.startsWith('<!--') || tag.startsWith('<?') || tag.startsWith('<!')) continue
    if (tag.startsWith('</')) {
      const closingName = tag.slice(2, -1).trim()
      const current = stack.pop()
      if (!current || current.name !== closingName) throw new Error('AndroidManifest XML 标签未正确闭合')
      continue
    }
    const selfClosing = /\/\s*>$/.test(tag)
    const nameMatch = tag.match(/^<([\w:-]+)/)
    if (!nameMatch) throw new Error('AndroidManifest XML 包含无法识别的标签')
    const node: XmlNode = {
      name: nameMatch[1],
      attributes: parseAttributes(tag),
      children: [],
    }
    stack[stack.length - 1].children.push(node)
    if (!selfClosing) stack.push(node)
  }
  if (stack.length !== 1 || root.children.length !== 1) throw new Error('AndroidManifest XML 解析失败')
  return root.children[0]
}

function androidAttribute(element: XmlNode, name: string): string {
  return element.attributes[`android:${name}`] ?? element.attributes[name] ?? ''
}

function addFinding(findings: ManifestFinding[], finding: ManifestFinding) {
  findings.push(finding)
}

export function analyzeManifest(xml: string): ManifestSecurityResult {
  const manifest = parseManifestXml(xml)
  if (manifest.name !== 'manifest') throw new Error('根元素必须是 manifest')
  const findings: ManifestFinding[] = []
  const application = manifest.children.find((element) => element.name === 'application') ?? null
  const packageName = manifest.attributes.package ?? ''
  const permissions = manifest.children
    .filter((element) => element.name === 'uses-permission')
    .map((element) => androidAttribute(element, 'name'))
    .filter(Boolean)

  if (!application) {
    addFinding(findings, {
      severity: 'high',
      scope: 'manifest',
      title: '缺少 application 节点',
      detail: 'Manifest 没有 application 节点，无法继续检查组件配置。',
      location: 'manifest',
    })
    return { findings, summary: { packageName, components: 0, permissions } }
  }

  const debuggable = androidAttribute(application, 'debuggable')
  if (debuggable === 'true') {
    addFinding(findings, {
      severity: 'high', scope: 'manifest', title: 'Debuggable 已启用',
      detail: 'release 包不应启用 android:debuggable="true"。', location: 'application',
    })
  }
  const allowBackup = androidAttribute(application, 'allowBackup')
  if (allowBackup !== 'false') {
    addFinding(findings, {
      severity: 'medium', scope: 'review', title: '允许应用备份',
      detail: '请结合业务数据敏感性、dataExtractionRules 与 backupRules 确认备份策略。', location: 'application',
    })
  }
  if (androidAttribute(application, 'usesCleartextTraffic') === 'true') {
    addFinding(findings, {
      severity: 'medium', scope: 'manifest', title: '允许明文流量',
      detail: '除非存在受控兼容需求，否则应关闭 usesCleartextTraffic。', location: 'application',
    })
  }
  if (androidAttribute(application, 'networkSecurityConfig').includes('${')) {
    addFinding(findings, {
      severity: 'low', scope: 'review', title: '网络安全配置含占位符',
      detail: '请在 merged manifest 中确认占位符已被替换为预期资源。', location: 'application',
    })
  }

  for (const permission of permissions) {
    if (DANGEROUS_PERMISSIONS.has(permission)) {
      addFinding(findings, {
        severity: 'info', scope: 'review', title: '声明危险权限',
        detail: `${permission} 需要核对运行时申请、最小化使用和隐私说明。`, location: 'uses-permission',
      })
    }
  }

  for (const permission of manifest.children.filter((element) => element.name === 'permission')) {
    const name = androidAttribute(permission, 'name') || '未命名权限'
    const protection = androidAttribute(permission, 'protectionLevel')
    if (!protection || /(^|\|)normal($|\|)/.test(protection)) {
      addFinding(findings, {
        severity: 'high', scope: 'manifest', title: '自定义权限保护级别过弱',
        detail: `${name} 使用 normal 或未声明 protectionLevel，不能保护敏感组件。`, location: 'permission',
      })
    }
  }

  const componentNames = new Set(['activity', 'activity-alias', 'service', 'receiver', 'provider'])
  const components = application.children.filter((element) => componentNames.has(element.name))
  for (const component of components) {
    const type = component.name
    const name = androidAttribute(component, 'name') || '(未命名组件)'
    const exported = androidAttribute(component, 'exported')
    const hasIntentFilter = component.children.some((child) => child.name === 'intent-filter')
    const permission = androidAttribute(component, 'permission')
    const location = `${type} ${name}`

    if (hasIntentFilter && !exported) {
      addFinding(findings, {
        severity: 'high', scope: 'compatibility', title: 'Intent-filter 组件未显式声明 exported',
        detail: 'Android 12+ 要求含 intent-filter 的组件明确设置 android:exported。', location,
      })
    }
    if (exported === 'true' && !permission && type !== 'provider') {
      addFinding(findings, {
        severity: 'medium', scope: 'review', title: '导出组件未声明权限',
        detail: '请确认组件不处理敏感操作，或在 Manifest/代码层添加调用方授权。', location,
      })
    }
    if (type === 'provider' && exported === 'true') {
      const readPermission = androidAttribute(component, 'readPermission')
      const writePermission = androidAttribute(component, 'writePermission')
      if (!permission && !readPermission && !writePermission) {
        addFinding(findings, {
          severity: 'high', scope: 'review', title: '导出 Provider 缺少访问控制',
          detail: '请分别限制读写权限，并在实现层验证调用方。', location,
        })
      }
    }
  }

  if (xml.includes('${')) {
    addFinding(findings, {
      severity: 'low', scope: 'review', title: '检测到 Manifest 占位符',
      detail: '请检查 merged manifest，确认所有 ${...} 占位符在各构建变体中均被替换。', location: 'manifest',
    })
  }

  return { findings, summary: { packageName, components: components.length, permissions } }
}
