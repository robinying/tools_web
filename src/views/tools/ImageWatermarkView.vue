<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import ToolHeader from '../../components/ToolHeader.vue'
import {
  calculateWatermarkPosition,
  canvasToBlob,
  getOutputFormatInfo,
  makeOutputFileName,
  type ImageSize,
  type OutputFormat,
  type WatermarkPosition,
} from '../../utils/imageProcessing'
import {
  IMAGE_FILE_MAX_BYTES,
  readImageDimensions,
  validateFileSize,
  validateImageDimensions,
  type ImageDimensions,
} from '../../utils/fileInputPolicy'

const POSITIONS: Array<{ value: WatermarkPosition; label: string }> = [
  { value: 'top-left', label: '左上' },
  { value: 'top-center', label: '上方居中' },
  { value: 'top-right', label: '右上' },
  { value: 'middle-left', label: '左侧居中' },
  { value: 'center', label: '居中' },
  { value: 'middle-right', label: '右侧居中' },
  { value: 'bottom-left', label: '左下' },
  { value: 'bottom-center', label: '下方居中' },
  { value: 'bottom-right', label: '右下' },
]

const sourceFile = ref<File | null>(null)
const sourceDimensions = ref<ImageDimensions | null>(null)
const sourceUrl = ref('')
const watermarkFile = ref<File | null>(null)
const watermarkDimensions = ref<ImageDimensions | null>(null)
const watermarkUrl = ref('')
const outputBlob = ref<Blob | null>(null)
const outputUrl = ref('')
const outputFormat = ref<OutputFormat>('png')
const quality = ref(0.8)
const text = ref('© Android Lab')
const textPosition = ref<WatermarkPosition>('bottom-right')
const textScale = ref(0.05)
const textColor = ref('#ffffff')
const textOpacity = ref(0.75)
const textMargin = ref(24)
const imagePosition = ref<WatermarkPosition>('bottom-left')
const imageScale = ref(0.2)
const imageOpacity = ref(0.8)
const imageMargin = ref(24)
const busy = ref(false)
const error = ref('')
const sourceDragOver = ref(false)
const watermarkDragOver = ref(false)
let operationId = 0

