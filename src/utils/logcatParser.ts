export const LOGCAT_TEXT_MAX_CHARS = 2_000_000

export interface LogcatRecord {
  timestamp: string
  pid: string
  tid: string
  priority: string
  tag: string
  message: string
  raw: string
}

export interface LogcatIncident {
  type: 'crash' | 'anr' | 'native' | 'network'
  title: string
  recordIndex: number
  text: string
}

export interface LogcatAnalysis {
  records: LogcatRecord[]
  incidents: LogcatIncident[]
  priorityCounts: Record<string, number>
  tagCounts: Array<{ tag: string; count: number }>
  ignoredLines: number
}

const THREADTIME_RE = /^(?<timestamp>\d\d-\d\d\s+\d\d:\d\d:\d\d\.\d+)\s+(?<pid>\d+)\s+(?<tid>\d+)\s+(?<priority>[VDIWEFA])\s+(?<tag>[^:]+):\s?(?<message>.*)$/
const BRIEF_RE = /^(?<priority>[VDIWEFA])\/(?<tag>[^()]+)\(\s*(?<pid>\d+)\):\s?(?<message>.*)$/

function createRecord(line: string): LogcatRecord | null {
  const threadtime = line.match(THREADTIME_RE)?.groups
  if (threadtime) {
    return {
      timestamp: threadtime.timestamp,
      pid: threadtime.pid,
      tid: threadtime.tid,
      priority: threadtime.priority,
      tag: threadtime.tag.trim(),
      message: threadtime.message,
      raw: line,
    }
  }

  const brief = line.match(BRIEF_RE)?.groups
  if (brief) {
    return {
      timestamp: '',
      pid: brief.pid,
      tid: '',
      priority: brief.priority,
      tag: brief.tag.trim(),
      message: brief.message,
      raw: line,
    }
  }
  return null
}

function findIncident(record: LogcatRecord, index: number): LogcatIncident | null {
  const text = `${record.tag}: ${record.message}`
  if (/FATAL EXCEPTION|AndroidRuntime.*(?:Exception|Error)/i.test(text)) {
    return { type: 'crash', title: 'Java / Kotlin 崩溃', recordIndex: index, text: record.raw }
  }
  if (/ANR in |Application Not Responding/i.test(text)) {
    return { type: 'anr', title: 'ANR', recordIndex: index, text: record.raw }
  }
  if (/Fatal signal|tombstone|DEBUG\s*:\s*backtrace/i.test(text)) {
    return { type: 'native', title: 'Native 崩溃', recordIndex: index, text: record.raw }
  }
  if (/(?:UnknownHostException|SocketTimeoutException|ConnectException|SSLException)/.test(text)) {
    return { type: 'network', title: '网络异常', recordIndex: index, text: record.raw }
  }
  return null
}

export function analyzeLogcat(text: string): LogcatAnalysis {
  if (text.length > LOGCAT_TEXT_MAX_CHARS) {
    throw new Error(`日志超过 ${(LOGCAT_TEXT_MAX_CHARS / 1_000_000).toFixed(0)} MB 文本处理限制`)
  }

  const records: LogcatRecord[] = []
  let ignoredLines = 0
  for (const line of text.split(/\r?\n/)) {
    const record = createRecord(line)
    if (record) {
      records.push(record)
    } else if (line.trim() && records.length) {
      const previous = records[records.length - 1]
      previous.message += `\n${line}`
      previous.raw += `\n${line}`
    } else if (line.trim()) {
      ignoredLines++
    }
  }

  const priorityCounts: Record<string, number> = {}
  const tagCountMap = new Map<string, number>()
  const incidents: LogcatIncident[] = []
  records.forEach((record, index) => {
    priorityCounts[record.priority] = (priorityCounts[record.priority] ?? 0) + 1
    tagCountMap.set(record.tag, (tagCountMap.get(record.tag) ?? 0) + 1)
    const incident = findIncident(record, index)
    if (incident) incidents.push(incident)
  })

  return {
    records,
    incidents,
    priorityCounts,
    tagCounts: [...tagCountMap.entries()]
      .map(([tag, count]) => ({ tag, count }))
      .sort((left, right) => right.count - left.count || left.tag.localeCompare(right.tag)),
    ignoredLines,
  }
}

export function filterLogcatRecords(
  records: LogcatRecord[],
  options: { priority: string; tag: string; pid: string; query: string },
): LogcatRecord[] {
  const tag = options.tag.trim().toLowerCase()
  const pid = options.pid.trim()
  const query = options.query.trim().toLowerCase()
  return records.filter((record) => {
    if (options.priority !== 'all' && record.priority !== options.priority) return false
    if (tag && !record.tag.toLowerCase().includes(tag)) return false
    if (pid && record.pid !== pid) return false
    return !query || `${record.tag}\n${record.message}`.toLowerCase().includes(query)
  })
}
