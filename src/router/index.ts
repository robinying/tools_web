import { createRouter, createWebHashHistory } from 'vue-router'

const router = createRouter({
  // Hash history works on GitHub Pages without server rewrite rules.
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('../views/HomeView.vue'),
      meta: { title: '工具箱' },
    },
    {
      path: '/base-converter',
      name: 'base-converter',
      component: () => import('../views/tools/BaseConverterView.vue'),
      meta: { title: '进制转换' },
    },
    {
      path: '/exif-reader',
      name: 'exif-reader',
      component: () => import('../views/tools/ExifReaderView.vue'),
      meta: { title: 'EXIF 读取' },
    },
    {
      path: '/qr-tool',
      name: 'qr-tool',
      component: () => import('../views/tools/QrToolView.vue'),
      meta: { title: '二维码' },
    },

    {
      path: '/image-compress',
      name: 'image-compress',
      component: () => import('../views/tools/ImageCompressView.vue'),
      meta: { title: '图片压缩' },
    },
    {
      path: '/image-watermark',
      name: 'image-watermark',
      component: () => import('../views/tools/ImageWatermarkView.vue'),
      meta: { title: '图片加水印' },
    },
    {
      path: '/logcat-analyzer',
      name: 'logcat-analyzer',
      component: () => import('../views/tools/LogcatAnalyzerView.vue'),
      meta: { title: 'Logcat 日志分析' },
    },
    {
      path: '/mapping-retrace',
      name: 'mapping-retrace',
      component: () => import('../views/tools/MappingRetraceView.vue'),
      meta: { title: 'R8 / ProGuard Retrace' },
    },
    {
      path: '/manifest-security',
      name: 'manifest-security',
      component: () => import('../views/tools/ManifestSecurityView.vue'),
      meta: { title: 'Manifest 安全检查' },
    },
    {
      path: '/android-icon-generator',
      name: 'android-icon-generator',
      component: () => import('../views/tools/AndroidIconGeneratorView.vue'),
      meta: { title: 'Android 图标生成' },
    },
    {
      path: '/json-kotlin-generator',
      name: 'json-kotlin-generator',
      component: () => import('../views/tools/JsonKotlinGeneratorView.vue'),
      meta: { title: 'JSON 转 Kotlin' },
    },
    {
      path: '/app-links-assistant',
      name: 'app-links-assistant',
      component: () => import('../views/tools/AppLinksAssistantView.vue'),
      meta: { title: 'App Links 测试' },
    },
    {
      path: '/dp-sp-px',
      name: 'dp-sp-px',
      component: () => import('../views/tools/DpSpPxView.vue'),
      meta: { title: 'dp / sp / px' },
    },
    {
      path: '/permissions',
      name: 'permissions',
      component: () => import('../views/tools/PermissionsView.vue'),
      meta: { title: '权限速查' },
    },
    {
      path: '/adb-cheatsheet',
      name: 'adb-cheatsheet',
      component: () => import('../views/tools/AdbCheatsheetView.vue'),
      meta: { title: 'adb 命令速查' },
    },
    {
      path: '/logcat-filter',
      name: 'logcat-filter',
      component: () => import('../views/tools/LogcatFilterView.vue'),
      meta: { title: 'Logcat 过滤' },
    },
    {
      path: '/intent-builder',
      name: 'intent-builder',
      component: () => import('../views/tools/IntentBuilderView.vue'),
      meta: { title: 'Intent / Deep Link' },
    },
    {
      path: '/base64-url',
      name: 'base64-url',
      component: () => import('../views/tools/Base64UrlView.vue'),
      meta: { title: 'Base64 / URL' },
    },
    {
      path: '/hash-tool',
      name: 'hash-tool',
      component: () => import('../views/tools/HashToolView.vue'),
      meta: { title: '哈希摘要' },
    },
    {
      path: '/color-tool',
      name: 'color-tool',
      component: () => import('../views/tools/ColorToolView.vue'),
      meta: { title: '颜色转换' },
    },
    {
      path: '/density-buckets',
      name: 'density-buckets',
      component: () => import('../views/tools/DensityBucketsView.vue'),
      meta: { title: '密度与资源目录' },
    },
    {
      path: '/proguard-snippets',
      name: 'proguard-snippets',
      component: () => import('../views/tools/ProguardSnippetsView.vue'),
      meta: { title: 'ProGuard 片段' },
    },
    {
      path: '/json-xml-format',
      name: 'json-xml-format',
      component: () => import('../views/tools/JsonXmlFormatView.vue'),
      meta: { title: 'JSON / XML 格式化' },
    },
    {
      path: '/cert-info',
      name: 'cert-info',
      component: () => import('../views/tools/CertInfoView.vue'),
      meta: { title: '证书信息' },
    },
  ],
  scrollBehavior() {
    return { top: 0 }
  },
})

router.afterEach((to) => {
  const title = (to.meta.title as string | undefined) ?? '工具'
  document.title = `${title} · Android Lab`
})

export default router
