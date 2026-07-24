<script setup lang="ts">
import { computed, ref } from 'vue'
import ToolHeader from '../../components/ToolHeader.vue'
import { copyText } from '../../utils/clipboard'
import { buildAmStartCommand, buildIntentUri } from '../../utils/adbCommand'

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

const options = computed(() => ({
  action: action.value,
  dataUri: dataUri.value,
  packageName: packageName.value,
  component: component.value,
  category: category.value,
  extras: extras.value,
  flags: flags.value,
}))

const amStartResult = computed(() => buildAmStartCommand(options.value))
const intentUriResult = computed(() => buildIntentUri(options.value))
const amStart = computed(() => amStartResult.value.command)
const intentUri = computed(() => intentUriResult.value.uri)
const inputError = computed(() => amStartResult.value.error ?? intentUriResult.value.error)

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
          <label class="field-label" for="flags">Intent flag（可选）</label>
          <input id="flags" v-model="flags" class="input mono" placeholder="0x10000000" />
        </div>
      </div>
      <div style="margin-top: 0.85rem">
        <label class="field-label" for="extras">Extras（每行 key=value，按 String）</label>
        <textarea id="extras" v-model="extras" class="textarea" rows="3" placeholder="from=tool" />
      </div>
      <p v-if="inputError" class="error-text">{{ inputError }}</p>
      <p class="hint">仅复制并执行已自行核验的命令；输入会作为参数安全引用，Intent flag 仅支持数值位掩码。</p>
    </div>

    <div class="tool-panel">
      <div class="toolbar">
        <strong>am start</strong>
        <button type="button" class="btn" :disabled="!amStart" @click="copy(amStart, 'am start')">复制</button>
        <span v-if="copied" class="success-text">{{ copied }}</span>
      </div>
      <pre class="out mono">{{ amStart }}</pre>
    </div>

    <div class="tool-panel">
      <div class="toolbar">
        <strong>intent:// URI</strong>
        <button type="button" class="btn" :disabled="!intentUri" @click="copy(intentUri, 'intent URI')">复制</button>
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
