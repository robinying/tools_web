/**
 * Smoke-test key tool pages against a running preview server.
 * Usage: node tests/e2e-smoke.mjs [baseUrl]
 */
import { spawn } from 'node:child_process'
import { setTimeout as sleep } from 'node:timers/promises'
import { writeFileSync, unlinkSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

const base = (process.argv[2] || 'http://127.0.0.1:4173/tools_web/').replace(/\/?$/, '/')

const routes = [
  ['/', ['Android 开发工具箱', '进制转换', '权限速查', 'adb 命令速查']],
  ['/base-converter', ['进制转换', '二进制', '十六进制']],
  ['/exif-reader', ['EXIF 读取', '选择图片']],
  ['/qr-tool', ['二维码', '生成', '解析']],
  ['/image-compress', ['图片压缩', '选择图片', '导出格式']],
  ['/image-watermark', ['图片加水印', '选择原始图片', '文字水印']],
  ['/logcat-analyzer', ['Logcat 日志分析', '分析日志', 'Logcat 文本']],
  ['/mapping-retrace', ['R8 / ProGuard Retrace', 'mapping.txt', 'Stacktrace']],
  ['/manifest-security', ['AndroidManifest 安全检查', '检查 Manifest', 'AndroidManifest.xml']],
  ['/android-icon-generator', ['Android 图标生成', '选择源图片']],
  ['/json-kotlin-generator', ['JSON 转 Kotlin data class', '生成 Kotlin', '生成结果']],
  ['/app-links-assistant', ['Deep Link / App Links 测试', '调试命令', 'assetlinks.json']],
  ['/dp-sp-px', ['dp / sp / px', 'xxhdpi']],
  ['/permissions', ['权限速查', 'INTERNET']],
  ['/adb-cheatsheet', ['adb 命令速查', 'adb devices']],
  ['/logcat-filter', ['Logcat', '生成命令']],
  ['/intent-builder', ['Intent', 'am start']],
  ['/base64-url', ['Base64', 'URL']],
  ['/hash-tool', ['哈希', 'SHA-256']],
  ['/color-tool', ['颜色', 'ARGB']],
  ['/density-buckets', ['密度', 'xxhdpi']],
  ['/proguard-snippets', ['ProGuard', 'keep']],
  ['/json-xml-format', ['JSON', '格式化']],
  ['/cert-info', ['证书', 'PEM']],
]

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] })
    let out = ''
    let err = ''
    child.stdout.on('data', (d) => {
      out += d.toString()
    })
    child.stderr.on('data', (d) => {
      err += d.toString()
    })
    child.on('error', reject)
    child.on('close', (code) => resolve({ code: code ?? 1, out, err }))
  })
}

async function ab(args) {
  const r = await run('agent-browser', args)
  if (r.code !== 0) throw new Error(`agent-browser ${args.join(' ')} failed:\n${r.err || r.out}`)
  return (r.out || '').trim()
}

async function pageText() {
  try {
    return await ab(['get', 'text', 'body'])
  } catch {
    return await ab(['snapshot'])
  }
}

async function openHash(hashPath) {
  await ab(['open', `${base}#${hashPath}`])
  for (let i = 0; i < 15; i++) {
    await sleep(250)
    const text = await pageText()
    if (text && text.length > 40) return text
  }
  return pageText()
}

function assertIncludes(text, mustInclude, label) {
  for (const s of mustInclude) {
    if (!text.includes(s)) {
      throw new Error(`${label} missing "${s}"\n---\n${text.slice(0, 2000)}`)
    }
  }
  console.log(`  OK  ${label}`)
}

function findRef(snap, pattern) {
  const re = typeof pattern === 'string' ? new RegExp(pattern) : pattern
  for (const line of snap.split('\n')) {
    if (!re.test(line)) continue
    const m = line.match(/ref=(e\d+)/)
    if (m) return `@${m[1]}`
  }
  return null
}

