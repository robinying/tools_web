import { describe, expect, it } from 'vitest'
import {
  buildAmStartCommand,
  buildIntentUri,
  buildLogcatCommand,
  getLogcatPackageError,
  quotePosixShellArg,
} from './adbCommand'

describe('quotePosixShellArg', () => {
  it('keeps shell metacharacters inside one literal argument', () => {
    expect(quotePosixShellArg("a; $(id) 'quoted'"))
      .toBe("'a; $(id) '\\''quoted'\\'''" )
  })
})

describe('buildLogcatCommand', () => {
  it('combines PID, buffer and tag filters', () => {
    expect(buildLogcatCommand({
      packageName: 'com.example.app',
      tags: 'ActivityManager, OkHttp',
      priority: 'E',
      buffer: 'crash',
      usePid: true,
      clearFirst: false,
    })).toBe("adb logcat --pid=\"$(adb shell pidof -s 'com.example.app')\" -b crash ActivityManager:E OkHttp:E *:S")
  })

  it('does not interpolate an invalid package into a PID command', () => {
    const command = buildLogcatCommand({
      packageName: 'com.example.app; echo injected',
      tags: '',
      priority: 'D',
      buffer: 'main',
      usePid: true,
      clearFirst: false,
    })
    expect(command).toBe('adb logcat *:V')
    expect(getLogcatPackageError({ packageName: 'com.example.app; echo injected', usePid: true }))
      .toContain('合法 Android 包名')
  })

  it('rejects unsafe tag syntax rather than emitting shell metacharacters', () => {
    expect(buildLogcatCommand({
      packageName: '',
      tags: 'OkHttp; echo injected',
      priority: 'D',
      buffer: 'main',
      usePid: false,
      clearFirst: false,
    })).toBe('adb logcat *:V')
  })
})

describe('buildAmStartCommand', () => {
  const base = {
    action: 'android.intent.action.VIEW',
    dataUri: 'https://example.com/a path?name=O\'Brien',
    packageName: 'com.example.app',
    component: '',
    category: '',
    extras: "source=web; $(id)\nname=O'Brien",
    flags: '0x10000000',
  }

  it('quotes every user-controlled shell argument', () => {
    const result = buildAmStartCommand(base)
    expect(result.error).toBeNull()
    expect(result.command).toContain("-d 'https://example.com/a path?name=O'\\''Brien'")
    expect(result.command).toContain("--es 'source' 'web; $(id)'")
    expect(result.command).toContain("--es 'name' 'O'\\''Brien'")
    expect(result.command).toContain('-f 0x10000000')
  })

  it('rejects raw flags fragments', () => {
    expect(buildAmStartCommand({ ...base, flags: '-f 0x1; echo injected' })).toEqual({
      command: '',
      error: 'Intent flag 必须是十进制或 0x 开头的十六进制数值',
    })
  })
})

describe('buildIntentUri', () => {
  const base = {
    action: 'android.intent.action.VIEW;bad=value',
    dataUri: 'https://example.com/a?query=one#fragment',
    packageName: 'com.example;bad',
    component: '',
    category: '',
    extras: 'key;name=value=#中文',
    flags: '268435456',
  }

  it('encodes every directive value that can break intent grammar', () => {
    const result = buildIntentUri(base)
    expect(result.error).toBeNull()
    expect(result.uri).toContain('action=android.intent.action.VIEW%3Bbad%3Dvalue')
    expect(result.uri).toContain('package=com.example%3Bbad')
    expect(result.uri).toContain('S.key%3Bname=value%3D%23%E4%B8%AD%E6%96%87')
    expect(result.uri).toContain('launchFlags=268435456')
  })

  it('rejects malformed and unsupported data URIs', () => {
    expect(buildIntentUri({ ...base, dataUri: 'not a url' })).toEqual({
      uri: '',
      error: 'Data URI 必须是完整且合法的 URL',
    })
    expect(buildIntentUri({ ...base, dataUri: 'intent://example.com' })).toEqual({
      uri: '',
      error: 'Data URI 仅支持带主机名的 HTTP 或 HTTPS URL',
    })
  })
})
