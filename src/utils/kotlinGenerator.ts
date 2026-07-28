export type KotlinDialect = 'none' | 'gson' | 'moshi' | 'kotlinx'

export interface KotlinGeneratorOptions {
  rootName: string
  packageName: string
  dialect: KotlinDialect
}

export interface KotlinGeneratorResult {
  code: string
  warnings: string[]
}

interface InferredType {
  text: string
  nullable: boolean
}

const KOTLIN_KEYWORDS = new Set(['as', 'break', 'class', 'continue', 'do', 'else', 'false', 'for', 'fun', 'if', 'in', 'interface', 'is', 'null', 'object', 'package', 'return', 'super', 'this', 'throw', 'true', 'try', 'typealias', 'val', 'var', 'when', 'while'])

function toClassName(value: string): string {
  const parts = value.replace(/([a-z])([A-Z])/g, '$1 $2').split(/[^A-Za-z0-9]+/).filter(Boolean)
  const name = parts.map((part) => `${part[0]?.toUpperCase() ?? ''}${part.slice(1)}`).join('') || 'Root'
  return /^\d/.test(name) ? `Model${name}` : name
}

function toPropertyName(value: string): string {
  const parts = value.split(/[^A-Za-z0-9]+/).filter(Boolean)
  const base = parts.length
    ? `${parts[0].charAt(0).toLowerCase()}${parts[0].slice(1)}${parts.slice(1).map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`).join('')}`
    : 'value'
  return /^\d/.test(base) || KOTLIN_KEYWORDS.has(base) ? `\`${base}\`` : base
}

function annotation(dialect: KotlinDialect, wireName: string, propertyName: string): string {
  if (wireName === propertyName.replace(/`/g, '')) return ''
  if (dialect === 'gson') return `@SerializedName("${wireName}") `
  if (dialect === 'moshi') return `@Json(name = "${wireName}") `
  if (dialect === 'kotlinx') return `@SerialName("${wireName}") `
  return ''
}

function mergeTypes(types: InferredType[], warnings: string[]): InferredType {
  const uniqueByText = new Map<string, InferredType>()
  for (const type of types) uniqueByText.set(type.text, type)
  const unique = [...uniqueByText.values()]
  const nullable = types.some((type) => type.nullable)
  if (unique.length === 1) return { text: unique[0].text, nullable }
  if (unique.every((type) => type.text === 'Int' || type.text === 'Long')) return { text: 'Long', nullable }
  warnings.push('检测到异构数组或字段类型冲突，已使用 Any? 作为保守回退类型。')
  return { text: 'Any?', nullable: false }
}

export function generateKotlin(jsonText: string, options: KotlinGeneratorOptions): KotlinGeneratorResult {
  const value: unknown = JSON.parse(jsonText)
  const warnings: string[] = []
  const classes: string[] = []
  const rootName = toClassName(options.rootName)

  const infer = (current: unknown, hint: string): InferredType => {
    if (current === null) return { text: 'Any?', nullable: true }
    if (typeof current === 'string') return { text: 'String', nullable: false }
    if (typeof current === 'boolean') return { text: 'Boolean', nullable: false }
    if (typeof current === 'number') {
      if (!Number.isInteger(current)) return { text: 'Double', nullable: false }
      return { text: Math.abs(current) > 2_147_483_647 ? 'Long' : 'Int', nullable: false }
    }
    if (Array.isArray(current)) {
      if (!current.length) { warnings.push(`数组 ${hint} 为空，元素类型使用 Any?。`); return { text: 'List<Any?>', nullable: false } }
      const itemTypes = current.map((item) => infer(item, `${hint}Item`))
      const item = mergeTypes(itemTypes, warnings)
      return { text: `List<${item.text}${item.nullable && !item.text.endsWith('?') ? '?' : ''}>`, nullable: false }
    }
    if (typeof current === 'object') {
      const className = toClassName(hint)
      const object = current as Record<string, unknown>
      const fields = Object.entries(object).map(([key, nested]) => {
        const type = infer(nested, `${className}${toClassName(key)}`)
        const property = toPropertyName(key)
        const suffix = type.nullable && !type.text.endsWith('?') ? '?' : ''
        return `    ${annotation(options.dialect, key, property)}val ${property}: ${type.text}${suffix}`
      })
      classes.push(`data class ${className}(\n${fields.join(',\n')}\n)`)
      return { text: className, nullable: false }
    }
    return { text: 'Any?', nullable: false }
  }

  const root = infer(value, rootName)
  const imports: string[] = []
  if (options.dialect === 'gson') imports.push('import com.google.gson.annotations.SerializedName')
  if (options.dialect === 'moshi') imports.push('import com.squareup.moshi.Json')
  if (options.dialect === 'kotlinx') imports.push('import kotlinx.serialization.SerialName', 'import kotlinx.serialization.Serializable')
  const renderedClasses = classes.reverse().map((item) => options.dialect === 'kotlinx' ? `@Serializable\n${item}` : item)
  const rootAlias = root.text.startsWith('List<') ? `typealias ${rootName} = ${root.text}` : ''
  const header = options.packageName.trim() ? `package ${options.packageName.trim()}\n\n` : ''
  const importBlock = imports.length ? `${imports.join('\n')}\n\n` : ''
  return { code: `${header}${importBlock}${[...renderedClasses, rootAlias].filter(Boolean).join('\n\n')}\n`, warnings: [...new Set(warnings)] }
}
