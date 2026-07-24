<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import QRCode from 'qrcode'
import jsQR from 'jsqr'
import ToolHeader from '../../components/ToolHeader.vue'
import { copyText } from '../../utils/clipboard'
import {
  IMAGE_FILE_MAX_BYTES,
  readImageDimensions,
  scaleToMaxEdge,
  validateFileSize,
  validateImageDimensions,
} from '../../utils/fileInputPolicy'

const text = ref('https://example.com')
const size = ref(280)
const level = ref<'L' | 'M' | 'Q' | 'H'>('M')
const dataUrl = ref('')
const genError = ref('')
const genBusy = ref(false)

const decodeResult = ref('')
const decodeError = ref('')
const decodeBusy = ref(false)
const previewUrl = ref('')
const copied = ref('')

const videoRef = ref<HTMLVideoElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)
const scanning = ref(false)
let stream: MediaStream | null = null
let raf = 0
let generateRequestId = 0
let generateDebounceTimer: ReturnType<typeof setTimeout> | null = null
let fileDecodeOperationId = 0
let cameraSessionId = 0
let lastScanAt = 0

async function generate() {
  const requestId = ++generateRequestId
  genError.value = ''
  copied.value = ''
  const content = text.value
  if (!content.trim()) {
    dataUrl.value = ''
    genError.value = '内容不能为空'
    return
  }
  genBusy.value = true
  try {
    const nextDataUrl = await QRCode.toDataURL(content, {
      width: size.value,
      margin: 2,
      errorCorrectionLevel: level.value,
      color: {
        dark: '#141820',
        light: '#ffffff',
      },
    })
    if (requestId === generateRequestId) dataUrl.value = nextDataUrl
  } catch (e) {
    if (requestId !== generateRequestId) return
    dataUrl.value = ''
    genError.value = e instanceof Error ? e.message : '生成失败'
  } finally {
    if (requestId === generateRequestId) genBusy.value = false
  }
}

function scheduleGenerate() {
  if (generateDebounceTimer) clearTimeout(generateDebounceTimer)
  generateDebounceTimer = setTimeout(() => {
    generateDebounceTimer = null
    void generate()
  }, 200)
}

watch([text, size, level], scheduleGenerate, { immediate: true })

function revokePreview() {
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value)
    previewUrl.value = ''
  }
}

function stopWhenHidden() {
  if (document.hidden) stopCamera()
}

onMounted(() => {
  document.addEventListener('visibilitychange', stopWhenHidden)
  window.addEventListener('pagehide', stopCamera)
})

onBeforeUnmount(() => {
  if (generateDebounceTimer) clearTimeout(generateDebounceTimer)
  document.removeEventListener('visibilitychange', stopWhenHidden)
  window.removeEventListener('pagehide', stopCamera)
  stopCamera()
  revokePreview()
})

async function decodeFromFile(file: File | null | undefined) {
  const operationId = ++fileDecodeOperationId
  decodeError.value = ''
  decodeResult.value = ''
  revokePreview()
  if (!file) return
  if (!file.type.startsWith('image/')) {
    decodeError.value = '请选择图片文件'
    return
  }

  const sizeError = validateFileSize(file, IMAGE_FILE_MAX_BYTES)
  if (sizeError) {
    decodeError.value = sizeError
    return
  }

  decodeBusy.value = true
  try {
    const dimensions = await readImageDimensions(file)
    const dimensionError = validateImageDimensions(dimensions)
    if (dimensionError) throw new Error(dimensionError)
    const result = await decodeImageFile(file, dimensions.width, dimensions.height)
    if (operationId !== fileDecodeOperationId) return
    previewUrl.value = URL.createObjectURL(file)
    if (result) decodeResult.value = result
    else decodeError.value = '未识别到二维码，请换更清晰的图或裁剪后再试'
  } catch (e) {
    if (operationId !== fileDecodeOperationId) return
    decodeError.value = e instanceof Error ? e.message : '解析失败'
  } finally {
    if (operationId === fileDecodeOperationId) decodeBusy.value = false
  }
}

