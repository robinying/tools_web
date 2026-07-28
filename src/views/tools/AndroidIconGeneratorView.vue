<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import ToolHeader from '../../components/ToolHeader.vue'
import { calculateIconGeometry, createAdaptiveIconXml, iconFileName, ICON_DENSITIES } from '../../utils/androidIcon'
import { IMAGE_FILE_MAX_BYTES, readImageDimensions, validateFileSize, validateImageDimensions, type ImageDimensions } from '../../utils/fileInputPolicy'
import { copyText } from '../../utils/clipboard'

const file = ref<File | null>(null)
const dimensions = ref<ImageDimensions | null>(null)
const previewUrl = ref('')
const iconName = ref('ic_launcher')
const padding = ref(4)
const background = ref('#ffffff')
const busy = ref(false)
const error = ref('')
const copied = ref('')
let operationId = 0

const adaptiveXml = computed(() => createAdaptiveIconXml(iconName.value, `@color/icon_background`))

function revokePreview() { if (previewUrl.value) { URL.revokeObjectURL(previewUrl.value); previewUrl.value = '' } }
function clear() { operationId++; file.value = null; dimensions.value = null; error.value = ''; revokePreview() }
onBeforeUnmount(clear)

async function selectFile(next: File | null | undefined) {
  clear()
  const id = ++operationId
  if (!next) return
  if (!next.type.startsWith('image/')) { error.value = '请选择图片文件'; return }
  const sizeError = validateFileSize(next, IMAGE_FILE_MAX_BYTES)
  if (sizeError) { error.value = sizeError; return }
  try {
    const size = await readImageDimensions(next)
    const dimensionError = validateImageDimensions(size)
    if (dimensionError) throw new Error(dimensionError)
    if (id !== operationId) return
    file.value = next; dimensions.value = size; previewUrl.value = URL.createObjectURL(next)
  } catch (cause) { if (id === operationId) error.value = cause instanceof Error ? cause.message : '图片加载失败' }
}

function onFile(event: Event) { const input = event.target as HTMLInputElement; void selectFile(input.files?.[0]); input.value = '' }

async function downloadDensity(density: { directory: string; size: number }) {
  if (!file.value || !dimensions.value) return
  busy.value = true
  try {
    const bitmap = await createImageBitmap(file.value)
    try {
      const canvas = document.createElement('canvas'); canvas.width = density.size; canvas.height = density.size
      const context = canvas.getContext('2d'); if (!context) throw new Error('Canvas 不可用')
      context.fillStyle = background.value; context.fillRect(0, 0, density.size, density.size)
      const geometry = calculateIconGeometry(bitmap.width, bitmap.height, density.size, padding.value)
      context.drawImage(bitmap, geometry.sourceX, geometry.sourceY, geometry.sourceSize, geometry.sourceSize, geometry.destinationX, geometry.destinationY, geometry.destinationSize, geometry.destinationSize)
      const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((output) => output ? resolve(output) : reject(new Error('图片导出失败')), 'image/png'))
      const url = URL.createObjectURL(blob); const anchor = document.createElement('a')
      anchor.href = url; anchor.download = `${density.directory}/${iconFileName(iconName.value)}`; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 0)
    } finally { bitmap.close() }
  } catch (cause) { error.value = cause instanceof Error ? cause.message : '图标生成失败' }
  finally { busy.value = false }
}

async function copyXml() { copied.value = (await copyText(adaptiveXml.value)) ? '已复制 XML' : '复制失败' }
</script>

<template>
  <div class="page">
    <ToolHeader title="Android 图标生成" description="将本地图片生成标准 mipmap 密度图标和 Adaptive Icon XML。图片不会上传。" />
    <div class="tool-panel">
      <div class="field-row cols-2"><div><label class="field-label" for="icon-name">资源名</label><input id="icon-name" v-model="iconName" class="input mono" /></div><div><label class="field-label" for="icon-padding">内边距 (px)</label><input id="icon-padding" v-model.number="padding" class="input mono" type="number" min="0" max="48" /></div><div><label class="field-label" for="icon-background">背景色</label><input id="icon-background" v-model="background" class="input" type="color" /></div></div>
      <div class="toolbar" style="margin-top: .85rem"><label class="btn btn-primary">选择源图片<input id="icon-source-input" hidden type="file" accept="image/*" @change="onFile" /></label><button v-if="file" type="button" class="btn btn-ghost" @click="clear">清除</button></div>
      <div v-if="file && dimensions" class="preview-row"><img :src="previewUrl" alt="图标源图片预览" class="preview-img" /><p class="mono">{{ dimensions.width }} × {{ dimensions.height }} px</p></div><p v-if="error" class="error-text">{{ error }}</p>
    </div>
    <template v-if="file">
      <div class="tool-panel"><h2 class="section-title mono">legacy launcher PNG</h2><div class="density-grid"><button v-for="density in ICON_DENSITIES" :key="density.directory" type="button" class="btn" :disabled="busy" @click="downloadDensity(density)">{{ density.directory }} · {{ density.size }} px</button></div><p class="hint">每项单独下载，不会创建 ZIP。不同 Launcher / OEM 图标遮罩的最终效果可能不同。</p></div>
      <div class="tool-panel"><div class="toolbar"><h2 class="section-title mono" style="margin: 0">Adaptive Icon XML</h2><button type="button" class="btn" @click="copyXml">复制 XML</button><span v-if="copied" class="success-text">{{ copied }}</span></div><pre class="out mono">{{ adaptiveXml }}</pre><p class="hint">请按项目需要提供 @mipmap/{{ iconName }}_foreground 前景资源；Android 13 单色主题图标需另行设计 monochrome layer。</p></div>
    </template>
  </div>
</template>

<style scoped>
.preview-row { display: flex; gap: 1rem; align-items: flex-start; margin-top: 1rem; }
.density-grid { display: flex; flex-wrap: wrap; gap: .5rem; }
.section-title { color: var(--text-faint); font-size: .72rem; letter-spacing: .1em; text-transform: uppercase; }
.out { margin: 0; padding: .8rem; border: 1px solid var(--border); border-radius: var(--radius-sm); background: var(--well); white-space: pre-wrap; }
</style>