const formatInfo = computed(() => getOutputFormatInfo(outputFormat.value))
const hasWatermark = computed(() => Boolean(text.value.trim() || watermarkFile.value))

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KiB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MiB`
}

function revokeUrl(url: { value: string }) {
  if (url.value) {
    URL.revokeObjectURL(url.value)
    url.value = ''
  }
}

function clearOutput() {
  outputBlob.value = null
  revokeUrl(outputUrl)
}

function clearSource() {
  sourceFile.value = null
  sourceDimensions.value = null
  revokeUrl(sourceUrl)
}

function clearWatermarkImage() {
  watermarkFile.value = null
  watermarkDimensions.value = null
  revokeUrl(watermarkUrl)
  clearOutput()
}

function clearAll() {
  operationId++
  busy.value = false
  error.value = ''
  clearOutput()
  clearSource()
  clearWatermarkImage()
}

onBeforeUnmount(clearAll)

async function loadImage(file: File): Promise<ImageDimensions> {
  if (!file.type.startsWith('image/')) throw new Error('请选择浏览器可解码的图片文件')
  const sizeError = validateFileSize(file, IMAGE_FILE_MAX_BYTES)
  if (sizeError) throw new Error(sizeError)
  const dimensions = await readImageDimensions(file)
  const dimensionsError = validateImageDimensions(dimensions)
  if (dimensionsError) throw new Error(dimensionsError)
  return dimensions
}

async function setSourceFile(file: File | null | undefined) {
  const requestId = ++operationId
  error.value = ''
  clearOutput()
  clearSource()
  if (!file) return
  try {
    const dimensions = await loadImage(file)
    if (requestId !== operationId) return
    sourceFile.value = file
    sourceDimensions.value = dimensions
    sourceUrl.value = URL.createObjectURL(file)
  } catch (cause) {
    if (requestId !== operationId) return
    error.value = cause instanceof Error ? cause.message : '图片加载失败'
  }
}

async function setWatermarkFile(file: File | null | undefined) {
  const requestId = ++operationId
  error.value = ''
  clearWatermarkImage()
  if (!file) return
  try {
    const dimensions = await loadImage(file)
    if (requestId !== operationId) return
    watermarkFile.value = file
    watermarkDimensions.value = dimensions
    watermarkUrl.value = URL.createObjectURL(file)
  } catch (cause) {
    if (requestId !== operationId) return
    error.value = cause instanceof Error ? cause.message : '水印图片加载失败'
  }
}

function onSourceChange(event: Event) {
  const input = event.target as HTMLInputElement
  void setSourceFile(input.files?.[0])
  input.value = ''
}

function onWatermarkChange(event: Event) {
  const input = event.target as HTMLInputElement
  void setWatermarkFile(input.files?.[0])
  input.value = ''
}

function handleSourceDrop(event: DragEvent) {
  sourceDragOver.value = false
  void setSourceFile(event.dataTransfer?.files?.[0])
}

function handleWatermarkDrop(event: DragEvent) {
  watermarkDragOver.value = false
  void setWatermarkFile(event.dataTransfer?.files?.[0])
}

function resetOutputForSettings() {
  operationId++
  busy.value = false
  clearOutput()
}

function drawTextWatermark(context: CanvasRenderingContext2D, canvasSize: ImageSize) {
  const content = text.value.trim()
  if (!content) return
  const fontSize = Math.max(14, Math.round(Math.max(canvasSize.width, canvasSize.height) * textScale.value))
  context.font = `600 ${fontSize}px sans-serif`
  const width = Math.ceil(context.measureText(content).width)
  const point = calculateWatermarkPosition(
    canvasSize,
    { width, height: fontSize },
    textPosition.value,
    textMargin.value,
  )
  context.save()
  context.globalAlpha = textOpacity.value
  context.fillStyle = textColor.value
  context.shadowColor = 'rgba(0, 0, 0, 0.55)'
  context.shadowBlur = Math.max(2, Math.round(fontSize * 0.08))
  context.fillText(content, point.x, point.y + fontSize)
  context.restore()
}

function drawImageWatermark(
  context: CanvasRenderingContext2D,
  canvasSize: ImageSize,
  bitmap: ImageBitmap | null,
) {
  if (!bitmap) return
  const width = Math.max(1, Math.round(canvasSize.width * imageScale.value))
  const height = Math.max(1, Math.round((bitmap.height / bitmap.width) * width))
  const point = calculateWatermarkPosition(
    canvasSize,
    { width, height },
    imagePosition.value,
    imageMargin.value,
  )
  context.save()
  context.globalAlpha = imageOpacity.value
  context.drawImage(bitmap, point.x, point.y, width, height)
  context.restore()
}

async function renderWatermark() {
  const source = sourceFile.value
  const dimensions = sourceDimensions.value
  if (!source || !dimensions) return
  if (!hasWatermark.value) {
    error.value = '请输入文字水印或选择水印图片'
    return
  }

  const requestId = ++operationId
  busy.value = true
  error.value = ''
  clearOutput()
  let sourceBitmap: ImageBitmap | null = null
  let markBitmap: ImageBitmap | null = null
  try {
    sourceBitmap = await createImageBitmap(source)
    if (watermarkFile.value) markBitmap = await createImageBitmap(watermarkFile.value)
    if (requestId !== operationId) return

    const canvas = document.createElement('canvas')
    canvas.width = dimensions.width
    canvas.height = dimensions.height
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Canvas 不可用')
    if (outputFormat.value === 'jpeg') {
      context.fillStyle = '#ffffff'
      context.fillRect(0, 0, canvas.width, canvas.height)
    }
    context.drawImage(sourceBitmap, 0, 0, canvas.width, canvas.height)
    drawTextWatermark(context, dimensions)
    drawImageWatermark(context, dimensions, markBitmap)
    const blob = await canvasToBlob(canvas, outputFormat.value, quality.value)
    if (requestId !== operationId) return
    outputBlob.value = blob
    outputUrl.value = URL.createObjectURL(blob)
  } catch (cause) {
    if (requestId !== operationId) return
    error.value = cause instanceof Error ? cause.message : '添加水印失败'
  } finally {
    sourceBitmap?.close()
    markBitmap?.close()
    if (requestId === operationId) busy.value = false
  }
}

function downloadOutput() {
  const blob = outputBlob.value
  const source = sourceFile.value
  if (!blob || !source) return
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = makeOutputFileName(source.name, '-watermarked', outputFormat.value)
  anchor.click()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}
</script>

<template>
  <div class="page">
    <ToolHeader
      title="图片加水印"
      description="为图片添加文字或图片水印。所有处理在浏览器本地完成；导出文件不保留原始 EXIF 元数据。"
    />

    <div class="tool-panel">
      <h2 class="section-title mono">source image</h2>
      <div
        class="dropzone"
        :class="{ active: sourceDragOver }"
        @dragover.prevent="sourceDragOver = true"
        @dragleave.prevent="sourceDragOver = false"
        @drop.prevent="handleSourceDrop"
      >
        <p><strong>拖拽原始图片到此处</strong>，或点击选择文件</p>
        <p class="hint">纯本地处理 · 单个文件最大 25 MiB，图片最大 24 MP</p>
        <label class="btn btn-primary" style="margin-top: 0.85rem">
          选择原始图片
          <input id="watermark-source-input" type="file" accept="image/*" @change="onSourceChange" />
        </label>
      </div>
      <div v-if="sourceFile && sourceDimensions" class="image-row">
        <img :src="sourceUrl" alt="原始图片预览" class="preview-img" />
        <div class="image-meta">
          <p class="mono">{{ sourceFile.name }}</p>
          <p class="muted">{{ sourceDimensions.width }} × {{ sourceDimensions.height }} px · {{ formatBytes(sourceFile.size) }}</p>
          <button type="button" class="btn btn-ghost" @click="clearAll">清除全部</button>
        </div>
      </div>
      <p v-if="error" class="error-text">{{ error }}</p>
    </div>

    <template v-if="sourceFile && sourceDimensions">
      <div class="tool-panel">
        <h2 class="section-title mono">text watermark</h2>
        <div class="field-row cols-2">
          <div class="span-2">
            <label class="field-label" for="watermark-text">水印文字</label>
            <input id="watermark-text" v-model="text" class="input" maxlength="120" @input="resetOutputForSettings" />
            <p class="hint">留空即可只使用图片水印。</p>
          </div>
          <div>
            <label class="field-label" for="text-position">位置</label>
            <select id="text-position" v-model="textPosition" class="select" @change="resetOutputForSettings">
              <option v-for="position in POSITIONS" :key="position.value" :value="position.value">{{ position.label }}</option>
            </select>
          </div>
          <div>
            <label class="field-label" for="text-color">颜色</label>
            <input id="text-color" v-model="textColor" class="color-input" type="color" @input="resetOutputForSettings" />
          </div>
          <div>
            <label class="field-label" for="text-scale">文字大小：{{ Math.round(textScale * 100) }}%</label>
            <input id="text-scale" v-model.number="textScale" type="range" min="0.02" max="0.15" step="0.01" @input="resetOutputForSettings" />
          </div>
          <div>
            <label class="field-label" for="text-opacity">透明度：{{ Math.round(textOpacity * 100) }}%</label>
            <input id="text-opacity" v-model.number="textOpacity" type="range" min="0.1" max="1" step="0.05" @input="resetOutputForSettings" />
          </div>
          <div>
            <label class="field-label" for="text-margin">边距 (px)</label>
            <input id="text-margin" v-model.number="textMargin" class="input mono" type="number" min="0" max="500" @change="resetOutputForSettings" />
          </div>
        </div>
      </div>

      <div class="tool-panel">
        <h2 class="section-title mono">image watermark</h2>
        <div
          class="dropzone compact"
          :class="{ active: watermarkDragOver }"
          @dragover.prevent="watermarkDragOver = true"
          @dragleave.prevent="watermarkDragOver = false"
          @drop.prevent="handleWatermarkDrop"
        >
          <p><strong>拖拽 Logo / 图片水印到此处</strong>，或点击选择文件</p>
          <p class="hint">可选；支持透明 PNG，文件不会上传。</p>
          <label class="btn" style="margin-top: 0.7rem">
            选择水印图片
            <input id="watermark-image-input" type="file" accept="image/*" @change="onWatermarkChange" />
          </label>
        </div>
        <div v-if="watermarkFile && watermarkDimensions" class="image-row">
          <img :src="watermarkUrl" alt="图片水印预览" class="watermark-preview" />
          <div class="image-meta">
            <p class="mono">{{ watermarkFile.name }}</p>
            <p class="muted">{{ watermarkDimensions.width }} × {{ watermarkDimensions.height }} px · {{ formatBytes(watermarkFile.size) }}</p>
            <button type="button" class="btn btn-ghost" @click="clearWatermarkImage">移除图片水印</button>
          </div>
        </div>
        <div v-if="watermarkFile" class="field-row cols-2 controls" style="margin-top: 1rem">
          <div>
            <label class="field-label" for="image-position">位置</label>
            <select id="image-position" v-model="imagePosition" class="select" @change="resetOutputForSettings">
              <option v-for="position in POSITIONS" :key="position.value" :value="position.value">{{ position.label }}</option>
            </select>
          </div>
          <div>
            <label class="field-label" for="image-scale">图片宽度：{{ Math.round(imageScale * 100) }}%</label>
            <input id="image-scale" v-model.number="imageScale" type="range" min="0.05" max="0.5" step="0.01" @input="resetOutputForSettings" />
          </div>
          <div>
            <label class="field-label" for="image-opacity">透明度：{{ Math.round(imageOpacity * 100) }}%</label>
            <input id="image-opacity" v-model.number="imageOpacity" type="range" min="0.1" max="1" step="0.05" @input="resetOutputForSettings" />
          </div>
          <div>
            <label class="field-label" for="image-margin">边距 (px)</label>
            <input id="image-margin" v-model.number="imageMargin" class="input mono" type="number" min="0" max="500" @change="resetOutputForSettings" />
          </div>
        </div>
      </div>

      <div class="tool-panel">
        <h2 class="section-title mono">export settings</h2>
        <div class="field-row cols-2">
          <div>
            <label class="field-label" for="watermark-format">导出格式</label>
            <select id="watermark-format" v-model="outputFormat" class="select mono" @change="resetOutputForSettings">
              <option value="png">PNG（推荐透明 Logo）</option>
              <option value="jpeg">JPEG</option>
              <option value="webp">WebP</option>
            </select>
          </div>
          <div>
            <label class="field-label" for="watermark-quality">质量：{{ Math.round(quality * 100) }}</label>
            <input
              id="watermark-quality"
              v-model.number="quality"
              :disabled="!formatInfo.supportsQuality"
              type="range"
              min="0.1"
              max="1"
              step="0.05"
              @input="resetOutputForSettings"
            />
            <p v-if="!formatInfo.supportsQuality" class="hint">PNG 为无损格式，不使用质量参数。</p>
          </div>
        </div>
        <div class="toolbar" style="margin-top: 1rem; margin-bottom: 0">
          <button id="watermark-run" type="button" class="btn btn-primary" :disabled="busy || !hasWatermark" @click="renderWatermark">
            {{ busy ? '处理中…' : '生成水印图片' }}
          </button>
          <button id="watermark-download" type="button" class="btn" :disabled="!outputBlob || busy" @click="downloadOutput">下载图片</button>
        </div>
      </div>

      <div v-if="outputUrl && outputBlob" class="tool-panel">
        <h2 class="section-title mono">result</h2>
        <div class="image-row">
          <img :src="outputUrl" alt="已添加水印的图片预览" class="preview-img" />
          <div class="image-meta">
            <p class="success-text">水印已生成</p>
            <p class="mono">{{ formatBytes(outputBlob.size) }} · {{ getOutputFormatInfo(outputFormat).extension.toUpperCase() }}</p>
          </div>
        </div>
      </div>
    </template>
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

.span-2 {
  grid-column: 1 / -1;
}

.image-row {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  align-items: flex-start;
  margin-top: 1rem;
}

.image-meta {
  min-width: 200px;
}

.image-meta p {
  margin: 0 0 0.5rem;
  overflow-wrap: anywhere;
}

.watermark-preview {
  width: min(180px, 100%);
  max-height: 120px;
  object-fit: contain;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--well);
}

.compact {
  padding-block: 1.1rem;
}

input[type='range'] {
  width: 100%;
  accent-color: var(--signal);
}

.color-input {
  width: 100%;
  min-height: 2.75rem;
  padding: 0.2rem;
  background: var(--bg-input);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
}
</style>
