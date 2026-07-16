<script setup lang="ts">
import { ref } from 'vue'
import ToolHeader from '../../components/ToolHeader.vue'
import { hashBytes } from '../../utils/hash'
import { copyText } from '../../utils/clipboard'

const input = ref('')
const error = ref('')
const info = ref<{
  type: string
  derLength: number
  sha256: string
  sha1: string
  md5: string
  subjectHint: string
  issuerHint: string
} | null>(null)
const copied = ref('')

function pemToDer(pem: string): { type: string; der: ArrayBuffer } {
  const text = pem.trim()
  const m = text.match(/-----BEGIN ([^-]+)-----([\s\S]+?)-----END \1-----/)
  if (m) {
    const type = m[1]!.trim()
    const b64 = m[2]!.replace(/\s+/g, '')
    const bin = atob(b64)
    const bytes = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
    return { type, der: bytes.buffer }
  }
  // raw base64 DER
  const compact = text.replace(/\s+/g, '')
  if (/^[A-Za-z0-9+/]+=*$/.test(compact) && compact.length > 32) {
    const bin = atob(compact)
    const bytes = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
    return { type: 'DER (base64)', der: bytes.buffer }
  }
  throw new Error('请粘贴 PEM（BEGIN CERTIFICATE）或 Base64 DER')
}

/** Very small ASN.1 UTF8/Printable string harvest for CN= hints */
function extractDnHints(der: Uint8Array): { subject: string; issuer: string } {
  const text = new TextDecoder('utf-8', { fatal: false }).decode(der)
  // fallback: scan for printable CN patterns in DER
  const cns: string[] = []
  const re = /CN=([^\x00-\x1f,]{1,64})/g
  let match: RegExpExecArray | null
  while ((match = re.exec(text)) !== null) {
    cns.push(match[1]!)
  }
  // also OID 2.5.4.3 followed by string — skip heavy parse
  return {
    subject: cns[cns.length - 1] || cns[0] || '（未能解析 CN，仍可使用指纹）',
    issuer: cns.length > 1 ? cns[0]! : cns[0] || '—',
  }
}

async function parse() {
  error.value = ''
  info.value = null
  copied.value = ''
  try {
    const { type, der } = pemToDer(input.value)
    const bytes = new Uint8Array(der)
    const [sha256, sha1, md5] = await Promise.all([
      hashBytes('SHA-256', der),
      hashBytes('SHA-1', der),
      hashBytes('MD5', der),
    ])
    const hints = extractDnHints(bytes)
    info.value = {
      type,
      derLength: bytes.length,
      sha256,
      sha1,
      md5,
      subjectHint: hints.subject,
      issuerHint: hints.issuer,
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : '解析失败'
  }
}

async function copy(text: string) {
  const ok = await copyText(text)
  copied.value = ok ? '已复制' : '复制失败'
}
</script>

<template>
  <div class="page">
    <ToolHeader
      title="证书信息"
      description="粘贴 PEM 证书，本地计算 SHA-256 / SHA-1 / MD5 指纹（Android 签名对照常用）。"
    />

    <div class="tool-panel">
      <label class="field-label" for="pem">证书 PEM / Base64 DER</label>
      <textarea
        id="pem"
        v-model="input"
        class="textarea"
        rows="10"
        placeholder="-----BEGIN CERTIFICATE-----&#10;...&#10;-----END CERTIFICATE-----"
      />
      <div class="toolbar" style="margin-top: 0.75rem">
        <button type="button" class="btn btn-primary" @click="parse">解析</button>
        <button type="button" class="btn btn-ghost" @click="input = ''; info = null; error = ''">
          清空
        </button>
        <span v-if="copied" class="success-text">{{ copied }}</span>
      </div>
      <p v-if="error" class="error-text">{{ error }}</p>
      <p class="hint">
        可用
        <code>keytool -exportcert -rfc -alias &lt;alias&gt; -keystore &lt;ks&gt;</code>
        导出 PEM。CN 解析为启发式，指纹以 DER 字节为准。
      </p>
    </div>

    <div v-if="info" class="tool-panel">
      <div class="kv-grid">
        <div class="kv-item">
          <span class="k">类型</span>
          <span class="v">{{ info.type }}</span>
        </div>
        <div class="kv-item">
          <span class="k">DER 长度</span>
          <span class="v">{{ info.derLength }} bytes</span>
        </div>
        <div class="kv-item">
          <span class="k">Subject 提示</span>
          <span class="v">{{ info.subjectHint }}</span>
        </div>
        <div class="kv-item">
          <span class="k">Issuer 提示</span>
          <span class="v">{{ info.issuerHint }}</span>
        </div>
        <div class="kv-item">
          <span class="k">SHA-256</span>
          <span class="v">
            {{ info.sha256 }}
            <button type="button" class="btn btn-ghost btn-xs" @click="copy(info.sha256)">复制</button>
          </span>
        </div>
        <div class="kv-item">
          <span class="k">SHA-1</span>
          <span class="v">
            {{ info.sha1 }}
            <button type="button" class="btn btn-ghost btn-xs" @click="copy(info.sha1)">复制</button>
          </span>
        </div>
        <div class="kv-item">
          <span class="k">MD5</span>
          <span class="v">
            {{ info.md5 }}
            <button type="button" class="btn btn-ghost btn-xs" @click="copy(info.md5)">复制</button>
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.btn-xs {
  padding: 0.15rem 0.45rem;
  font-size: 0.75rem;
  margin-left: 0.35rem;
}
.v {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.25rem;
  word-break: break-all;
}
</style>
