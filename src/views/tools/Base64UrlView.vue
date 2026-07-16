<script setup lang="ts">
import { ref } from 'vue'
import ToolHeader from '../../components/ToolHeader.vue'
import { copyText } from '../../utils/clipboard'

const input = ref('Hello Android')
const output = ref('')
const error = ref('')
const copied = ref('')
const mode = ref<'b64-enc' | 'b64-dec' | 'b64url-enc' | 'b64url-dec' | 'url-enc' | 'url-dec'>(
  'b64-enc',
)

function bytesToBase64(bytes: Uint8Array, urlSafe: boolean): string {
  let bin = ''
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]!)
  let b64 = btoa(bin)
  if (urlSafe) b64 = b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  return b64
}

function base64ToBytes(b64: string, urlSafe: boolean): Uint8Array {
  let s = b64.trim().replace(/\s/g, '')
  if (urlSafe) {
    s = s.replace(/-/g, '+').replace(/_/g, '/')
    while (s.length % 4) s += '='
  }
  const bin = atob(s)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

function run() {
  error.value = ''
  copied.value = ''
  try {
    const text = input.value
    switch (mode.value) {
      case 'b64-enc':
        output.value = bytesToBase64(new TextEncoder().encode(text), false)
        break
      case 'b64-dec':
        output.value = new TextDecoder().decode(base64ToBytes(text, false))
        break
      case 'b64url-enc':
        output.value = bytesToBase64(new TextEncoder().encode(text), true)
        break
      case 'b64url-dec':
        output.value = new TextDecoder().decode(base64ToBytes(text, true))
        break
      case 'url-enc':
        output.value = encodeURIComponent(text)
        break
      case 'url-dec':
        output.value = decodeURIComponent(text)
        break
    }
  } catch (e) {
    output.value = ''
    error.value = e instanceof Error ? e.message : '转换失败'
  }
}

async function copy() {
  if (!output.value) return
  const ok = await copyText(output.value)
  copied.value = ok ? '已复制' : '复制失败'
}

run()
</script>

<template>
  <div class="page">
    <ToolHeader
      title="Base64 / URL 编解码"
      description="Base64、Base64URL、URL encode/decode，全部在浏览器本地完成。"
    />

    <div class="tool-panel">
      <div class="toolbar">
        <select v-model="mode" class="select" style="max-width: 220px" @change="run">
          <option value="b64-enc">Base64 编码</option>
          <option value="b64-dec">Base64 解码</option>
          <option value="b64url-enc">Base64URL 编码</option>
          <option value="b64url-dec">Base64URL 解码</option>
          <option value="url-enc">URL Encode</option>
          <option value="url-dec">URL Decode</option>
        </select>
        <button type="button" class="btn btn-primary" @click="run">转换</button>
        <button type="button" class="btn" :disabled="!output" @click="copy">复制结果</button>
        <span v-if="copied" class="success-text">{{ copied }}</span>
      </div>

      <label class="field-label" for="in">输入</label>
      <textarea id="in" v-model="input" class="textarea" rows="5" @input="run" />

      <label class="field-label" for="out" style="margin-top: 0.85rem">输出</label>
      <textarea id="out" class="textarea" rows="5" readonly :value="output" />
      <p v-if="error" class="error-text">{{ error }}</p>
    </div>
  </div>
</template>
