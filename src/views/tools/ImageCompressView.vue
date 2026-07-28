<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import ToolHeader from '../../components/ToolHeader.vue'
import {
  calculateOutputSize,
  canvasToBlob,
  getOutputFormatInfo,
  makeOutputFileName,
  type OutputFormat,
} from '../../utils/imageProcessing'
import {
  IMAGE_FILE_MAX_BYTES,
  readImageDimensions,
  validateFileSize,
  validateImageDimensions,
  type ImageDimensions,
} from '../../utils/fileInputPolicy'

const sourceFile = ref<File | null>(null)
const sourceSize = ref<ImageDimensions | null>(null)
const sourceUrl = ref('')
const outputBlob = ref<Blob | null>(null)
const outputUrl = ref('')
const outputSize = ref<ImageDimensions | null>(null)
const outputFormat = ref<OutputFormat>('jpeg')
const quality = ref(0.8)
const maxLongEdge = ref(0)
const busy = ref(false)
const error = ref('')
const dragOver = ref(false)
let operationId = 0

const formatInfo = computed(() => getOutputFormatInfo(outputFormat.value))
const targetSize = computed(() => {
  if (!sourceSize.value) return null
  return calculateOutputSize(sourceSize.value, maxLongEdge.value)
})

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KiB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MiB`
}

function revokeSourceUrl() {
  if (sourceUrl.value) {
    URL.revokeObjectURL(sourceUrl.value)
    sourceUrl.value = ''
  }
}

function revokeOutputUrl() {
  if (outputUrl.value) {
    URL.revokeObjectURL(outputUrl.value)
    outputUrl.value = ''
  }
}

function clearOutput() {
  outputBlob.value = null
  outputSize.value = null
  revokeOutputUrl()
}

function clearAll() {
  operationId++
  sourceFile.value = null
  sourceSize.value = null
  error.value = ''
  clearOutput()
  revokeSourceUrl()
}

onBeforeUnmount(clearAll)

async function setSourceFile(file: File | null | undefined) {
  const requestId = ++operationId
  error.value = ''
  clearOutput()
  revokeSourceUrl()
  sourceFile.value = null
  sourceSize.value = null
  if (!file) return
  if (!file.type.startsWith('image/')) {
    error.value = '请选择浏览器可解码的图片文件'
    return
  }

  const sizeError = validateFileSize(file, IMAGE_FILE_MAX_BYTES)
  if (sizeError) {
    error.value = sizeError
    return
  }

  try {
    const dimensions = await readImageDimensions(file)
    const dimensionsError = validateImageDimensions(dimensions)
    if (dimensionsError) throw new Error(dimensionsError)
    if (requestId !== operationId) return
    sourceFile.value = file
    sourceSize.value = dimensions
    sourceUrl.value = URL.createObjectURL(file)
  } catch (cause) {
    if (requestId !== operationId) return
    error.value = cause instanceof Error ? cause.message : '图片加载失败'
  }
}

function onSourceChange(event: Event) {
  const input = event.target as HTMLInputElement
  void setSourceFile(input.files?.[0])
  input.value = ''
}

function onDrop(event: DragEvent) {
  dragOver.value = false
  void setSourceFile(event.dataTransfer?.files?.[0])
}

async function compress() {
  const file = sourceFile.value
  const dimensions = sourceSize.value
  if (!file || !dimensions) return

  const requestId = ++operationId
  busy.value = true
  error.value = ''
  clearOutput()
  try {
    const target = calculateOutputSize(dimensions, maxLongEdge.value)
    const bitmap = await createImageBitmap(file)
    try {
      if (requestId !== operationId) return
      const canvas = document.createElement('canvas')
      canvas.width = target.width
      canvas.height = target.height
      const context = canvas.getContext('2d')
      if (!context) throw new Error('Canvas 不可用')
      if (outputFormat.value === 'jpeg') {
        context.fillStyle = '#ffffff'
        context.fillRect(0, 0, target.width, target.height)
      }
      context.drawImage(bitmap, 0, 0, target.width, target.height)
      const blob = await canvasToBlob(canvas, outputFormat.value, quality.value)
      if (requestId !== operationId) return
      outputBlob.value = blob
      outputSize.value = target
      outputUrl.value = URL.createObjectURL(blob)
    } finally {
      bitmap.close()
    }
  } catch (cause) {
    if (requestId !== operationId) return
    error.value = cause instanceof Error ? cause.message : '压缩失败'
  } finally {
    if (requestId === operationId) busy.value = false
  }
}

function downloadOutput() {
  const blob = outputBlob.value
  const file = sourceFile.value
  if (!blob || !file) return
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = makeOutputFileName(file.name, '-compressed', outputFormat.value)
  anchor.click()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

const outputChange = computed(() => {
  if (!sourceFile.value || !outputBlob.value) return ''
  const ratio = (outputBlob.value.size / sourceFile.value.size) * 100
  return ratio <= 100 ? `缩小 ${Math.round(100 - ratio)}%` : `增大 ${Math.round(ratio - 100)}%`
})
</script>

<template>
  <div class="page">
    <ToolHeader
      title="图片压缩"
      description="在浏览器本地缩放并重新编码图片。文件不会上传；导出文件不保留原始 EXIF 元数据。"
    />

    <div class="tool-panel">
      <div
        class="dropzone"
        :class="{ active: dragOver }"
        @dragover.prevent="dragOver = true"
        @dragleave.prevent="dragOver = false"
        @drop.prevent="onDrop"
      >
        <p><strong>拖拽图片到此处</strong>，或点击选择文件</p>
        <p class="hint">PNG / JPEG / WebP 等 · 纯本地处理 · 单个文件最大 25 MiB，图片最大 24 MP</p>
        <label class="btn btn-primary" style="margin-top: 0.85rem">
          选择图片
          <input id="compress-source-input" type="file" accept="image/*" @change="onSourceChange" />
        </label>
      </div>

      <div v-if="sourceFile && sourceSize" class="source-row">
        <img :src="sourceUrl" alt="待压缩图片预览" class="preview-img" />
        <div class="source-meta">
          <p class="mono">{{ sourceFile.name }}</p>
          <p class="muted">{{ sourceSize.width }} × {{ sourceSize.height }} px · {{ formatBytes(sourceFile.size) }}</p>
          <button type="button" class="btn btn-ghost" @click="clearAll">清除</button>
        </div>
      </div>
      <p v-if="error" class="error-text">{{ error }}</p>
    </div>

    <div v-if="sourceFile && sourceSize" class="tool-panel">
      <h2 class="section-title mono">export settings</h2>
      <div class="field-row cols-2">
        <div>
          <label class="field-label" for="compress-format">导出格式</label>
          <select id="compress-format" v-model="outputFormat" class="select mono" @change="clearOutput">
            <option value="jpeg">JPEG</option>
            <option value="png">PNG（无损）</option>
            <option value="webp">WebP</option>
          </select>
        </div>
        <div>
          <label class="field-label" for="compress-edge">最大长边</label>
          <select id="compress-edge" v-model.number="maxLongEdge" class="select mono" @change="clearOutput">
            <option :value="0">保持原始尺寸</option>
            <option :value="1280">1280 px</option>
            <option :value="1920">1920 px</option>
            <option :value="2560">2560 px</option>
            <option :value="3840">3840 px</option>
          </select>
        </div>
        <div>
          <label class="field-label" for="compress-quality">质量：{{ Math.round(quality * 100) }}</label>
          <input
            id="compress-quality"
            v-model.number="quality"
            :disabled="!formatInfo.supportsQuality"
            type="range"
            min="0.1"
            max="1"
            step="0.05"
            @change="clearOutput"
          />
          <p v-if="!formatInfo.supportsQuality" class="hint">PNG 为无损格式，不使用质量参数。</p>
        </div>
        <div class="target-meta">
          <span class="field-label">预计输出尺寸</span>
          <strong v-if="targetSize" class="mono">{{ targetSize.width }} × {{ targetSize.height }} px</strong>
        </div>
      </div>
      <div class="toolbar" style="margin-top: 1rem; margin-bottom: 0">
        <button id="compress-run" type="button" class="btn btn-primary" :disabled="busy" @click="compress">
          {{ busy ? '压缩中…' : '开始压缩' }}
        </button>
        <button id="compress-download" type="button" class="btn" :disabled="!outputBlob || busy" @click="downloadOutput">下载图片</button>
      </div>
    </div>

    <div v-if="outputUrl && outputBlob && outputSize" class="tool-panel">
      <h2 class="section-title mono">result</h2>
      <div class="source-row">
        <img :src="outputUrl" alt="压缩结果预览" class="preview-img" />
        <div class="source-meta">
          <p class="success-text">压缩完成</p>
          <p class="mono">{{ outputSize.width }} × {{ outputSize.height }} px · {{ formatBytes(outputBlob.size) }}</p>
          <p class="muted">相对于原图：{{ outputChange }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.section-title {
  margin: 0 0 0.85rem;
  color: var(--text-faint);
  font-size: 0.72rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.source-row {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  align-items: flex-start;
  margin-top: 1rem;
}

.source-meta {
  min-width: 200px;
}

.source-meta p {
  margin: 0 0 0.5rem;
  overflow-wrap: anywhere;
}

.target-meta {
  display: flex;
  flex-direction: column;
  justify-content: center;
}

input[type='range'] {
  width: 100%;
  accent-color: var(--signal);
}
</style>
