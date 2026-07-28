export interface MethodMapping {
  obfuscatedName: string
  originalClassName: string
  originalName: string
  obfuscatedStart: number | null
  obfuscatedEnd: number | null
}

export interface MappingData {
  classes: Map<string, string>
  methods: Map<string, MethodMapping[]>
  warnings: string[]
}

const CLASS_RE = /^(?<original>.+?)\s+->\s+(?<obfuscated>[\w.$]+):$/
const METHOD_RE = /^\s*(?:(?<originalStart>\d+):(?<originalEnd>\d+):)?(?:[\w.$<>\[\]]+\s+)?(?<name>[\w$<>]+)\([^)]*\)(?::(?<obfuscatedStart>\d+)(?::(?<obfuscatedEnd>\d+))?)?\s+->\s+(?<obfuscated>[\w$<>]+)$/
const FRAME_RE = /^(?<prefix>\s*at\s+)(?<class>[\w.$]+)\.(?<method>[\w$<>]+)\((?<file>[^:()]+)(?::(?<line>\d+))?\)(?<suffix>.*)$/

export function parseMapping(text: string): MappingData {
  const classes = new Map<string, string>()
  const methods = new Map<string, MethodMapping[]>()
  const warnings: string[] = []
  let currentOriginalClass = ''
  let currentObfuscatedClass = ''

  for (const line of text.split(/\r?\n/)) {
    if (/^#\s*\{/.test(line) || /#.*(?:inline|outline|synthesized|mapping version)/i.test(line)) {
      if (!warnings.includes('检测到 R8 v2 元数据；内联、outline 和合成帧可能无法完整还原。')) {
        warnings.push('检测到 R8 v2 元数据；内联、outline 和合成帧可能无法完整还原。')
      }
      continue
    }

    const classGroups = line.match(CLASS_RE)?.groups
    if (classGroups) {
      currentOriginalClass = classGroups.original
      currentObfuscatedClass = classGroups.obfuscated
      classes.set(currentObfuscatedClass, currentOriginalClass)
      continue
    }

    const methodGroups = line.match(METHOD_RE)?.groups
    if (!methodGroups || !currentOriginalClass || !currentObfuscatedClass) continue
    const key = `${currentObfuscatedClass}.${methodGroups.obfuscated}`
    const mappings = methods.get(key) ?? []
    mappings.push({
      obfuscatedName: methodGroups.obfuscated,
      originalClassName: currentOriginalClass,
      originalName: methodGroups.name,
      obfuscatedStart: methodGroups.obfuscatedStart ? Number(methodGroups.obfuscatedStart) : null,
      obfuscatedEnd: methodGroups.obfuscatedEnd ? Number(methodGroups.obfuscatedEnd) : null,
    })
    methods.set(key, mappings)
  }

  return { classes, methods, warnings }
}

function selectMethod(candidates: MethodMapping[], line: number | null): MethodMapping | null {
  if (!candidates.length) return null
  if (line != null) {
    const matched = candidates.filter((candidate) =>
      candidate.obfuscatedStart != null && candidate.obfuscatedEnd != null &&
      line >= candidate.obfuscatedStart && line <= candidate.obfuscatedEnd,
    )
    if (matched.length === 1) return matched[0]
  }
  return candidates.length === 1 ? candidates[0] : null
}

export interface RetraceResult {
  text: string
  changedFrames: number
  ambiguousFrames: number
}

export function retraceStackTrace(mapping: MappingData, stackTrace: string): RetraceResult {
  let changedFrames = 0
  let ambiguousFrames = 0
  const text = stackTrace.split(/\r?\n/).map((line) => {
    const groups = line.match(FRAME_RE)?.groups
    if (!groups) return line
    const originalClass = mapping.classes.get(groups.class)
    if (!originalClass) return line
    const lineNumber = groups.line ? Number(groups.line) : null
    const candidates = mapping.methods.get(`${groups.class}.${groups.method}`) ?? []
    const method = selectMethod(candidates, lineNumber)
    if (candidates.length > 1 && !method) ambiguousFrames++
    const className = method?.originalClassName ?? originalClass
    const methodName = method?.originalName ?? groups.method
    changedFrames++
    return `${groups.prefix}${className}.${methodName}(${groups.file}${groups.line ? `:${groups.line}` : ''})${groups.suffix}`
  }).join('\n')
  return { text, changedFrames, ambiguousFrames }
}
