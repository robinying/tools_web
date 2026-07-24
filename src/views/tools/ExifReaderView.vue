<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import exifr from 'exifr'
import ToolHeader from '../../components/ToolHeader.vue'
import { copyText } from '../../utils/clipboard'
import {
  IMAGE_FILE_MAX_BYTES,
  readImageDimensions,
  validateFileSize,
  validateImageDimensions,
} from '../../utils/fileInputPolicy'

interface FlatEntry {
  key: string
  value: string
}

const fileName = ref('')
const fileSize = ref(0)
const previewUrl = ref('')
const entries = ref<FlatEntry[]>([])
const rawJson = ref('')
const error = ref('')
const dragOver = ref(false)
const filter = ref('')
const copied = ref(false)
const copiedAll = ref(false)
const parsing = ref(false)
let parseOperationId = 0

const filtered = computed(() => {
  const q = filter.value.trim().toLowerCase()
  if (!q) return entries.value
  return entries.value.filter(
    (e) => e.key.toLowerCase().includes(q) || e.value.toLowerCase().includes(q),
  )
})

function revokePreview() {
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value)
    previewUrl.value = ''
  }
}

onBeforeUnmount(() => {
  parseOperationId++
  revokePreview()
})

function isSensitiveMetadataKey(key: string): boolean {
  return /gps|latitude|longitude|altitude|location|make|model|serial|owner|imageuniqueid|software|date|time/i.test(key)
}

function redactMetadata(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactMetadata)
  if (!value || typeof value !== 'object') return value
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([key]) => !isSensitiveMetadataKey(key))
      .map(([key, nestedValue]) => [key, redactMetadata(nestedValue)]),
  )
}

function stringifyMetadata(value: unknown): string {
  return JSON.stringify(value, (_key, nestedValue) => {
    if (nestedValue instanceof Date) return nestedValue.toISOString()
    if (typeof nestedValue === 'bigint') return nestedValue.toString()
    return nestedValue
  }, 2)
}

function formatValue(v: unknown): string {
  if (v == null) return ''
  if (v instanceof Date) return v.toISOString()
  if (typeof v === 'object') {
    try {
      return JSON.stringify(v)
    } catch {
      return String(v)
    }
  }
  return String(v)
}

function flatten(obj: Record<string, unknown>): FlatEntry[] {
  return Object.keys(obj)
    .sort((a, b) => a.localeCompare(b))
    .map((key) => ({ key, value: formatValue(obj[key]) }))
    .filter((e) => e.value !== '')
}

async function handleFile(file: File | null | undefined) {
  const operationId = ++parseOperationId
  error.value = ''
  copied.value = false
  copiedAll.value = false
  entries.value = []
  rawJson.value = ''
  revokePreview()

  if (!file) return

  if (!file.type.startsWith('image/') && !/\.(jpe?g|tiff?|heic|heif|png|webp)$/i.test(file.name)) {
    error.value = '请选择图片文件（JPEG / TIFF / HEIC / PNG / WebP 等）'
    return
  }

  const sizeError = validateFileSize(file, IMAGE_FILE_MAX_BYTES)
  if (sizeError) {
    error.value = sizeError
    return
  }

  parsing.value = true
  try {
    const dimensions = await readImageDimensions(file)
    const dimensionError = validateImageDimensions(dimensions)
    if (dimensionError) throw new Error(dimensionError)

    const data = await exifr.parse(file, {
      tiff: true,
      xmp: true,
      icc: false,
      iptc: true,
      jfif: true,
      ihdr: true,
      gps: true,
      interop: true,
      translateKeys: true,
      translateValues: true,
      reviveValues: true,
      sanitize: true,
      mergeOutput: true,
    })
    if (operationId !== parseOperationId) return

    fileName.value = file.name
    fileSize.value = file.size
    previewUrl.value = URL.createObjectURL(file)
    if (!data || Object.keys(data).length === 0) {
      error.value = '未解析到 EXIF / 元数据（部分截图或导出图可能已剥离元数据）'
      return
    }

    const record = data as Record<string, unknown>
    entries.value = flatten(record)
    rawJson.value = stringifyMetadata(record)
  } catch (e) {
    if (operationId !== parseOperationId) return
    error.value = e instanceof Error ? e.message : '解析失败'
  } finally {
    if (operationId === parseOperationId) parsing.value = false
  }
}

function onInputChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  void handleFile(file)
  input.value = ''
}

function onDrop(e: DragEvent) {
  dragOver.value = false
  const file = e.dataTransfer?.files?.[0]
  void handleFile(file)
}

async function copyJson(includeSensitive: boolean) {
  if (!rawJson.value) return
  const text = includeSensitive ? rawJson.value : stringifyMetadata(redactMetadata(JSON.parse(rawJson.value)))
  const ok = await copyText(text)
  if (includeSensitive) copiedAll.value = ok
  else copied.value = ok
}

function clearAll() {
  parseOperationId++
  fileName.value = ''
  fileSize.value = 0
  entries.value = []
  rawJson.value = ''
  error.value = ''
  filter.value = ''
  copied.value = false
  copiedAll.value = false
  revokePreview()
}

function humanSize(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / 1024 / 1024).toFixed(2)} MB`
}
</script>

<template>
  <div class="page">
    <ToolHeader
      title="EXIF 读取"
      description="在浏览器本地解析图片元数据（EXIF / GPS / 设备等）。文件不会上传到任何服务器。"
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
        <p class="hint">JPEG / TIFF / HEIC / PNG / WebP · 纯本地解析 · 单个文件最大 25 MiB，图片最大 24 MP</p>
        <label class="btn btn-primary" style="margin-top: 0.9rem">
          选择图片
          <input type="file" accept="image/*,.heic,.heif,.tif,.tiff" @change="onInputChange" />
        </label>
      </div>

      <div v-if="fileName" class="file-meta">
        <div>
          <div class="field-label">文件</div>
          <div class="mono">{{ fileName }} · {{ humanSize(fileSize) }}</div>
        </div>
        <button type="button" class="btn btn-ghost" @click="clearAll">清除</button>
      </div>

      <div v-if="previewUrl" class="preview-row">
        <img :src="previewUrl" alt="预览" class="preview-img" />
        <div class="preview-side">
          <p v-if="parsing" class="muted">正在解析…</p>
          <p v-else-if="entries.length" class="success-text">已解析 {{ entries.length }} 个字段</p>
          <p v-else-if="error" class="error-text">{{ error }}</p>
          <p class="hint">GPS、拍摄参数、机型等信息若存在会显示在下方表格中。</p>
        </div>
      </div>

      <p v-if="error && !previewUrl" class="error-text" style="margin-top: 0.85rem">{{ error }}</p>
    </div>

    <div v-if="entries.length" class="tool-panel">
      <div class="toolbar">
        <input
          v-model="filter"
          class="input"
          style="max-width: 280px"
          type="search"
          placeholder="过滤字段名 / 值…"
        />
        <button type="button" class="btn" :disabled="!rawJson" @click="copyJson(false)">
          复制脱敏 JSON
        </button>
        <button type="button" class="btn btn-ghost" :disabled="!rawJson" @click="copyJson(true)">
          复制全部元数据
        </button>
        <span v-if="copied" class="success-text">已复制脱敏 JSON</span>
        <span v-if="copiedAll" class="success-text">已复制全部元数据</span>
        <span class="faint">显示 {{ filtered.length }} / {{ entries.length }}</span>
      </div>
      <p class="hint">脱敏复制会移除位置、设备和时间字段；“复制全部元数据”可能包含敏感信息。</p>

      <div class="table-wrap" style="max-height: 480px">
        <table class="data">
          <thead>
            <tr>
              <th style="width: 34%">字段</th>
              <th>值</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in filtered" :key="item.key">
              <td :class="{ sensitive: isSensitiveMetadataKey(item.key) }">{{ item.key }}</td>
              <td class="mono">{{ item.value }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<style scoped>
.sensitive {
  color: var(--warning);
}

.file-meta {
  margin-top: 1rem;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.preview-row {
  margin-top: 1rem;
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  align-items: flex-start;
}

.preview-side {
  flex: 1;
  min-width: 200px;
}

.preview-side p {
  margin: 0 0 0.45rem;
}
</style>
