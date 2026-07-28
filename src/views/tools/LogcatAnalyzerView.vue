<script setup lang="ts">
import { computed, ref } from 'vue'
import ToolHeader from '../../components/ToolHeader.vue'
import { copyText } from '../../utils/clipboard'
import { analyzeLogcat, filterLogcatRecords, type LogcatAnalysis } from '../../utils/logcatParser'

const input = ref('07-27 12:00:00.000  123  123 E AndroidRuntime: FATAL EXCEPTION: main\njava.lang.IllegalStateException: Example failure\n    at com.example.MainActivity.onCreate(MainActivity.kt:20)')
const analysis = ref<LogcatAnalysis | null>(null)
const error = ref('')
const priority = ref('all')
const tag = ref('')
const pid = ref('')
const query = ref('')
const copied = ref('')

const filtered = computed(() => analysis.value ? filterLogcatRecords(analysis.value.records, {
  priority: priority.value, tag: tag.value, pid: pid.value, query: query.value,
}) : [])

function analyze() {
  try {
    error.value = ''
    analysis.value = analyzeLogcat(input.value)
  } catch (cause) {
    analysis.value = null
    error.value = cause instanceof Error ? cause.message : '日志解析失败'
  }
}

function loadFile(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  ;(event.target as HTMLInputElement).value = ''
  if (!file) return
  void file.text().then((text) => { input.value = text; analyze() }).catch(() => { error.value = '读取日志文件失败' })
}

async function copyIncident(text: string) {
  copied.value = (await copyText(text)) ? '已复制' : '复制失败'
}

analyze()
</script>

<template>
  <div class="page">
    <ToolHeader title="Logcat 日志分析" description="本地解析 Logcat 文本，提取崩溃、ANR、Native 和常见网络异常。日志不会上传。" />
    <div class="tool-panel">
      <div class="toolbar">
        <label class="btn">导入 .txt / .log<input hidden type="file" accept=".txt,.log,text/plain" @change="loadFile" /></label>
        <button id="logcat-analyze" type="button" class="btn btn-primary" @click="analyze">分析日志</button>
        <span v-if="analysis" class="faint">{{ analysis.records.length }} 条记录 · 忽略 {{ analysis.ignoredLines }} 行</span>
      </div>
      <label class="field-label" for="logcat-input">Logcat 文本</label>
      <textarea id="logcat-input" v-model="input" class="textarea" rows="9" spellcheck="false" />
      <p v-if="error" class="error-text">{{ error }}</p>
    </div>
    <template v-if="analysis">
      <div class="tool-panel">
        <div class="summary">
          <div class="stat"><span>事件</span><strong>{{ analysis.incidents.length }}</strong></div>
          <div v-for="(count, level) in analysis.priorityCounts" :key="level" class="stat"><span>{{ level }}</span><strong>{{ count }}</strong></div>
        </div>
        <div v-if="analysis.incidents.length" class="incident-list">
          <article v-for="incident in analysis.incidents" :key="`${incident.recordIndex}-${incident.type}`" class="incident">
            <strong>{{ incident.title }}</strong>
            <button type="button" class="btn btn-ghost" @click="copyIncident(incident.text)">复制</button>
            <pre class="out mono">{{ incident.text }}</pre>
          </article>
        </div>
        <p v-else class="muted">未检测到预设的崩溃、ANR、Native 或网络异常标记。</p>
        <span v-if="copied" class="success-text">{{ copied }}</span>
      </div>
      <div class="tool-panel">
        <div class="toolbar">
          <input v-model="tag" class="input" placeholder="筛选 Tag" />
          <input v-model="pid" class="input mono" placeholder="PID" />
          <select v-model="priority" class="select"><option value="all">全部级别</option><option v-for="level in ['V', 'D', 'I', 'W', 'E', 'F', 'A']" :key="level">{{ level }}</option></select>
          <input v-model="query" class="input" placeholder="搜索消息" />
          <span class="faint">{{ filtered.length }} 条</span>
        </div>
        <div class="table-wrap" style="max-height: 520px"><table class="data"><thead><tr><th>时间</th><th>级别</th><th>Tag / PID</th><th>消息</th></tr></thead><tbody><tr v-for="(record, index) in filtered" :key="index"><td class="mono">{{ record.timestamp }}</td><td>{{ record.priority }}</td><td class="mono">{{ record.tag }} / {{ record.pid }}</td><td class="message mono">{{ record.message }}</td></tr></tbody></table></div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.summary { display: flex; flex-wrap: wrap; gap: .55rem; }
.stat { min-width: 4.5rem; padding: .5rem .7rem; border: 1px solid var(--border); border-radius: var(--radius-sm); background: var(--well); }
.stat span { display: block; color: var(--text-faint); font-size: .72rem; font-family: var(--mono); }
.stat strong { font-family: var(--mono); }
.incident-list { display: grid; gap: .75rem; margin-top: 1rem; }
.incident { padding: .75rem; border: 1px solid var(--border); border-radius: var(--radius-sm); background: var(--well); }
.incident .btn { float: right; }
.out { white-space: pre-wrap; word-break: break-word; margin: .6rem 0 0; color: var(--danger); }
.message { white-space: pre-wrap; word-break: break-word; }
</style>
