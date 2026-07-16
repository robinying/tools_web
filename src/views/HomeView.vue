<script setup lang="ts">
import { computed } from 'vue'
import ToolCard from '../components/ToolCard.vue'
import { tools } from '../data/tools'

const count = computed(() => tools.length)
const tagCount = computed(() => new Set(tools.flatMap((t) => t.tags)).size)
</script>

<template>
  <div class="page">
    <section class="hero" aria-labelledby="hero-title">
      <div class="hero-main">
        <p class="eyebrow mono">device lab · browser tools</p>
        <h1 id="hero-title">Android 开发工具箱</h1>
        <p class="lead">
          adb、单位、编码、调试——选一个工具立刻用，计算都在本机完成。
        </p>
      </div>
      <dl class="stats" aria-label="工具概览">
        <div class="stat">
          <dt class="mono">tools</dt>
          <dd>{{ count }}</dd>
        </div>
        <div class="stat">
          <dt class="mono">tags</dt>
          <dd>{{ tagCount }}</dd>
        </div>
        <div class="stat">
          <dt class="mono">net</dt>
          <dd class="ok">local</dd>
        </div>
      </dl>
    </section>

    <div class="section-bar">
      <h2 class="section-title mono">catalog</h2>
      <span class="faint">{{ count }} 个工具</span>
    </div>

    <section class="grid" aria-label="可用工具">
      <ToolCard v-for="tool in tools" :key="tool.id" :tool="tool" />
    </section>
  </div>
</template>

<style scoped>
.hero {
  display: grid;
  gap: 1.25rem;
  margin-bottom: 1.5rem;
  padding: 1.15rem 1.2rem 1.2rem;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg-card);
  box-shadow: var(--shadow);
  position: relative;
  overflow: hidden;
}

.hero::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  background: linear-gradient(180deg, var(--log-w), var(--log-d));
}

@media (min-width: 800px) {
  .hero {
    grid-template-columns: 1fr auto;
    align-items: end;
    gap: 2rem;
  }
}

.hero-main {
  padding-left: 0.35rem;
  min-width: 0;
}

.eyebrow {
  margin: 0 0 0.45rem;
  color: var(--signal);
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.hero h1 {
  margin: 0 0 0.45rem;
  font-size: clamp(1.55rem, 3.2vw, 2rem);
  font-weight: 750;
  letter-spacing: -0.035em;
  line-height: 1.15;
}

.lead {
  margin: 0;
  color: var(--text-muted);
  font-size: 0.95rem;
  max-width: 36ch;
  line-height: 1.55;
}

.stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(4.5rem, 1fr));
  gap: 0.5rem;
  margin: 0;
  padding: 0;
}

.stat {
  margin: 0;
  padding: 0.55rem 0.65rem;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--well);
  min-width: 0;
}

.stat dt {
  margin: 0 0 0.15rem;
  font-size: 0.65rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-faint);
}

.stat dd {
  margin: 0;
  font-family: var(--mono);
  font-size: 1.15rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--text);
  line-height: 1.2;
}

.stat dd.ok {
  color: var(--success);
  font-size: 0.95rem;
  text-transform: lowercase;
}

.section-bar {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.75rem;
  padding: 0 0.15rem;
}

.section-title {
  margin: 0;
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--text-faint);
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 0.75rem;
}
</style>
