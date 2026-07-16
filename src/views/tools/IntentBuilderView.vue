<script setup lang="ts">
import { computed, ref } from 'vue'
import ToolHeader from '../../components/ToolHeader.vue'
import { copyText } from '../../utils/clipboard'

const action = ref('android.intent.action.VIEW')
const dataUri = ref('https://example.com/path?x=1')
const packageName = ref('')
const component = ref('')
const category = ref('')
const extras = ref('') // key=value per line
const flags = ref('')
const copied = ref('')

const commonActions = [
  'android.intent.action.VIEW',
  'android.intent.action.MAIN',
  'android.intent.action.SEND',
  'android.intent.action.DIAL',
  'android.intent.action.WEB_SEARCH',
  'android.settings.APPLICATION_DETAILS_SETTINGS',
]

const amStart = computed(() => {
  const parts = ['adb shell am start']
  if (action.value.trim()) parts.push('-a', shellQuote(action.value.trim()))
  if (dataUri.value.trim()) parts.push('-d', shellQuote(dataUri.value.trim()))
  if (category.value.trim()) parts.push('-c', shellQuote(category.value.trim()))
  if (component.value.trim()) parts.push('-n', shellQuote(component.value.trim()))
  else if (packageName.value.trim()) parts.push(shellQuote(packageName.value.trim()))
  for (const line of extras.value.split('\n')) {
    const t = line.trim()
    if (!t || !t.includes('=')) continue
    const i = t.indexOf('=')
    const k = t.slice(0, i).trim()
    const v = t.slice(i + 1).trim()
    parts.push('--es', shellQuote(k), shellQuote(v))
  }
  if (flags.value.trim()) parts.push(flags.value.trim())
  return parts.join(' ')
})

const intentUri = computed(() => {
  // intent://host/path#Intent;scheme=https;action=...;end
  try {
    const raw = dataUri.value.trim()
    let hostPath = ''
    let scheme = 'https'
    if (raw) {
      try {
        const u = new URL(raw)
        scheme = u.protocol.replace(':', '') || 'https'
        hostPath = `${u.host}${u.pathname}${u.search}${u.hash}`
      } catch {
        hostPath = raw.replace(/^[a-z]+:\/\//i, '')
      }
    }
    const segs = [`intent://${hostPath}#Intent`]
    segs.push(`scheme=${scheme}`)
    if (action.value.trim()) segs.push(`action=${action.value.trim()}`)
    if (packageName.value.trim()) segs.push(`package=${packageName.value.trim()}`)
    if (component.value.trim()) segs.push(`component=${component.value.trim()}`)
    if (category.value.trim()) segs.push(`category=${category.value.trim()}`)
    for (const line of extras.value.split('\n')) {
      const t = line.trim()
      if (!t || !t.includes('=')) continue
      const i = t.indexOf('=')
      const k = t.slice(0, i).trim()
      const v = t.slice(i + 1).trim()
      segs.push(`S.${k}=${encodeURIComponent(v)}`)
    }
    segs.push('end')
    return segs.join(';')
  } catch {
    return ''
  }
})

function shellQuote(s: string): string {
  if (/[\s"$`\\]/.test(s)) return `"${s.replace(/(["\\$`])/g, '\\$1')}"`
  return s
}

async function copy(text: string, label: string) {
  const ok = await copyText(text)
  copied.value = ok ? `已复制 ${label}` : '复制失败'
}
</script>

<template>
  <div class="page">
    <ToolHeader
      title="Intent / Deep Link"
      description="生成 am start 命令与 intent:// URI，便于调试 Deep Link。"
    />

    <div class="tool-panel">
      <div class="field-row cols-2">
        <div>
          <label class="field-label" for="action">Action</label>
          <input id="action" v-model="action" class="input mono" list="actions" />
          <datalist id="actions">
            <option v-for="a in commonActions" :key="a" :value="a" />
          </datalist>
        </div>
        <div>
          <label class="field-label" for="data">Data URI</label>
          <input id="data" v-model="dataUri" class="input mono" spellcheck="false" />
        </div>
        <div>
          <label class="field-label" for="pkg">Package（可选）</label>
          <input id="pkg" v-model="packageName" class="input mono" placeholder="com.example.app" />
        </div>
        <div>
          <label class="field-label" for="comp">Component（可选）</label>
          <input
            id="comp"
            v-model="component"
            class="input mono"
            placeholder="com.example/.MainActivity"
          />
        </div>
        <div>
          <label class="field-label" for="cat">Category（可选）</label>
          <input
            id="cat"
            v-model="category"
            class="input mono"
            placeholder="android.intent.category.BROWSABLE"
          />
        </div>
        <div>
          <label class="field-label" for="flags">额外 flags 片段（可选）</label>
          <input id="flags" v-model="flags" class="input mono" placeholder="-f 0x10000000" />
        </div>
      </div>
      <div style="margin-top: 0.85rem">
        <label class="field-label" for="extras">Extras（每行 key=value，按 String）</label>
        <textarea id="extras" v-model="extras" class="textarea" rows="3" placeholder="from=tool" />
      </div>
    </div>

    <div class="tool-panel">
      <div class="toolbar">
        <strong>am start</strong>
        <button type="button" class="btn" @click="copy(amStart, 'am start')">复制</button>
        <span v-if="copied" class="success-text">{{ copied }}</span>
      </div>
      <pre class="out mono">{{ amStart }}</pre>
    </div>

    <div class="tool-panel">
      <div class="toolbar">
        <strong>intent:// URI</strong>
        <button type="button" class="btn" @click="copy(intentUri, 'intent URI')">复制</button>
      </div>
      <pre class="out mono">{{ intentUri }}</pre>
      <p class="hint">可用 Chrome：
        <code>adb shell am start -a android.intent.action.VIEW -d '&lt;intent-uri&gt;'</code>
      </p>
    </div>
  </div>
</template>

<style scoped>
.out {
  margin: 0;
  padding: 0.85rem 1rem;
  background: var(--bg-input);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  white-space: pre-wrap;
  word-break: break-all;
  font-size: 0.88rem;
  color: var(--accent);
}
</style>
