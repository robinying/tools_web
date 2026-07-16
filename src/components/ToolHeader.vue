<script setup lang="ts">
defineProps<{
  title: string
  description: string
}>()
</script>

<template>
  <div class="page-header">
    <RouterLink to="/" class="back mono">
      <span class="chev" aria-hidden="true">←</span>
      catalog
    </RouterLink>
    <h1>{{ title }}</h1>
    <p>{{ description }}</p>
  </div>
</template>

<style scoped>
.back {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  margin-bottom: 0.65rem;
  color: var(--text-faint);
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding: 0.2rem 0;
  border-bottom: 1px solid transparent;
}

.back:hover {
  color: var(--signal);
  border-bottom-color: color-mix(in srgb, var(--signal) 40%, transparent);
}

.chev {
  color: var(--signal);
}
</style>
