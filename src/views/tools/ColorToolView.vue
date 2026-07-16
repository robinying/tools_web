<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import ToolHeader from '../../components/ToolHeader.vue'
import {
  parseColor,
  parseColorCssRgba,
  toAndroidArgb,
  toAndroidColorInt,
  toCssRgba,
  toCssRgbaHex,
  toHexRgb,
  type Rgba,
} from '../../utils/color'
import { copyText } from '../../utils/clipboard'

const input = ref('#FF6200EE')
const eightBitMode = ref<'android' | 'css'>('android')
const error = ref('')
const copied = ref('')
const color = ref<Rgba | null>(null)

function parse() {
  error.value = ''
  const raw = input.value.trim()
  let c: Rgba | null = null
  const stripped = raw.replace(/^#/, '').replace(/^0x/i, '')
  if (stripped.length === 8) {
    c = eightBitMode.value === 'css' ? parseColorCssRgba(raw) : parseColor(raw)
  } else {
    c = parseColor(raw)
  }
  if (!c) {
    color.value = null
    if (raw) error.value = '无法解析，支持 #RGB #RRGGBB #AARRGGBB（Android）'
    return
  }
  color.value = c
}

watch([input, eightBitMode], parse, { immediate: true })

const outputs = computed(() => {
  const c = color.value
  if (!c) return null
  return {
    hex: toHexRgb(c),
    argb: toAndroidArgb(c),
    cssHex: toCssRgbaHex(c),
    css: toCssRgba(c),
    colorInt: toAndroidColorInt(c),
    preview: toCssRgba(c),
  }
})

async function copy(text: string) {
  const ok = await copyText(text)
  copied.value = ok ? '已复制' : '复制失败'
}
</script>

<template>
  <div class="page">
    <ToolHeader
      title="颜色转换"
      description="HEX ↔ Android ARGB / CSS RGBA，本地预览。"
    />

    <div class="tool-panel">
      <div class="field-row cols-2">
        <div>
          <label class="field-label" for="color-in">颜色输入</label>
          <input id="color-in" v-model="input" class="input mono" placeholder="#AARRGGBB 或 #RRGGBB" />
        </div>
        <div>
          <label class="field-label" for="mode">8 位 hex 解释</label>
          <select id="mode" v-model="eightBitMode" class="select">
            <option value="android">Android AARRGGBB</option>
            <option value="css">CSS RRGGBBAA</option>
          </select>
        </div>
      </div>
      <p v-if="error" class="error-text" style="margin-top: 0.6rem">{{ error }}</p>
      <span v-if="copied" class="success-text">{{ copied }}</span>
    </div>

    <div v-if="outputs" class="tool-panel">
      <div class="preview-row">
        <div class="swatch" :style="{ background: outputs.preview }" />
        <div class="kv-grid" style="flex: 1">
          <div class="kv-item">
            <span class="k">RGB HEX</span>
            <span class="v">
              {{ outputs.hex }}
              <button type="button" class="btn btn-ghost btn-xs" @click="copy(outputs.hex)">复制</button>
            </span>
          </div>
          <div class="kv-item">
            <span class="k">Android ARGB</span>
            <span class="v">
              {{ outputs.argb }}
              <button type="button" class="btn btn-ghost btn-xs" @click="copy(outputs.argb)">复制</button>
            </span>
          </div>
          <div class="kv-item">
            <span class="k">CSS #RRGGBBAA</span>
            <span class="v">
              {{ outputs.cssHex }}
              <button type="button" class="btn btn-ghost btn-xs" @click="copy(outputs.cssHex)">复制</button>
            </span>
          </div>
          <div class="kv-item">
            <span class="k">CSS rgba()</span>
            <span class="v">
              {{ outputs.css }}
              <button type="button" class="btn btn-ghost btn-xs" @click="copy(outputs.css)">复制</button>
            </span>
          </div>
          <div class="kv-item">
            <span class="k">ColorInt</span>
            <span class="v mono">{{ outputs.colorInt }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.preview-row {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  align-items: flex-start;
}
.swatch {
  width: 96px;
  height: 96px;
  border-radius: var(--radius);
  border: 1px solid var(--border);
  flex-shrink: 0;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.06);
}
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
}
</style>
