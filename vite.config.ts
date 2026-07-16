import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

// GitHub project Pages: https://<user>.github.io/tools_web/
// Override with GITHUB_PAGES_BASE=/ for user/org site root.
const base = process.env.GITHUB_PAGES_BASE || '/tools_web/'

export default defineConfig({
  plugins: [vue()],
  base,
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    assetsInlineLimit: 4096,
  },
})
