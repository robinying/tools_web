<script setup lang="ts">
import { computed, ref } from 'vue'
import ToolHeader from '../../components/ToolHeader.vue'
import { analyzeManifest, type FindingScope, type FindingSeverity, type ManifestSecurityResult } from '../../utils/manifestSecurity'

const input = ref(`<manifest xmlns:android="http://schemas.android.com/apk/res/android" package="com.example.app">
  <application android:label="Example">
    <activity android:name=".MainActivity" android:exported="true" />
  </application>
</manifest>`)
const result = ref<ManifestSecurityResult | null>(null)
const error = ref('')
const severity = ref<'all' | FindingSeverity>('all')
const scope = ref<'all' | FindingScope>('all')

const filtered = computed(() => (result.value?.findings ?? []).filter((finding) =>
  (severity.value === 'all' || finding.severity === severity.value) &&
  (scope.value === 'all' || finding.scope === scope.value),
))

function analyze() {
  try { error.value = ''; result.value = analyzeManifest(input.value) }
  catch (cause) { result.value = null; error.value = cause instanceof Error ? cause.message : 'Manifest 解析失败' }
}

function loadFile(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  ;(event.target as HTMLInputElement).value = ''
  if (!file) return
  void file.text().then((text) => { input.value = text; analyze() }).catch(() => { error.value = '读取 Manifest 文件失败' })
}

analyze()
</script>

<template>
  <div class="page">
    <ToolHeader title="AndroidManifest 安全检查" description="本地检查文本 AndroidManifest.xml。结果不能替代 merged manifest、源码鉴权或实际设备验证。" />
    <div class="tool-panel">
      <div class="toolbar"><label class="btn">导入 XML<input hidden type="file" accept=".xml,text/xml" @change="loadFile" /></label><button id="manifest-analyze" type="button" class="btn btn-primary" @click="analyze">检查 Manifest</button></div>
      <label class="field-label" for="manifest-input">AndroidManifest.xml</label>
      <textarea id="manifest-input" v-model="input" class="textarea mono" rows="13" spellcheck="false" />
      <p v-if="error" class="error-text">{{ error }}</p>
    </div>
    <template v-if="result">
      <div class="tool-panel">
        <div class="toolbar"><span class="mono">package: {{ result.summary.packageName || '未声明' }}</span><span class="faint">{{ result.summary.components }} 个组件 · {{ result.summary.permissions.length }} 个权限</span></div>
        <p class="hint">仅支持文本 XML；不支持 APK 编译后的二进制 Manifest，也无法验证代码层权限检查。</p>
      </div>
      <div class="tool-panel">
        <div class="toolbar"><select v-model="severity" class="select"><option value="all">全部严重性</option><option value="high">high</option><option value="medium">medium</option><option value="low">low</option><option value="info">info</option></select><select v-model="scope" class="select"><option value="all">全部结论</option><option value="manifest">Manifest 配置</option><option value="review">需源码/合并检查</option><option value="compatibility">兼容性</option></select><span class="faint">{{ filtered.length }} 项</span></div>
        <div class="finding-list"><article v-for="finding in filtered" :key="`${finding.location}-${finding.title}`" class="finding" :data-severity="finding.severity"><div><span class="chip">{{ finding.severity }}</span><span class="chip">{{ finding.scope }}</span></div><strong>{{ finding.title }}</strong><p>{{ finding.detail }}</p><code>{{ finding.location }}</code></article></div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.finding-list { display: grid; gap: .65rem; }
.finding { padding: .8rem; border: 1px solid var(--border); border-left: 4px solid var(--text-faint); border-radius: var(--radius-sm); background: var(--well); }
.finding[data-severity='high'] { border-left-color: var(--danger); }
.finding[data-severity='medium'] { border-left-color: var(--warning); }
.finding[data-severity='low'] { border-left-color: var(--info); }
.finding strong { display: block; margin-top: .45rem; }
.finding p { color: var(--text-muted); margin: .35rem 0; }
.finding code { color: var(--text-faint); }
</style>
