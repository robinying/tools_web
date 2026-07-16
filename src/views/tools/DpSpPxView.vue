<script setup lang="ts">
import { computed, ref } from 'vue'
import ToolHeader from '../../components/ToolHeader.vue'

interface Density {
  name: string
  bucket: string
  densityDpi: number
  scale: number
}

const densities: Density[] = [
  { name: 'ldpi', bucket: 'ldpi', densityDpi: 120, scale: 0.75 },
  { name: 'mdpi (基准)', bucket: 'mdpi', densityDpi: 160, scale: 1 },
  { name: 'hdpi', bucket: 'hdpi', densityDpi: 240, scale: 1.5 },
  { name: 'xhdpi', bucket: 'xhdpi', densityDpi: 320, scale: 2 },
  { name: 'xxhdpi', bucket: 'xxhdpi', densityDpi: 480, scale: 3 },
  { name: 'xxxhdpi', bucket: 'xxxhdpi', densityDpi: 640, scale: 4 },
]

const mode = ref<'dp' | 'px'>('dp')
const value = ref(16)
const fontScale = ref(1)

const rows = computed(() => {
  const v = Number(value.value)
  if (!Number.isFinite(v)) return []

  return densities.map((d) => {
    if (mode.value === 'dp') {
      const px = v * d.scale
      const spPx = v * d.scale * fontScale.value
      return {
        ...d,
        dp: v,
        px: round(px),
        spAsPx: round(spPx),
      }
    }
    const dp = v / d.scale
    return {
      ...d,
      dp: round(dp),
      px: v,
      spAsPx: round(dp * d.scale * fontScale.value),
    }
  })
})

function round(n: number): number {
  return Math.round(n * 100) / 100
}
</script>

<template>
  <div class="page">
    <ToolHeader
      title="dp / sp / px 换算"
      description="按 Android 标准密度桶换算。sp 额外乘以系统字体缩放（fontScale）。"
    />

    <div class="tool-panel">
      <div class="field-row cols-2">
        <div>
          <label class="field-label" for="unit-mode">输入单位</label>
          <select id="unit-mode" v-model="mode" class="select">
            <option value="dp">dp → 各密度 px</option>
            <option value="px">px → 各密度 dp</option>
          </select>
        </div>
        <div>
          <label class="field-label" for="unit-value">数值</label>
          <input id="unit-value" v-model.number="value" class="input mono" type="number" step="any" />
        </div>
        <div>
          <label class="field-label" for="font-scale">字体缩放 fontScale（影响 sp→px）</label>
          <input
            id="font-scale"
            v-model.number="fontScale"
            class="input mono"
            type="number"
            min="0.5"
            max="2"
            step="0.05"
          />
        </div>
      </div>
      <p class="hint" style="margin-top: 0.85rem">
        公式：px = dp × (dpi / 160)；sp 绘制像素 ≈ sp × (dpi / 160) × fontScale。
      </p>
    </div>

    <div class="tool-panel">
      <div class="table-wrap">
        <table class="data">
          <thead>
            <tr>
              <th>密度</th>
              <th>dpi</th>
              <th>scale</th>
              <th>dp</th>
              <th>px</th>
              <th>sp→px（估算）</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in rows" :key="row.bucket">
              <td>{{ row.name }}</td>
              <td class="mono">{{ row.densityDpi }}</td>
              <td class="mono">{{ row.scale }}</td>
              <td class="mono">{{ row.dp }}</td>
              <td class="mono">{{ row.px }}</td>
              <td class="mono">{{ row.spAsPx }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
