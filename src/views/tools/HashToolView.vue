<script setup lang="ts">
import { ref, watch } from 'vue'
import ToolHeader from '../../components/ToolHeader.vue'
import { type HashAlgo, hashBytes, hashText } from '../../utils/hash'
import { copyText } from '../../utils/clipboard'
import { HASH_FILE_MAX_BYTES, validateFileSize } from '../../utils/fileInputPolicy'

const source = ref<'text' | 'file'>('text')
const text = ref('hello')
const algo = ref<HashAlgo>('SHA-256')
const result = ref('')
const error = ref('')
const fileName = ref('')
const busy = ref(false)
const copied = ref('')
let fileOperationId = 0

async function compute() {
  error.value = ''
  copied.value = ''
  busy.value = true
  try {
    if (source.value === 'text') {
      result.value = await hashText(algo.value, text.value)
    }
  } catch (e) {
    result.value = ''
    error.value = e instanceof Error ? e.message : '计算失败'
  } finally {
    busy.value = false
  }
}

async function onFile(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  ;(e.target as HTMLInputElement).value = ''
  if (!file) return

  const sizeError = validateFileSize(file, HASH_FILE_MAX_BYTES)
  if (sizeError) {
    fileOperationId++
    source.value = 'file'
    fileName.value = ''
    result.value = ''
    error.value = `${sizeError}，当前哈希实现会完整读取文件到内存`
    return
  }

  const operationId = ++fileOperationId
  fileName.value = file.name
  source.value = 'file'
  error.value = ''
  result.value = ''
  busy.value = true
  try {
    const buf = await file.arrayBuffer()
    const digest = await hashBytes(algo.value, buf)
    if (operationId !== fileOperationId) return
    result.value = digest
  } catch (err) {
    if (operationId !== fileOperationId) return
    result.value = ''
    error.value = err instanceof Error ? err.message : '文件哈希失败'
  } finally {
    if (operationId === fileOperationId) busy.value = false
  }
}

watch([text, algo, source], () => {
  if (source.value === 'text') void compute()
})

watch(algo, () => {
  if (source.value === 'file' && fileName.value) {
    fileOperationId++
    result.value = ''
    error.value = '切换算法后请重新选择文件'
  }
})

void compute()

async function copy() {
  if (!result.value) return
  const ok = await copyText(result.value)
  copied.value = ok ? '已复制' : '复制失败'
}
</script>

<template>
  <div class="page">
    <ToolHeader
      title="哈希摘要"
      description="MD5 / SHA-1 / SHA-256。文本即时计算；文件仅在本地读取。"
    />

    <div class="tool-panel">
      <div class="toolbar">
        <select v-model="algo" class="select" style="max-width: 160px">
          <option value="MD5">MD5</option>
          <option value="SHA-1">SHA-1</option>
          <option value="SHA-256">SHA-256</option>
        </select>
        <label class="btn">
          选择文件
          <input type="file" hidden @change="onFile" />
        </label>
        <button type="button" class="btn btn-ghost" @click="fileOperationId++; source = 'text'; void compute()">
          改用文本
        </button>
        <button type="button" class="btn" :disabled="!result" @click="copy">复制</button>
        <span v-if="copied" class="success-text">{{ copied }}</span>
        <span v-if="busy" class="muted">计算中…</span>
      </div>

      <template v-if="source === 'text'">
        <label class="field-label" for="text">文本</label>
        <textarea id="text" v-model="text" class="textarea" rows="5" />
      </template>
      <p v-else class="muted">文件：<span class="mono">{{ fileName }}</span>（切换算法后请重新选择文件）</p>

      <label class="field-label" style="margin-top: 0.85rem">摘要（hex）</label>
      <input class="input mono" readonly :value="result" />
      <p v-if="error" class="error-text">{{ error }}</p>
      <p class="hint">MD5/SHA-1 仅用于兼容校验，安全场景请用 SHA-256。</p>
      <p class="hint">文件仅在本地读取；为避免浏览器内存耗尽，单个文件上限为 50 MiB。</p>
    </div>
  </div>
</template>
