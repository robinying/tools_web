<script setup lang="ts">
import { computed } from 'vue'
import type { ToolMeta } from '../data/tools'

const props = defineProps<{
  tool: ToolMeta
}>()

/** Tag → logcat priority color (signature rail). */
const rail = computed(() => {
  const tags = props.tool.tags
  if (tags.includes('安全')) return 'e'
  if (tags.includes('调试')) return 'w'
  if (tags.includes('Android')) return 'd'
  if (tags.includes('UI')) return 'i'
  if (tags.includes('编码')) return 'i'
  if (tags.includes('构建')) return 'w'
  return 'v'
})
</script>

<template>
  <RouterLink :to="tool.path" class="card" :data-rail="rail">
    <span class="rail" aria-hidden="true" />
    <div class="body">
      <div class="tags">
        <span v-for="tag in tool.tags" :key="tag" class="chip">{{ tag }}</span>
      </div>
      <h2>{{ tool.name }}</h2>
      <p>{{ tool.description }}</p>
      <span class="cta mono">
        open
        <span class="arrow" aria-hidden="true">→</span>
      </span>
    </div>
  </RouterLink>
</template>

<style scoped>
.card {
  position: relative;
  display: block;
  overflow: hidden;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow-sm);
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease,
    transform 0.15s ease;
  min-height: 100%;
}

.card:hover {
  border-color: var(--border-strong);
  box-shadow: var(--shadow);
  transform: translateY(-1px);
}

.card:hover .cta {
  color: var(--signal);
}

.card:hover .arrow {
  transform: translateX(3px);
}

.card:focus-visible {
  outline: 2px solid var(--signal);
  outline-offset: 2px;
}

.rail {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  background: var(--log-v);
}

.card[data-rail='e'] .rail {
  background: var(--log-e);
}
.card[data-rail='w'] .rail {
  background: var(--log-w);
}
.card[data-rail='i'] .rail {
  background: var(--log-i);
}
.card[data-rail='d'] .rail {
  background: var(--log-d);
}
.card[data-rail='v'] .rail {
  background: var(--log-v);
}

.body {
  padding: 0.95rem 1rem 1rem 1.15rem;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
  min-width: 0;
  margin-bottom: 0.55rem;
}

h2 {
  margin: 0 0 0.35rem;
  font-size: 1.05rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.25;
}

p {
  margin: 0 0 0.85rem;
  color: var(--text-muted);
  font-size: 0.875rem;
  line-height: 1.45;
  flex: 1;
}

.cta {
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-faint);
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}

.arrow {
  display: inline-block;
  transition: transform 0.15s ease;
  color: var(--signal);
}

@media (prefers-reduced-motion: reduce) {
  .card,
  .arrow {
    transition: none;
  }
  .card:hover {
    transform: none;
  }
}
</style>