function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  void decodeFromFile(input.files?.[0])
  input.value = ''
}

function onDrop(e: DragEvent) {
  void decodeFromFile(e.dataTransfer?.files?.[0])
}

async function decodeImageFile(file: File, width: number, height: number): Promise<string | null> {
  const target = scaleToMaxEdge({ width, height }, 1200)
  if (!('createImageBitmap' in window)) {
    throw new Error('当前浏览器不支持受限图片解码')
  }
  const bitmap = await createImageBitmap(file, {
    resizeWidth: target.width,
    resizeHeight: target.height,
    resizeQuality: 'high',
  })
  try {
    const canvas = document.createElement('canvas')
    canvas.width = bitmap.width
    canvas.height = bitmap.height
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) throw new Error('Canvas 不可用')
    ctx.drawImage(bitmap, 0, 0)
    const imageData = ctx.getImageData(0, 0, bitmap.width, bitmap.height)
    return jsQR(imageData.data, bitmap.width, bitmap.height, { inversionAttempts: 'attemptBoth' })?.data ?? null
  } finally {
    bitmap.close()
  }
}

async function startCamera() {
  stopCamera()
  const sessionId = cameraSessionId
  decodeError.value = ''
  try {
    const nextStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' } },
      audio: false,
    })
    if (sessionId !== cameraSessionId) {
      nextStream.getTracks().forEach((track) => track.stop())
      return
    }
    const video = videoRef.value
    if (!video) {
      nextStream.getTracks().forEach((track) => track.stop())
      throw new Error('视频组件未就绪')
    }
    stream = nextStream
    video.srcObject = stream
    await video.play()
    if (sessionId !== cameraSessionId) {
      stopCamera()
      return
    }
    lastScanAt = 0
    scanning.value = true
    tickScan()
  } catch (e) {
    if (sessionId !== cameraSessionId) return
    scanning.value = false
    decodeError.value =
      e instanceof Error
        ? `无法打开摄像头：${e.message}`
        : '无法打开摄像头（权限被拒或设备不支持）'
  }
}

function stopCamera() {
  cameraSessionId++
  scanning.value = false
  if (raf) {
    cancelAnimationFrame(raf)
    raf = 0
  }
  if (stream) {
    for (const t of stream.getTracks()) t.stop()
    stream = null
  }
  const video = videoRef.value
  if (video) {
    video.srcObject = null
  }
}

function tickScan(timestamp = performance.now()) {
  if (!scanning.value) return
  const video = videoRef.value
  const canvas = canvasRef.value
  if (video && canvas && video.readyState >= 2 && timestamp - lastScanAt >= 100) {
    const target = scaleToMaxEdge({ width: video.videoWidth, height: video.videoHeight }, 720)
    if (target.width && target.height) {
      if (canvas.width !== target.width || canvas.height !== target.height) {
        canvas.width = target.width
        canvas.height = target.height
      }
      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      if (ctx) {
        ctx.drawImage(video, 0, 0, target.width, target.height)
        const imageData = ctx.getImageData(0, 0, target.width, target.height)
        const code = jsQR(imageData.data, target.width, target.height, { inversionAttempts: 'attemptBoth' })
        lastScanAt = timestamp
        if (code?.data) {
          decodeResult.value = code.data
          decodeError.value = ''
          stopCamera()
          return
        }
      }
    }
  }
  raf = requestAnimationFrame(tickScan)
}

async function copy(textVal: string) {
  const ok = await copyText(textVal)
  copied.value = ok ? '已复制' : '复制失败'
}

function downloadPng() {
  if (!dataUrl.value) return
  const a = document.createElement('a')
  a.href = dataUrl.value
  a.download = 'qrcode.png'
  a.click()
}

function useDecodedAsGenerate() {
  if (!decodeResult.value) return
  text.value = decodeResult.value
}
</script>

