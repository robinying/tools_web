<script setup lang="ts">
import { computed, ref } from 'vue'
import ToolHeader from '../../components/ToolHeader.vue'
import { copyText } from '../../utils/clipboard'

const packageName = ref('com.example.app')
const tags = ref('MyTag,OkHttp')
const priority = ref('D')
const usePid = ref(true)
const clearFirst = ref(false)
const buffer = ref('main')
const copied = ref('')

const priorities = ['V', 'D', 'I', 'W', 'E', 'F']

const tagFilterExpr = computed(() => {
  const list = tags.value
    .split(/[,，\s]+/)
    .map((t) => t.trim())
    .filter(Boolean)
  if (!list.length) return '*:V'
  const parts = list.map((t) => `${t}:${priority.value}`)
  // silence others
  return `${parts.join(' ')} *:S`
})

const command = computed(() => {
  const parts: string[] = ['adb']
  if (clearFirst.value) {
    // multi-command hint
  }
  if (usePid.value && packageName.value.trim()) {
    const pkg = packageName.value.trim()
    parts.push(
      `logcat --pid=$(adb shell pidof -s ${pkg})`,
    )
  } else {
    parts.push('logcat')
    if (buffer.value && buffer.value !== 'main') {
      parts.push('-b', buffer.value)
    }
    parts.push(tagFilterExpr.value)
  }
  const cmd = parts.join(' ')
  if (clearFirst.value) return `adb logcat -c && ${cmd}`
  return cmd
})

const amFilterHint = computed(() => {
  // classic filter format for non-pid
  return tagFilterExpr.value
})

async function copy() {
  const ok = await copyText(command.value)
  copied.value = ok ? '已复制' : '复制失败'
}
</script>

<template>
  <div class="page">
    <ToolHeader
      title="Logcat 过滤生成"
      description="生成 adb logcat 命令：按包名 PID 或 tag:priority 表达式过滤。"
    />

    <div class="tool-panel">
      <div class="field-row cols-2">
        <div>
          <label class="field-label" for="pkg">包名（PID 过滤）</label>
          <input id="pkg" v-model="packageName" class="input mono" spellcheck="false" />
        </div>
        <div>
          <label class="field-label" for="tags">Tag 列表（逗号分隔）</label>
          <input id="tags" v-model="tags" class="input mono" placeholder="MyTag,OkHttp" />
        </div>
        <div>
          <label class="field-label" for="pri">最低优先级</label>
          <select id="pri" v-model="priority" class="select mono">
            <option v-for="p in priorities" :key="p" :value="p">{{ p }}</option>
          </select>
        </div>
        <div>
          <label class="field-label" for="buf">Buffer</label>
          <select id="buf" v-model="buffer" class="select" :disabled="usePid">
            <option value="main">main</option>
            <option value="system">system</option>
            <option value="crash">crash</option>
            <option value="all">all</option>
          </select>
        </div>
      </div>

      <div class="toolbar" style="margin-top: 0.9rem">
        <label class="check">
          <input v-model="usePid" type="checkbox" />
          使用包名 PID 过滤（推荐）
        </label>
        <label class="check">
          <input v-model="clearFirst" type="checkbox" />
          先 logcat -c 清空
        </label>
      </div>
    </div>

    <div class="tool-panel">
      <div class="toolbar">
        <strong>生成命令</strong>
        <button type="button" class="btn btn-primary" @click="copy">复制</button>
        <span v-if="copied" class="success-text">{{ copied }}</span>
      </div>
      <pre class="out mono">{{ command }}</pre>
      <p class="hint">
        Tag 表达式：
        <code>{{ amFilterHint }}</code>
        （PID 模式下由系统按进程过滤，tag 表达式可不使用）
      </p>
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
}
.out {
  margin: 0;
  padding: 0.85rem 1rem;
  background: var(--bg-input);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  white-space: pre-wrap;
  word-break: break-all;
  font-size: 0.9rem;
  color: var(--accent);
}
</style>
