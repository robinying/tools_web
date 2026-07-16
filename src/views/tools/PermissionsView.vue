<script setup lang="ts">
import { computed, ref } from 'vue'
import ToolHeader from '../../components/ToolHeader.vue'
import permissions from '../../data/permissions.json'
import { copyText } from '../../utils/clipboard'

interface Perm {
  name: string
  level: string
  group: string
  desc: string
}

const list = permissions as Perm[]
const query = ref('')
const level = ref<'all' | 'dangerous' | 'normal' | 'special'>('all')
const copied = ref('')

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  return list.filter((p) => {
    if (level.value !== 'all' && p.level !== level.value) return false
    if (!q) return true
    return (
      p.name.toLowerCase().includes(q) ||
      p.desc.toLowerCase().includes(q) ||
      p.group.toLowerCase().includes(q)
    )
  })
})

async function copy(name: string) {
  const ok = await copyText(name)
  copied.value = ok ? `已复制 ${name}` : '复制失败'
}
</script>

<template>
  <div class="page">
    <ToolHeader
      title="权限速查"
      description="常用 Android 权限本地说明表。可按关键字、危险级别过滤。"
    />

    <div class="tool-panel">
      <div class="toolbar">
        <input
          v-model="query"
          class="input"
          style="max-width: 320px"
          type="search"
          placeholder="搜索权限名 / 说明…"
        />
        <select v-model="level" class="select" style="max-width: 160px">
          <option value="all">全部级别</option>
          <option value="dangerous">dangerous</option>
          <option value="normal">normal</option>
          <option value="special">special</option>
        </select>
        <span class="faint">{{ filtered.length }} 条</span>
        <span v-if="copied" class="success-text">{{ copied }}</span>
      </div>

      <div class="table-wrap" style="max-height: 560px">
        <table class="data">
          <thead>
            <tr>
              <th>权限</th>
              <th>级别</th>
              <th>分组</th>
              <th>说明</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in filtered" :key="p.name">
              <td>
                <button type="button" class="linkish mono" @click="copy(p.name)">{{ p.name }}</button>
              </td>
              <td>
                <span class="chip" :class="p.level">{{ p.level }}</span>
              </td>
              <td>{{ p.group }}</td>
              <td>{{ p.desc }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p class="hint" style="margin-top: 0.75rem">点击权限名可复制。数据为常用子集，以官方文档为准。</p>
    </div>
  </div>
</template>

<style scoped>
.linkish {
  background: none;
  border: none;
  padding: 0;
  color: var(--accent);
  cursor: pointer;
  text-align: left;
  word-break: break-all;
}
.linkish:hover {
  text-decoration: underline;
}
.chip.dangerous {
  color: #f87171;
  background: rgba(248, 113, 113, 0.12);
}
.chip.special {
  color: #fbbf24;
  background: rgba(251, 191, 36, 0.12);
}
.chip.normal {
  color: var(--text-muted);
}
</style>
