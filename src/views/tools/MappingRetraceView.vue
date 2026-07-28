<script setup lang="ts">
import { computed, ref } from 'vue'
import ToolHeader from '../../components/ToolHeader.vue'
import { copyText } from '../../utils/clipboard'
import { parseMapping, retraceStackTrace } from '../../utils/mappingRetrace'

const mappingText = ref('com.example.MainActivity -> a.b:\n    void start() -> a')
const stackTrace = ref('java.lang.IllegalStateException\n    at a.b.a(SourceFile:1)')
const output = ref('')
const warning = ref('')
const error = ref('')
const changedFrames = ref(0)
const ambiguousFrames = ref(0)
const copied = ref('')
const mappingStats = computed(() => {
  try {
    const mapping = parseMapping(mappingText.value)
    return { classes: mapping.classes.size, methods: [...mapping.methods.values()].reduce((total, items) => total + items.length, 0) }
  } catch { return { classes: 0, methods: 0 } }
})

function retrace() {
  try {
    error.value = ''
    const mapping = parseMapping(mappingText.value)
    const result = retraceStackTrace(mapping, stackTrace.value)
    output.value = result.text
    changedFrames.value = result.changedFrames
    ambiguousFrames.value = result.ambiguousFrames
    warning.value = mapping.warnings.join(' ')
  } catch (cause) {
    output.value = ''
    error.value = cause instanceof Error ? cause.message : 'Mapping 解析失败'
  }
}

function loadTextFile(event: Event, onLoaded: (text: string) => void) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  void file.text().then(onLoaded).catch(() => { error.value = '读取文件失败' })
}

function loadMapping(event: Event) {
  loadTextFile(event, (text) => { mappingText.value = text })
}

function loadStackTrace(event: Event) {
  loadTextFile(event, (text) => { stackTrace.value = text })
}

async function copy() { copied.value = (await copyText(output.value)) ? '已复制' : '复制失败' }
retrace()
</script>

<template>
  <div class="page">
    <ToolHeader title="R8 / ProGuard Retrace" description="本地按标准 mapping.txt 反混淆 Java / Kotlin 堆栈。R8 v2 内联与 outline 元数据不保证完整还原。" />
    <div class="tool-panel">
      <div class="field-row cols-2">
        <div><div class="toolbar"><label class="field-label" for="mapping-input">mapping.txt</label><label class="btn btn-ghost">导入<input hidden type="file" accept=".txt" @change="loadMapping" /></label></div><textarea id="mapping-input" v-model="mappingText" class="textarea" rows="12" spellcheck="false" /></div>
        <div><div class="toolbar"><label class="field-label" for="trace-input">Stacktrace</label><label class="btn btn-ghost">导入<input hidden type="file" accept=".txt,.log" @change="loadStackTrace" /></label></div><textarea id="trace-input" v-model="stackTrace" class="textarea" rows="12" spellcheck="false" /></div>
      </div>
      <div class="toolbar" style="margin-top: .85rem"><button id="retrace-run" type="button" class="btn btn-primary" @click="retrace">开始反混淆</button><span class="faint">{{ mappingStats.classes }} 个类 · {{ mappingStats.methods }} 个方法</span></div>
      <p v-if="error" class="error-text">{{ error }}</p><p v-if="warning" class="hint">{{ warning }}</p>
    </div>
    <div class="tool-panel">
      <div class="toolbar"><strong>反混淆结果</strong><button type="button" class="btn" :disabled="!output" @click="copy">复制</button><span v-if="copied" class="success-text">{{ copied }}</span><span class="faint">已替换 {{ changedFrames }} 帧 · 歧义 {{ ambiguousFrames }} 帧</span></div>
      <textarea class="textarea mono" rows="12" readonly :value="output" />
    </div>
  </div>
</template>
