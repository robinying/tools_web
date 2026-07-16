<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const isHome = computed(() => route.name === 'home')
const pathLabel = computed(() => {
  if (route.name === 'home') return '// tools'
  const p = String(route.path || '').replace(/^\//, '')
  return p ? `// tools/${p}` : '// tools'
})
</script>

<template>
  <div class="shell">
    <header class="topbar">
      <div class="topbar-inner">
        <RouterLink to="/" class="brand" title="返回工具箱">
          <span class="brand-mark" aria-hidden="true">
            <span class="led" />
          </span>
          <span class="brand-text">
            <strong>Android Lab</strong>
            <small class="mono path">{{ pathLabel }}</small>
          </span>
        </RouterLink>

        <nav class="nav" aria-label="主导航">
          <RouterLink to="/" class="nav-link" :class="{ active: isHome }">工具箱</RouterLink>
        </nav>
      </div>
      <div class="topbar-rule" aria-hidden="true" />
    </header>

    <main class="main">
      <slot />
    </main>

    <footer class="footer">
      <div class="footer-inner">
        <span class="mono foot-meta">local · offline-capable</span>
        <span class="faint">数据以官方文档为准 · 仅在浏览器本地处理</span>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.topbar {
  position: sticky;
  top: 0;
  z-index: 20;
  backdrop-filter: blur(14px) saturate(1.2);
  background: color-mix(in srgb, var(--ink) 88%, transparent);
  border-bottom: 1px solid var(--border);
}

.topbar-inner {
  width: min(1120px, 100%);
  margin: 0 auto;
  padding: 0.7rem 1.15rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.topbar-rule {
  height: 2px;
  background: linear-gradient(
    90deg,
    var(--log-e) 0 12%,
    var(--log-w) 12% 28%,
    var(--log-i) 28% 48%,
    var(--log-d) 48% 72%,
    var(--log-v) 72% 100%
  );
  opacity: 0.9;
}

.brand {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  min-width: 0;
}

.brand-mark {
  width: 2rem;
  height: 2rem;
  border-radius: 6px;
  display: grid;
  place-items: center;
  background: var(--panel);
  border: 1px solid var(--border);
  box-shadow: var(--shadow-sm);
  flex-shrink: 0;
}

.led {
  width: 0.55rem;
  height: 0.55rem;
  border-radius: 50%;
  background: var(--signal);
  box-shadow:
    0 0 0 2px color-mix(in srgb, var(--signal) 25%, transparent),
    0 0 10px color-mix(in srgb, var(--signal) 55%, transparent);
}

.brand-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
  gap: 0.05rem;
}

.brand-text strong {
  font-size: 0.95rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.2;
}

.brand-text .path {
  color: var(--text-faint);
  font-size: 0.7rem;
  letter-spacing: 0.02em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.nav {
  display: flex;
  gap: 0.25rem;
  align-items: center;
}

.nav-link {
  padding: 0.35rem 0.75rem;
  border-radius: var(--radius-sm);
  font-family: var(--mono);
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--text-muted);
  border: 1px solid transparent;
}

.nav-link:hover {
  color: var(--text);
  background: var(--raised);
  border-color: var(--border);
}

.nav-link.active {
  color: var(--signal);
  background: var(--signal-soft);
  border-color: color-mix(in srgb, var(--signal) 35%, var(--border));
}

.main {
  flex: 1;
}

.footer {
  margin-top: auto;
  border-top: 1px solid var(--border);
  background: color-mix(in srgb, var(--ink) 70%, transparent);
}

.footer-inner {
  width: min(1120px, 100%);
  margin: 0 auto;
  padding: 0.85rem 1.15rem 1.1rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 1.25rem;
  align-items: baseline;
  justify-content: space-between;
  font-size: 0.8rem;
}

.foot-meta {
  color: var(--text-faint);
  font-size: 0.7rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
</style>
