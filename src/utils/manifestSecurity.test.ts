import { describe, expect, it } from 'vitest'
import { analyzeManifest } from './manifestSecurity'

const manifest = `<manifest xmlns:android="http://schemas.android.com/apk/res/android" package="com.example.app">
  <uses-permission android:name="android.permission.CAMERA" />
  <permission android:name="com.example.app.PERMISSION" android:protectionLevel="normal" />
  <application android:debuggable="true" android:usesCleartextTraffic="true">
    <activity android:name=".ShareActivity"><intent-filter><action android:name="android.intent.action.SEND" /></intent-filter></activity>
    <provider android:name=".Provider" android:exported="true" />
  </application>
</manifest>`

describe('manifest security', () => {
  it('finds manifest-verifiable security and compatibility issues', () => {
    const result = analyzeManifest(manifest)
    const titles = result.findings.map((finding) => finding.title)
    expect(result.summary).toMatchObject({ packageName: 'com.example.app', components: 2 })
    expect(titles).toEqual(expect.arrayContaining([
      'Debuggable 已启用',
      '允许明文流量',
      '自定义权限保护级别过弱',
      'Intent-filter 组件未显式声明 exported',
      '导出 Provider 缺少访问控制',
      '声明危险权限',
    ]))
  })

  it('rejects malformed XML', () => {
    expect(() => analyzeManifest('<manifest><application></manifest>')).toThrow()
  })

  it('surfaces unresolved placeholders for merged-manifest review', () => {
    const result = analyzeManifest(
      '<manifest package="${applicationId}"><application android:label="${label}" /></manifest>',
    )
    expect(result.findings.some((finding) => finding.title === '检测到 Manifest 占位符')).toBe(true)
  })
})
