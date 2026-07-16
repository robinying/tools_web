<script setup lang="ts">
import { ref } from 'vue'
import ToolHeader from '../../components/ToolHeader.vue'
import { copyText } from '../../utils/clipboard'

const mode = ref<'json' | 'xml'>('json')
const input = ref('{"name":"demo","items":[1,2,3]}')
const output = ref('')
const error = ref('')
const copied = ref('')
const indent = ref(2)

function formatJson(minify: boolean) {
  error.value = ''
  try {
    const obj = JSON.parse(input.value)
    output.value = minify ? JSON.stringify(obj) : JSON.stringify(obj, null, indent.value)
  } catch (e) {
    output.value = ''
    error.value = e instanceof Error ? e.message : 'JSON 解析失败'
  }
}

function formatXml(minify: boolean) {
  error.value = ''
  try {
    const raw = input.value.trim()
    if (!raw) throw new Error('空输入')
    const parser = new DOMParser()
    const doc = parser.parseFromString(raw, 'application/xml')
    const err = doc.querySelector('parsererror')
    if (err) throw new Error(err.textContent?.trim() || 'XML 解析失败')
    if (minify) {
      output.value = raw.replace(/>\s+</g, '><').trim()
      return
    }
    output.value = prettyXml(new XMLSerializer().serializeToString(doc), indent.value)
  } catch (e) {
    output.value = ''
    error.value = e instanceof Error ? e.message : 'XML 处理失败'
  }
}

function prettyXml(xml: string, spaces: number): string {
  const pad = ' '.repeat(spaces)
  let formatted = ''
  let indentLevel = 0
  xml = xml.replace(/(>)(<)(\/*)/g, '$1\n$2$3')
  for (const line of xml.split('\n')) {
    const t = line.trim()
    if (!t) continue
    if (t.startsWith('</')) indentLevel = Math.max(0, indentLevel - 1)
    formatted += pad.repeat(indentLevel) + t + '\n'
    if (
      t.startsWith('<') &&
      !t.startsWith('</') &&
      !t.startsWith('<?') &&
      !t.startsWith('<!') &&
      !t.endsWith('/>') &&
      !t.includes('</')
    ) {
      indentLevel++
    }
  }
  return formatted.trim()
}

function run(minify = false) {
  copied.value = ''
  if (mode.value === 'json') formatJson(minify)
  else formatXml(minify)
}

async function copy() {
  if (!output.value) return
  const ok = await copyText(output.value)
  copied.value = ok ? '已复制' : '复制失败'
}

run()
</script>

<template>
  <div class="page">
    <ToolHeader
      title="JSON / XML 格式化"
      description="格式化、压缩与基础语法校验，数据不离开浏览器。"
    />

    <div class="tool-panel">
      <div class="toolbar">
        <select v-model="mode" class="select" style="max-width: 120px" @change="run()">
          <option value="json">JSON</option>
          <option value="xml">XML</option>
        </select>
        <label class="muted" style="display: inline-flex; align-items: center; gap: 0.35rem">
          缩进
          <input v-model.number="indent" class="input mono" style="width: 4rem" type="number" min="1" max="8" />
        </label>
        <button type="button" class="btn btn-primary" @click="run(false)">格式化</button>
        <button type="button" class="btn" @click="run(true)">压缩</button>
        <button type="button" class="btn" :disabled="!output" @click="copy">复制</button>
        <span v-if="copied" class="success-text">{{ copied }}</span>
      </div>

      <label class="field-label" for="in">输入</label>
      <textarea id="in" v-model="input" class="textarea" rows="8" />

      <label class="field-label" for="out" style="margin-top: 0.85rem">输出</label>
      <textarea id="out" class="textarea" rows="10" readonly :value="output" />
      <p v-if="error" class="error-text">{{ error }}</p>
    </div>
  </div>
</template>
