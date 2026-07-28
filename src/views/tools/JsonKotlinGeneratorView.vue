<script setup lang="ts">
import { ref } from 'vue'
import ToolHeader from '../../components/ToolHeader.vue'
import { copyText } from '../../utils/clipboard'
import { generateKotlin, type KotlinDialect } from '../../utils/kotlinGenerator'

const input = ref('{"user_id":1,"name":"Ada","active":true,"profile":{"avatar_url":"https://example.com/a.png"}}')
const rootName = ref('ApiResponse')
const packageName = ref('com.example.model')
const dialect = ref<KotlinDialect>('kotlinx')
const output = ref('')
const warnings = ref<string[]>([])
const error = ref('')
const copied = ref('')

function generate() {
  try {
    error.value = ''
    const result = generateKotlin(input.value, { rootName: rootName.value, packageName: packageName.value, dialect: dialect.value })
    output.value = result.code; warnings.value = result.warnings
  } catch (cause) { output.value = ''; warnings.value = []; error.value = cause instanceof Error ? cause.message : 'JSON 解析失败' }
}
async function copy() { copied.value = (await copyText(output.value)) ? '已复制' : '复制失败' }
generate()
</script>

<template>
  <div class="page">
    <ToolHeader title="JSON 转 Kotlin data class" description="基于样例 JSON 在本地生成 Kotlin 数据类。样例不能完全证明实际 API 的可选字段或稳定结构。" />
    <div class="tool-panel">
      <div class="field-row cols-2"><div><label class="field-label" for="kotlin-root">根类名</label><input id="kotlin-root" v-model="rootName" class="input mono" /></div><div><label class="field-label" for="kotlin-package">Package（可选）</label><input id="kotlin-package" v-model="packageName" class="input mono" /></div><div><label class="field-label" for="kotlin-dialect">序列化注解</label><select id="kotlin-dialect" v-model="dialect" class="select"><option value="none">不生成</option><option value="gson">Gson</option><option value="moshi">Moshi</option><option value="kotlinx">kotlinx.serialization</option></select></div></div>
      <label class="field-label" for="kotlin-input" style="margin-top: .85rem">JSON 输入</label><textarea id="kotlin-input" v-model="input" class="textarea mono" rows="10" spellcheck="false" />
      <div class="toolbar" style="margin-top: .85rem"><button id="kotlin-generate" type="button" class="btn btn-primary" @click="generate">生成 Kotlin</button><button type="button" class="btn" :disabled="!output" @click="copy">复制</button><span v-if="copied" class="success-text">{{ copied }}</span></div><p v-if="error" class="error-text">{{ error }}</p><ul v-if="warnings.length" class="warnings"><li v-for="warning in warnings" :key="warning">{{ warning }}</li></ul>
    </div>
    <div class="tool-panel"><label class="field-label" for="kotlin-output">生成结果</label><textarea id="kotlin-output" class="textarea mono" rows="18" readonly :value="output" /></div>
  </div>
</template>

<style scoped>.warnings { color: var(--warning); padding-left: 1.25rem; }</style>
