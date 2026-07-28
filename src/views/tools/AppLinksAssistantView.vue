<script setup lang="ts">
import { computed, ref } from 'vue'
import ToolHeader from '../../components/ToolHeader.vue'
import { copyText } from '../../utils/clipboard'
import { buildAppLinksCommands, parseAppLinksStatus, validateAppLinksInput, validateAssetLinks } from '../../utils/appLinks'

const url = ref('https://example.com/path')
const packageName = ref('com.example.app')
const apiLevel = ref(35)
const assetLinks = ref('')
const statusText = ref('')
const copied = ref('')
const inputError = computed(() => validateAppLinksInput(url.value, packageName.value))
const commands = computed(() => inputError.value ? null : buildAppLinksCommands(url.value, packageName.value, apiLevel.value))
const assetResult = computed(() => assetLinks.value.trim() ? validateAssetLinks(assetLinks.value) : null)
const statuses = computed(() => parseAppLinksStatus(statusText.value))
async function copy(text: string) { copied.value = (await copyText(text)) ? '已复制' : '复制失败' }
</script>

<template>
  <div class="page">
    <ToolHeader title="Deep Link / App Links 测试" description="生成本地 adb 调试命令，并检查粘贴的 assetlinks.json 与 App Links 状态输出。不会访问网络或设备。" />
    <div class="tool-panel"><div class="field-row cols-2"><div><label class="field-label" for="app-link-url">URL</label><input id="app-link-url" v-model="url" class="input mono" /></div><div><label class="field-label" for="app-link-package">包名</label><input id="app-link-package" v-model="packageName" class="input mono" /></div><div><label class="field-label" for="app-link-api">Android API</label><input id="app-link-api" v-model.number="apiLevel" class="input mono" type="number" min="23" max="40" /></div></div><p v-if="inputError" class="error-text">{{ inputError }}</p></div>
    <div v-if="commands" class="tool-panel"><div class="toolbar"><strong>调试命令</strong><span v-if="copied" class="success-text">{{ copied }}</span></div><div class="command-list"><div v-for="(command, label) in commands" :key="label"><label class="field-label">{{ label }}</label><pre v-if="command" class="out mono">{{ command }}</pre><p v-else class="hint">当前 API 不支持此命令。</p><button v-if="command" type="button" class="btn btn-ghost" @click="copy(command)">复制</button></div></div><p class="hint">实际验证仍取决于安装包签名、HTTPS 域名可达性/响应头、系统版本与 OEM 行为。</p></div>
    <div class="tool-panel"><label class="field-label" for="assetlinks-input">粘贴 assetlinks.json（可选）</label><textarea id="assetlinks-input" v-model="assetLinks" class="textarea mono" rows="7" placeholder="[{ ... }]" /><template v-if="assetResult"><p :class="assetResult.valid ? 'success-text' : 'error-text'">{{ assetResult.valid ? `结构通过：${assetResult.entries} 项` : assetResult.errors.join(' ') }}</p><p v-for="warning in assetResult.warnings" :key="warning" class="hint">{{ warning }}</p></template></div>
    <div class="tool-panel"><label class="field-label" for="app-links-status">粘贴 pm get-app-links 输出（可选）</label><textarea id="app-links-status" v-model="statusText" class="textarea mono" rows="6" placeholder="example.com: verified" /><div v-if="statuses.length" class="table-wrap" style="margin-top: .75rem"><table class="data"><thead><tr><th>域名</th><th>状态</th></tr></thead><tbody><tr v-for="status in statuses" :key="status.domain"><td>{{ status.domain }}</td><td>{{ status.status }}</td></tr></tbody></table></div><p v-else-if="statusText.trim()" class="hint">未识别状态行，请结合设备原始输出确认。</p></div>
  </div>
</template>

<style scoped>
.command-list { display: grid; gap: .85rem; }
.out { margin: .25rem 0; padding: .65rem; border: 1px solid var(--border); border-radius: var(--radius-sm); background: var(--well); white-space: pre-wrap; word-break: break-all; }
</style>
