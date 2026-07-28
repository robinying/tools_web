import { describe, expect, it } from 'vitest'
import { parseMapping, retraceStackTrace } from './mappingRetrace'

const mappingText = `com.example.MainActivity -> a.b:
    10:10:void start():5:5 -> a
com.example.Outer$Inner -> c.d:
    void run() -> b
`

describe('mapping retrace', () => {
  it('parses standard class and method mappings', () => {
    const mapping = parseMapping(mappingText)
    expect(mapping.classes.get('a.b')).toBe('com.example.MainActivity')
    expect(mapping.methods.get('a.b.a')?.[0]).toMatchObject({ originalName: 'start' })
  })

  it('retraces class, method and nested-class frames', () => {
    const mapping = parseMapping(mappingText)
    const result = retraceStackTrace(mapping, '    at a.b.a(SourceFile:5)\n    at c.d.b(SourceFile:1)')
    expect(result.text).toContain('com.example.MainActivity.start(SourceFile:5)')
    expect(result.text).toContain('com.example.Outer$Inner.run(SourceFile:1)')
    expect(result.changedFrames).toBe(2)
  })

  it('preserves unmapped frames', () => {
    const result = retraceStackTrace(parseMapping(mappingText), '    at x.y.z(SourceFile:1)')
    expect(result).toMatchObject({ text: '    at x.y.z(SourceFile:1)', changedFrames: 0 })
  })

  it('flags ambiguous method candidates', () => {
    const mapping = parseMapping(`com.example.A -> a:\n    void first() -> b\n    void second() -> b`)
    const result = retraceStackTrace(mapping, '    at a.b(SourceFile:1)')
    expect(result.text).toContain('com.example.A.b')
    expect(result.ambiguousFrames).toBe(1)
  })

  it('warns about unsupported R8 v2 metadata', () => {
    const mapping = parseMapping('# {"id":"com.android.tools.r8.mapping"}\ncom.example.A -> a:')
    expect(mapping.warnings[0]).toContain('R8 v2')
  })
})