function buildJpegWithExif() {
  const tiffHeader = Buffer.from([0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00])
  const makeStr = Buffer.from('TestCam\0', 'ascii')
  const ifd = Buffer.alloc(18)
  ifd.writeUInt16LE(1, 0)
  ifd.writeUInt16LE(0x010f, 2)
  ifd.writeUInt16LE(2, 4)
  ifd.writeUInt32LE(makeStr.length, 6)
  ifd.writeUInt32LE(8 + 2 + 12 + 4, 10)
  ifd.writeUInt32LE(0, 14)
  const tiff = Buffer.concat([tiffHeader, ifd, makeStr])
  const exifHeader = Buffer.concat([Buffer.from('Exif\0\0', 'ascii'), tiff])
  const app1 = Buffer.alloc(4 + exifHeader.length)
  app1[0] = 0xff
  app1[1] = 0xe1
  app1.writeUInt16BE(exifHeader.length + 2, 2)
  exifHeader.copy(app1, 4)
  return Buffer.concat([Buffer.from([0xff, 0xd8]), app1, Buffer.from([0xff, 0xd9])])
}

function buildPng() {
  return Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFElEQVR42mNk+M/wHwMDAwMTAwMAAAsAAQb3V9YAAAAASUVORK5CYII=',
    'base64',
  )
}

async function uploadAndClick(filePath, inputSelector, buttonSelector) {
  const upload = await run('agent-browser', ['upload', inputSelector, filePath])
  if (upload.code !== 0) throw new Error(upload.err || upload.out)
  await sleep(300)
  const click = await run('agent-browser', ['click', buttonSelector])
  if (click.code !== 0) throw new Error(click.err || click.out)
  await sleep(600)
}

async function main() {
  console.log(`E2E smoke against ${base}`)

  for (const [path, needles] of routes) {
    const text = await openHash(path)
    assertIncludes(text, needles, `#${path}`)
  }

  // Interactions
  let text = await openHash('/base-converter')
  let snap = await ab(['snapshot', '-i'])
  let ref = findRef(snap, /示例 255/)
  if (ref) {
    await ab(['click', ref])
    await sleep(400)
    text = await pageText()
    assertIncludes(text, ['255'], 'base-converter sample')
  }

  text = await openHash('/exif-reader')
  const jpegPath = join(tmpdir(), `tools_web_e2e_${Date.now()}.jpg`)
  writeFileSync(jpegPath, buildJpegWithExif())
  try {
    const up = await run('agent-browser', ['upload', 'input[type=file]', jpegPath])
    if (up.code !== 0) throw new Error(up.err || up.out)
    await sleep(800)
    text = await pageText()
    assertIncludes(text, ['TestCam', '已解析'], 'exif parse')
  } finally {
    try {
      unlinkSync(jpegPath)
    } catch {
      /* ignore */
    }
  }

  text = await openHash('/image-compress')
  const pngPath = join(tmpdir(), `tools_web_e2e_${Date.now()}.png`)
  writeFileSync(pngPath, buildPng())
  try {
    await uploadAndClick(pngPath, '#compress-source-input', '#compress-run')
    text = await pageText()
    assertIncludes(text, ['压缩完成'], 'image-compress output')

    text = await openHash('/image-watermark')
    await uploadAndClick(pngPath, '#watermark-source-input', '#watermark-run')
    text = await pageText()
    assertIncludes(text, ['水印已生成'], 'image-watermark text output')

    text = await openHash('/image-watermark')
    const sourceUpload = await run('agent-browser', ['upload', '#watermark-source-input', pngPath])
    if (sourceUpload.code !== 0) throw new Error(sourceUpload.err || sourceUpload.out)
    await sleep(300)
    const textClear = await run('agent-browser', ['fill', '#watermark-text', ''])
    if (textClear.code !== 0) throw new Error(textClear.err || textClear.out)
    const markUpload = await run('agent-browser', ['upload', '#watermark-image-input', pngPath])
    if (markUpload.code !== 0) throw new Error(markUpload.err || markUpload.out)
    await sleep(300)
    const markClick = await run('agent-browser', ['click', '#watermark-run'])
    if (markClick.code !== 0) throw new Error(markClick.err || markClick.out)
    await sleep(600)
    text = await pageText()
    assertIncludes(text, ['水印已生成'], 'image-watermark image output')
  } finally {
    try {
      unlinkSync(pngPath)
    } catch {
      /* ignore */
    }
  }

  text = await openHash('/dp-sp-px')
  if (!text.includes('48')) throw new Error('dp 16 on xxhdpi should show 48')
  console.log('  OK  dp-sp-px 16→48')

  console.log('\nAll E2E smoke checks passed.')
}

main().catch((e) => {
  console.error('\nE2E FAILED:', e.message || e)
  process.exit(1)
})
