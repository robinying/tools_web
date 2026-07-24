<script setup lang="ts">
import { ref } from 'vue'
import ToolHeader from '../../components/ToolHeader.vue'
import { hashBytes } from '../../utils/hash'
import { copyText } from '../../utils/clipboard'
import { parseX509Certificate, pemCertificateToDer } from '../../utils/x509'

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

async function parse() {
  error.value = ''
  info.value = null
  copied.value = ''
  try {
    const { type, der } = pemCertificateToDer(input.value)
    const certificate = parseX509Certificate(der)
    const bytes = new Uint8Array(der)
    const [sha256, sha1, md5] = await Promise.all([
      hashBytes('SHA-256', der),
      hashBytes('SHA-1', der),
      hashBytes('MD5', der),
    ])
    info.value = {
      type,
      derLength: bytes.length,
      sha256,
      sha1,
      md5,
      subjectHint: certificate.subject,
      issuerHint: certificate.issuer,
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
      description="校验 X.509 PEM / Base64 DER，并在本地计算 SHA-256 / SHA-1 / MD5 指纹（Android 签名对照常用）。"
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
        导出 PEM。仅接受 X.509 Certificate；Subject / Issuer 经 DER 结构校验后显示，SHA-256 适合安全核验。
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