<template>
  <div class="page">
    <ToolHeader
      title="二维码生成 / 解析"
      description="本地生成与识别二维码。图片与摄像头数据不上传服务器。"
    />

    <div class="tool-panel">
      <h2 class="section-title mono">generate</h2>
      <div class="field-row cols-2">
        <div class="span-2">
          <label class="field-label" for="qr-text">内容</label>
          <textarea
            id="qr-text"
            v-model="text"
            class="textarea"
            rows="4"
            placeholder="文本、URL、Deep Link…"
          />
        </div>
        <div>
          <label class="field-label" for="qr-size">尺寸 (px)</label>
          <input id="qr-size" v-model.number="size" class="input mono" type="number" min="120" max="800" step="10" />
        </div>
        <div>
          <label class="field-label" for="qr-level">容错级别</label>
          <select id="qr-level" v-model="level" class="select mono">
            <option value="L">L (~7%)</option>
            <option value="M">M (~15%)</option>
            <option value="Q">Q (~25%)</option>
            <option value="H">H (~30%)</option>
          </select>
        </div>
      </div>

      <div class="toolbar" style="margin-top: 0.85rem">
        <button type="button" class="btn btn-primary" :disabled="genBusy" @click="generate">
          重新生成
        </button>
        <button type="button" class="btn" :disabled="!dataUrl" @click="downloadPng">下载 PNG</button>
        <span v-if="copied" class="success-text">{{ copied }}</span>
      </div>
      <p v-if="genError" class="error-text">{{ genError }}</p>
      <div v-if="dataUrl" class="preview-box">
        <img :src="dataUrl" alt="生成的二维码" class="qr-img" />
      </div>
    </div>

    <div class="tool-panel">
      <h2 class="section-title mono">decode</h2>
      <div
        class="dropzone"
        @dragover.prevent
        @drop.prevent="onDrop"
      >
        <p><strong>拖拽二维码图片到此处</strong>，或选择文件</p>
        <p class="hint">PNG / JPG / WebP · 纯本地 jsQR 解析 · 单个文件最大 25 MiB，图片最大 24 MP</p>
        <label class="btn btn-primary" style="margin-top: 0.75rem">
          选择图片
          <input type="file" accept="image/*" @change="onFileChange" />
        </label>
      </div>

      <div class="toolbar" style="margin-top: 0.85rem">
        <button
          v-if="!scanning"
          type="button"
          class="btn"
          @click="startCamera"
        >
          打开摄像头扫码
        </button>
        <button v-else type="button" class="btn btn-primary" @click="stopCamera">停止摄像头</button>
        <span v-if="decodeBusy" class="muted">解析中…</span>
      </div>

      <div v-if="scanning" class="cam-box">
        <video ref="videoRef" class="cam" playsinline muted />
        <canvas ref="canvasRef" class="hidden-canvas" />
        <p class="hint">将二维码对准画面，识别成功后自动停止</p>
      </div>

      <div v-if="previewUrl && !scanning" class="preview-box">
        <img :src="previewUrl" alt="待解析图片" class="preview-img" />
      </div>

      <p v-if="decodeError" class="error-text">{{ decodeError }}</p>

      <template v-if="decodeResult">
        <label class="field-label" style="margin-top: 0.75rem">识别结果</label>
        <textarea class="textarea" rows="4" readonly :value="decodeResult" />
        <div class="toolbar" style="margin-top: 0.5rem; margin-bottom: 0">
          <button type="button" class="btn" @click="copy(decodeResult)">复制结果</button>
          <button type="button" class="btn btn-ghost" @click="useDecodedAsGenerate">填入生成区</button>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.section-title {
  margin: 0 0 0.85rem;
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-faint);
}

.span-2 {
  grid-column: 1 / -1;
}

.preview-box {
  margin-top: 0.85rem;
  display: flex;
  justify-content: flex-start;
}

.qr-img {
  width: min(100%, 280px);
  height: auto;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  background: #fff;
  image-rendering: pixelated;
}

.cam-box {
  margin-top: 0.75rem;
}

.cam {
  width: min(100%, 420px);
  max-height: 320px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  background: #000;
  object-fit: cover;
}

.hidden-canvas {
  display: none;
}
</style>
