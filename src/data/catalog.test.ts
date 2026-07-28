import { describe, expect, it } from 'vitest'
import permissions from './permissions.json'
import adbCommands from './adb-commands.json'
import proguard from './proguard-snippets.json'
import { tools } from './tools'

describe('tools catalog', () => {
  it('has unique ids and paths', () => {
    const ids = tools.map((t) => t.id)
    const paths = tools.map((t) => t.path)
    expect(new Set(ids).size).toBe(ids.length)
    expect(new Set(paths).size).toBe(paths.length)
  })

  it('does not include removed api-level tool', () => {
    expect(tools.some((t) => t.id === 'api-level')).toBe(false)
  })

  it('includes planned tools', () => {
    const ids = tools.map((t) => t.id)
    expect(ids).toEqual(
      expect.arrayContaining([
        'base-converter',
        'exif-reader',
        'qr-tool',
        'image-compress',
        'image-watermark',
        'dp-sp-px',
        'permissions',
        'adb-cheatsheet',
        'logcat-filter',
        'intent-builder',
        'base64-url',
        'hash-tool',
        'color-tool',
        'density-buckets',
        'proguard-snippets',
        'json-xml-format',
        'cert-info',
      ]),
    )
  })

  it('paths are absolute hash-router friendly', () => {
    for (const t of tools) {
      expect(t.path.startsWith('/')).toBe(true)
      expect(t.name.length).toBeGreaterThan(0)
      expect(t.description.length).toBeGreaterThan(0)
    }
  })
})

describe('static data tables', () => {
  it('permissions table is usable', () => {
    expect(permissions.length).toBeGreaterThan(10)
    expect(permissions.some((p) => p.name.includes('INTERNET'))).toBe(true)
    for (const p of permissions) {
      expect(p.name).toBeTruthy()
      expect(p.desc).toBeTruthy()
    }
  })

  it('adb commands table is usable', () => {
    expect(adbCommands.length).toBeGreaterThan(10)
    expect(adbCommands.some((c) => c.command.includes('adb'))).toBe(true)
  })

  it('proguard snippets table is usable', () => {
    expect(proguard.length).toBeGreaterThan(5)
    expect(proguard.every((s) => s.code.includes('-'))).toBe(true)
  })
})
