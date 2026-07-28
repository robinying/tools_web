import { describe, expect, it } from 'vitest'
import { buildAppLinksCommands, parseAppLinksStatus, validateAppLinksInput, validateAssetLinks } from './appLinks'

describe('App Links helpers', () => {
  it('validates URL and package inputs', () => {
    expect(validateAppLinksInput('https://example.com/path', 'com.example.app')).toBeNull()
    expect(validateAppLinksInput('intent://example.com', 'com.example.app')).toContain('HTTP')
    expect(validateAppLinksInput('https://example.com', 'bad package')).toContain('包名')
  })

  it('quotes commands and gates reverify by API level', () => {
    const commands = buildAppLinksCommands("https://example.com/a?x=O'Brien", 'com.example.app', 30)
    expect(commands.launch).toContain("O'\\''Brien")
    expect(commands.reverify).toBeNull()
    expect(buildAppLinksCommands('https://example.com', 'com.example.app', 31).reverify).toContain('verify-app-links')
  })

  it('validates assetlinks relations, target and fingerprints', () => {
    const valid = validateAssetLinks(`[{"relation":["delegate_permission/common.handle_all_urls"],"target":{"namespace":"android_app","package_name":"com.example.app","sha256_cert_fingerprints":["AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99"]}}]`)
    expect(valid.valid).toBe(true)
    expect(validateAssetLinks('{}').errors[0]).toContain('数组')
  })

  it('parses recognizable app-link status rows', () => {
    expect(parseAppLinksStatus('example.com: verified\nother.example: 1024')).toEqual([
      { domain: 'example.com', status: 'verified' },
      { domain: 'other.example', status: '1024' },
    ])
  })
})
