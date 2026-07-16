<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import ToolHeader from '../../components/ToolHeader.vue'
import { copyText } from '../../utils/clipboard'
import {
  type Radix,
  RADIX_LABELS,
  bitLength,
  formatFromBigInt,
  isValidDigits,
  parseToBigInt,
  toTwosComplementHex,
} from '../../utils/baseConvert'

const inputs = ref<Record<Radix, string>>({
  2: '',
  8: '',
  10: '',
  16: '',
})

const activeRadix = ref<Radix>(10)
const groupDigits = ref(true)
const uppercaseHex = ref(true)
const error = ref('')
const copied = ref('')
const value = ref<bigint | null>(null)

const radices: Radix[] = [2, 8, 10, 16]

const meta = computed(() => {
  if (value.value === null) return null
  const v = value.value
  return {
    bitLength: bitLength(v),
    signed: v < 0n,
    twos: {
      8: toTwosComplementHex(v, 8),
      16: toTwosComplementHex(v, 16),
      32: toTwosComplementHex(v, 32),
      64: toTwosComplementHex(v, 64),
    },
  }
})

function syncFrom(radix: Radix, raw: string) {
  activeRadix.value = radix
  inputs.value[radix] = raw
  error.value = ''
  copied.value = ''

  const trimmed = raw.trim()
  if (!trimmed) {
    value.value = null
    for (const r of radices) {
      if (r !== radix) inputs.value[r] = ''
    }
    return
  }

  if (!isValidDigits(raw, radix)) {
    value.value = null
    error.value = `当前输入不是合法的 ${RADIX_LABELS[radix]}`
    return
  }

  try {
    const n = parseToBigInt(raw, radix)
    value.value = n
    for (const r of radices) {
      if (r === radix) continue
      inputs.value[r] = formatFromBigInt(n, r, {
        group: groupDigits.value,
        uppercaseHex: uppercaseHex.value,
      })
    }
    // Keep active field as user typed (but can reformat on blur if needed)
  } catch (e) {
    value.value = null
    error.value = e instanceof Error ? e.message : '解析失败'
  }
}

function reformatAll() {
  if (value.value === null) return
  const n = value.value
  for (const r of radices) {
    // Don't fight the field currently being edited if invalid path — always reformat all on option change
    inputs.value[r] = formatFromBigInt(n, r, {
      group: groupDigits.value,
      uppercaseHex: uppercaseHex.value,
    })
  }
}

watch([groupDigits, uppercaseHex], () => {
  reformatAll()
})

async function copy(radix: Radix) {
  const text = inputs.value[radix].replace(/\s/g, '')
  if (!text) return
  const ok = await copyText(text)
  copied.value = ok ? `已复制 ${RADIX_LABELS[radix]}` : '复制失败，请手动选择'
}

function clearAll() {
  value.value = null
  error.value = ''
  copied.value = ''
  for (const r of radices) inputs.value[r] = ''
}

function loadSample() {
  syncFrom(10, '255')
}
</script>

<template>
  <div class="page">
    <ToolHeader
      title="进制转换"
      description="二进制、八进制、十进制、十六进制互转。支持 0b / 0o / 0x 前缀、下划线分隔，以及大整数。"
    />

    <div class="tool-panel">
      <div class="toolbar">
        <label class="check">
          <input v-model="groupDigits" type="checkbox" />
          分组显示
        </label>
        <label class="check">
          <input v-model="uppercaseHex" type="checkbox" />
          十六进制大写
        </label>
        <button type="button" class="btn btn-ghost" @click="loadSample">示例 255</button>
        <button type="button" class="btn btn-ghost" @click="clearAll">清空</button>
        <span v-if="copied" class="success-text">{{ copied }}</span>
      </div>

      <div class="field-row cols-2 bases">
        <div v-for="radix in radices" :key="radix" class="base-field">
          <div class="label-row">
            <label class="field-label" :for="`base-${radix}`">{{ RADIX_LABELS[radix] }}</label>
            <button type="button" class="btn btn-ghost btn-xs" @click="copy(radix)">复制</button>
          </div>
          <input
            :id="`base-${radix}`"
            class="input mono"
            :class="{ active: activeRadix === radix }"
            :value="inputs[radix]"
            spellcheck="false"
            autocomplete="off"
            :placeholder="radix === 16 ? '如 FF 或 0xFF' : radix === 2 ? '如 11111111 或 0b…' : '输入数字'"
            @input="syncFrom(radix, ($event.target as HTMLInputElement).value)"
          />
        </div>
      </div>

      <p v-if="error" class="error-text" style="margin-top: 0.85rem">{{ error }}</p>
      <p v-else class="hint" style="margin-top: 0.85rem">
        在任意一栏输入即可同步其余进制。负数十进制可用 <code>-</code> 前缀。
      </p>
    </div>

    <div v-if="meta" class="tool-panel">
      <h2 class="section-title">附加信息</h2>
      <div class="meta-grid">
        <div class="meta-item">
          <span class="k">绝对值位长</span>
          <span class="v mono">{{ meta.bitLength }} bit</span>
        </div>
        <div class="meta-item">
          <span class="k">符号</span>
          <span class="v mono">{{ meta.signed ? '负数' : '非负' }}</span>
        </div>
      </div>

      <h3 class="sub-title">补码十六进制（有符号范围可表示时）</h3>
      <div class="table-wrap">
        <table class="data">
          <thead>
            <tr>
              <th>位宽</th>
              <th>Hex</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="bits in [8, 16, 32, 64] as const" :key="bits">
              <td>{{ bits }}-bit</td>
              <td class="mono">
                {{ meta.twos[bits] ? `0x${meta.twos[bits]}` : '超出范围' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<style scoped>
.check {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.9rem;
  color: var(--text-muted);
  user-select: none;
}

.bases {
  margin-top: 0.25rem;
}

.base-field {
  min-width: 0;
}

.label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.btn-xs {
  padding: 0.2rem 0.55rem;
  font-size: 0.78rem;
}

.input.active {
  border-color: color-mix(in srgb, var(--accent) 70%, var(--border));
}

.section-title {
  margin: 0 0 0.85rem;
  font-size: 1.05rem;
}

.sub-title {
  margin: 1.1rem 0 0.55rem;
  font-size: 0.92rem;
  color: var(--text-muted);
  font-weight: 600;
}

.meta-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 0.6rem;
}

.meta-item {
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg-input);
  padding: 0.7rem 0.8rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.meta-item .k {
  font-size: 0.8rem;
  color: var(--text-muted);
}

.meta-item .v {
  font-weight: 600;
}
</style>
