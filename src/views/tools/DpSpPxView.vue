<script setup lang="ts">
import { computed, ref } from 'vue'
import ToolHeader from '../../components/ToolHeader.vue'
import {
  buildDensityRows,
  isValidDensityValue,
  isValidFontScale,
  MAX_FONT_SCALE,
  MIN_FONT_SCALE,
} from '../../utils/density'

const mode = ref<'dp' | 'px'>('dp')
const value = ref(16)
const fontScale = ref(1)

const isFontScaleValid = computed(() => isValidFontScale(fontScale.value))
const valueError = computed(() => (
  isValidDensityValue(value.value) ? '' : '请输入有限数值'
))
const fontScaleError = computed(() => (
  isFontScaleValid.value ? '' : `请输入 ${MIN_FONT_SCALE} 到 ${MAX_FONT_SCALE} 之间的有限数值`
))
const rows = computed(() => buildDensityRows(mode.value, value.value, fontScale.value) ?? [])
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
          <input id="unit-value" v-model.number="value" class="input mono" type="number" step="any" :aria-invalid="Boolean(valueError)" />
          <p v-if="valueError" class="error-text" role="alert">{{ valueError }}</p>
        </div>
        <div>
          <label class="field-label" for="font-scale">字体缩放 fontScale（影响 sp→px）</label>
          <input
            id="font-scale"
            v-model.number="fontScale"
            class="input mono"
            type="number"
            :min="MIN_FONT_SCALE"
            :max="MAX_FONT_SCALE"
            step="0.05"
            :aria-invalid="Boolean(fontScaleError)"
          />
          <p v-if="fontScaleError" class="error-text" role="alert">{{ fontScaleError }}</p>
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
