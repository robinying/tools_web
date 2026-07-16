<script setup lang="ts">
import { computed, ref } from 'vue'
import ToolHeader from '../../components/ToolHeader.vue'
import commands from '../../data/adb-commands.json'
import { copyText } from '../../utils/clipboard'

interface Cmd {
  category: string
  title: string
  command: string
  note: string
}

const list = commands as Cmd[]
const query = ref('')
const category = ref('全部')
const copied = ref('')

const categories = computed(() => ['全部', ...Array.from(new Set(list.map((c) => c.category)))])

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  return list.filter((c) => {
    if (category.value !== '全部' && c.category !== category.value) return false
    if (!q) return true
    return (
      c.title.toLowerCase().includes(q) ||
      c.command.toLowerCase().includes(q) ||
      c.note.toLowerCase().includes(q) ||
      c.category.toLowerCase().includes(q)
    )
  })
})

async function copy(cmd: string) {
  const ok = await copyText(cmd)
  copied.value = ok ? '已复制命令' : '复制失败'
}
</script>

<template>
  <div class="page">
    <ToolHeader title="adb 命令速查" description="常用 adb / am / pm 调试命令，点击复制。" />

    <div class="tool-panel">
      <div class="toolbar">
        <input
          v-model="query"
          class="input"
          style="max-width: 280px"
          type="search"
          placeholder="搜索命令…"
        />
        <select v-model="category" class="select" style="max-width: 140px">
          <option v-for="c in categories" :key="c" :value="c">{{ c }}</option>
        </select>
        <span class="faint">{{ filtered.length }} 条</span>
        <span v-if="copied" class="success-text">{{ copied }}</span>
      </div>

      <div class="list">
        <article v-for="(c, i) in filtered" :key="i" class="item">
          <div class="top">
            <span class="chip">{{ c.category }}</span>
            <strong>{{ c.title }}</strong>
            <button type="button" class="btn btn-ghost btn-xs" @click="copy(c.command)">复制</button>
          </div>
          <code class="cmd mono">{{ c.command }}</code>
          <p class="note">{{ c.note }}</p>
        </article>
      </div>
    </div>
  </div>
</template>

<style scoped>
.list {
  display: grid;
  gap: 0.65rem;
}
.item {
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg-input);
  padding: 0.75rem 0.85rem;
}
.top {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.45rem;
}
.top strong {
  flex: 1;
  min-width: 8rem;
}
.btn-xs {
  padding: 0.2rem 0.55rem;
  font-size: 0.78rem;
}
.cmd {
  display: block;
  white-space: pre-wrap;
  word-break: break-all;
  font-size: 0.88rem;
  color: var(--accent);
}
.note {
  margin: 0.35rem 0 0;
  font-size: 0.85rem;
  color: var(--text-muted);
}
</style>
