<script setup lang="ts">
import { computed, ref } from 'vue'
import ToolHeader from '../../components/ToolHeader.vue'
import snippets from '../../data/proguard-snippets.json'
import { copyText } from '../../utils/clipboard'

interface Snippet {
  id: string
  title: string
  tags: string[]
  code: string
}

const list = snippets as Snippet[]
const query = ref('')
const copied = ref('')

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return list
  return list.filter(
    (s) =>
      s.title.toLowerCase().includes(q) ||
      s.code.toLowerCase().includes(q) ||
      s.tags.some((t) => t.toLowerCase().includes(q)),
  )
})

async function copy(code: string) {
  const ok = await copyText(code)
  copied.value = ok ? '已复制规则' : '复制失败'
}
</script>

<template>
  <div class="page">
    <ToolHeader
      title="ProGuard / R8 片段"
      description="常用 keep / dontwarn 规则片段，按需复制到 proguard-rules.pro。"
    />

    <div class="tool-panel">
      <div class="toolbar">
        <input
          v-model="query"
          class="input"
          style="max-width: 300px"
          type="search"
          placeholder="搜索 Gson、WebView、native…"
        />
        <span class="faint">{{ filtered.length }} 条</span>
        <span v-if="copied" class="success-text">{{ copied }}</span>
      </div>

      <div class="list">
        <article v-for="s in filtered" :key="s.id" class="item">
          <div class="top">
            <strong>{{ s.title }}</strong>
            <span v-for="t in s.tags" :key="t" class="chip">{{ t }}</span>
            <button type="button" class="btn btn-ghost btn-xs" @click="copy(s.code)">复制</button>
          </div>
          <pre class="code mono">{{ s.code }}</pre>
        </article>
      </div>
    </div>
  </div>
</template>

<style scoped>
.list {
  display: grid;
  gap: 0.75rem;
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
  gap: 0.4rem;
  margin-bottom: 0.5rem;
}
.top strong {
  margin-right: 0.25rem;
}
.btn-xs {
  margin-left: auto;
  padding: 0.2rem 0.55rem;
  font-size: 0.78rem;
}
.code {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 0.82rem;
  color: var(--text);
  line-height: 1.45;
}
</style>
