<script setup lang="ts">
import ToolHeader from '../../components/ToolHeader.vue'

const rows = [
  { bucket: 'ldpi', dpi: 120, scale: 0.75, drawable: 'drawable-ldpi', mipmap: 'mipmap-ldpi', note: '少见' },
  { bucket: 'mdpi', dpi: 160, scale: 1, drawable: 'drawable-mdpi', mipmap: 'mipmap-mdpi', note: '基准 1×' },
  { bucket: 'hdpi', dpi: 240, scale: 1.5, drawable: 'drawable-hdpi', mipmap: 'mipmap-hdpi', note: '1.5×' },
  { bucket: 'xhdpi', dpi: 320, scale: 2, drawable: 'drawable-xhdpi', mipmap: 'mipmap-xhdpi', note: '2×' },
  { bucket: 'xxhdpi', dpi: 480, scale: 3, drawable: 'drawable-xxhdpi', mipmap: 'mipmap-xxhdpi', note: '3× 常用' },
  { bucket: 'xxxhdpi', dpi: 640, scale: 4, drawable: 'drawable-xxxhdpi', mipmap: 'mipmap-xxxhdpi', note: '4× 图标' },
  { bucket: 'nodpi', dpi: '—', scale: '—', drawable: 'drawable-nodpi', mipmap: '—', note: '不缩放' },
  { bucket: 'anydpi', dpi: '—', scale: '—', drawable: 'drawable-anydpi', mipmap: 'mipmap-anydpi', note: 'Vector / 自适应' },
]

const tips = [
  '位图：以 mdpi 为 1×，xxhdpi 提供 3× 资源最常见。',
  '应用图标：优先 Adaptive Icon（mipmap-anydpi-v26 + 各密度前景）。',
  '矢量图：放 drawable 即可，通常无需多密度位图。',
  '查设备：adb shell wm density',
]
</script>

<template>
  <div class="page">
    <ToolHeader
      title="密度与资源目录"
      description="ldpi～xxxhdpi 对照，以及 drawable / mipmap 目录命名建议。"
    />

    <div class="tool-panel">
      <div class="table-wrap">
        <table class="data">
          <thead>
            <tr>
              <th>Bucket</th>
              <th>dpi</th>
              <th>scale</th>
              <th>drawable</th>
              <th>mipmap</th>
              <th>说明</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in rows" :key="r.bucket">
              <td class="mono">{{ r.bucket }}</td>
              <td class="mono">{{ r.dpi }}</td>
              <td class="mono">{{ r.scale }}</td>
              <td class="mono">{{ r.drawable }}</td>
              <td class="mono">{{ r.mipmap }}</td>
              <td>{{ r.note }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="tool-panel">
      <h2 class="section-title">建议</h2>
      <ul class="tips">
        <li v-for="(t, i) in tips" :key="i">{{ t }}</li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.section-title {
  margin: 0 0 0.65rem;
  font-size: 1.05rem;
}
.tips {
  margin: 0;
  padding-left: 1.15rem;
  color: var(--text-muted);
}
.tips li + li {
  margin-top: 0.35rem;
}
</style>
