<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import QRCode from 'qrcode'
import jsQR from 'jsqr'
import ToolHeader from '../../components/ToolHeader.vue'
import { copyText } from '../../utils/clipboard'

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

async function generate() {
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
    dataUrl.value = await QRCode.toDataURL(content, {
      width: size.value,
      margin: 2,
      errorCorrectionLevel: level.value,
      color: {
        dark: '#141820',
        light: '#ffffff',
      },
    })
  } catch (e) {
    dataUrl.value = ''
    genError.value = e instanceof Error ? e.message : '生成失败'
  } finally {
    genBusy.value = false
  }
}

watch([text, size, level], () => {
  void generate()
}, { immediate: true })

function revokePreview() {
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value)
    previewUrl.value = ''
  }
}

onBeforeUnmount(() => {
  stopCamera()
  revokePreview()
})

async function decodeFromFile(file: File | null | undefined) {
  decodeError.value = ''
  decodeResult.value = ''
  revokePreview()
  if (!file) return
  if (!file.type.startsWith('image/')) {
    decodeError.value = '请选择图片文件'
    return
  }
  previewUrl.value = URL.createObjectURL(file)
  decodeBusy.value = true
  try {
    const result = await decodeImageUrl(previewUrl.value)
    if (result) decodeResult.value = result
    else decodeError.value = '未识别到二维码，请换更清晰的图或裁剪后再试'
  } catch (e) {
    decodeError.value = e instanceof Error ? e.message : '解析失败'
  } finally {
    decodeBusy.value = false
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

function decodeImageUrl(url: string): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        const maxSide = 1200
        let w = img.naturalWidth || img.width
        let h = img.naturalHeight || img.height
        if (w > maxSide || h > maxSide) {
          const scale = maxSide / Math.max(w, h)
          w = Math.round(w * scale)
          h = Math.round(h * scale)
        }
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d', { willReadFrequently: true })
        if (!ctx) {
          reject(new Error('Canvas 不可用'))
          return
        }
        ctx.drawImage(img, 0, 0, w, h)
        const imageData = ctx.getImageData(0, 0, w, h)
        const code = jsQR(imageData.data, w, h, { inversionAttempts: 'attemptBoth' })
        resolve(code?.data ?? null)
      } catch (err) {
        reject(err)
      }
    }
    img.onerror = () => reject(new Error('图片加载失败'))
    img.src = url
  })
}

async function startCamera() {
  decodeError.value = ''
  decodeResult.value = ''
  stopCamera()
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' } },
      audio: false,
    })
    const video = videoRef.value
    if (!video) throw new Error('视频组件未就绪')
    video.srcObject = stream
    await video.play()
    scanning.value = true
    tickScan()
  } catch (e) {
    scanning.value = false
    decodeError.value =
      e instanceof Error
        ? `无法打开摄像头：${e.message}`
        : '无法打开摄像头（权限被拒或设备不支持）'
  }
}

function stopCamera() {
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

function tickScan() {
  if (!scanning.value) return
  const video = videoRef.value
  const canvas = canvasRef.value
  if (video && canvas && video.readyState >= 2) {
    const w = video.videoWidth
    const h = video.videoHeight
    if (w && h) {
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      if (ctx) {
        ctx.drawImage(video, 0, 0, w, h)
        const imageData = ctx.getImageData(0, 0, w, h)
        const code = jsQR(imageData.data, w, h, { inversionAttempts: 'attemptBoth' })
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
        <p class="hint">PNG / JPG / WebP · 纯本地 jsQR 解析</p>
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
