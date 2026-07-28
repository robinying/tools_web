import { describe, expect, it } from 'vitest'
import { analyzeLogcat, filterLogcatRecords, LOGCAT_TEXT_MAX_CHARS } from './logcatParser'

describe('logcat parser', () => {
  it('parses threadtime records and attaches multiline stack traces', () => {
    const result = analyzeLogcat(
      '07-27 12:00:00.000  123  456 E AndroidRuntime: FATAL EXCEPTION: main\n' +
        'java.lang.IllegalStateException: bad\n' +
        '    at com.example.Main.run(Main.kt:10)',
    )
    expect(result.records).toHaveLength(1)
    expect(result.records[0].message).toContain('IllegalStateException')
    expect(result.incidents[0]).toMatchObject({ type: 'crash' })
  })

  it('parses brief records and summarizes tags', () => {
    const result = analyzeLogcat('D/Test( 123): one\nW/Test( 123): two\nE/Other( 456): three')
    expect(result.priorityCounts).toMatchObject({ D: 1, W: 1, E: 1 })
    expect(result.tagCounts[0]).toEqual({ tag: 'Test', count: 2 })
  })

  it('detects ANR, native crash and network incidents', () => {
    const result = analyzeLogcat(
      '07-27 12:00:00.000  1  1 E ActivityManager: ANR in com.example\n' +
        '07-27 12:00:01.000  1  1 F DEBUG: Fatal signal 11\n' +
        '07-27 12:00:02.000  1  1 E Net: java.net.UnknownHostException',
    )
    expect(result.incidents.map((incident) => incident.type)).toEqual(['anr', 'native', 'network'])
  })

  it('filters normalized records', () => {
    const records = analyzeLogcat('D/One( 1): hello\nE/Two( 2): boom').records
    expect(filterLogcatRecords(records, { priority: 'E', tag: '', pid: '', query: '' })).toHaveLength(1)
    expect(filterLogcatRecords(records, { priority: 'all', tag: 'one', pid: '1', query: 'hello' })).toHaveLength(1)
  })

  it('rejects unbounded input', () => {
    expect(() => analyzeLogcat('x'.repeat(LOGCAT_TEXT_MAX_CHARS + 1))).toThrow('处理限制')
  })
})
