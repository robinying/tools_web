export interface ToolMeta {
  id: string
  name: string
  description: string
  path: string
  tags: string[]
  accent: string
}

export const tools: ToolMeta[] = [
  {
    id: 'base-converter',
    name: '进制转换',
    description: '二进制 / 八进制 / 十进制 / 十六进制互转，支持大整数与位宽展示。',
    path: '/base-converter',
    tags: ['通用', '编码'],
    accent: '#3b82f6',
  },
  {
    id: 'exif-reader',
    name: 'EXIF 读取',
    description: '本地解析图片 EXIF / GPS / 设备信息，文件不上传服务器。',
    path: '/exif-reader',
    tags: ['图片', '调试'],
    accent: '#10b981',
  },
  {
    id: 'qr-tool',
    name: '二维码生成 / 解析',
    description: '文本生成二维码 PNG；从图片或摄像头本地识别内容。',
    path: '/qr-tool',
    tags: ['通用', '图片'],
    accent: '#22d3ee',
  },

  {
    id: 'image-compress',
    name: '图片压缩',
    description: '本地缩放、压缩并导出 JPEG / PNG / WebP 图片。',
    path: '/image-compress',
    tags: ['图片'],
    accent: '#0ea5e9',
  },
  {
    id: 'image-watermark',
    name: '图片加水印',
    description: '在本地为图片添加文字或 Logo 水印并导出。',
    path: '/image-watermark',
    tags: ['图片'],
    accent: '#ec4899',
  },
  {
    id: 'dp-sp-px',
    name: 'dp / sp / px',
    description: 'Android 密度单位换算，按常用 density 快速对照。',
    path: '/dp-sp-px',
    tags: ['Android', 'UI'],
    accent: '#f59e0b',
  },
  {
    id: 'permissions',
    name: '权限速查',
    description: '常用 Android 权限说明本地搜索（危险/普通级别）。',
    path: '/permissions',
    tags: ['Android'],
    accent: '#a855f7',
  },
  {
    id: 'adb-cheatsheet',
    name: 'adb 命令速查',
    description: '常用 adb / am / pm / 调试命令片段，可复制。',
    path: '/adb-cheatsheet',
    tags: ['Android', '调试'],
    accent: '#06b6d4',
  },
  {
    id: 'logcat-filter',
    name: 'Logcat 过滤生成',
    description: '按 tag / 包名 / 优先级拼装 adb logcat 过滤表达式。',
    path: '/logcat-filter',
    tags: ['Android', '调试'],
    accent: '#14b8a6',
  },
  {
    id: 'intent-builder',
    name: 'Intent / Deep Link',
    description: '生成 intent:// URI、am start 命令与常用 Action。',
    path: '/intent-builder',
    tags: ['Android'],
    accent: '#8b5cf6',
  },
  {
    id: 'base64-url',
    name: 'Base64 / URL 编解码',
    description: 'Base64、Base64URL、URL encode/decode，纯本地。',
    path: '/base64-url',
    tags: ['通用', '编码'],
    accent: '#6366f1',
  },
  {
    id: 'hash-tool',
    name: '哈希摘要',
    description: 'MD5 / SHA-1 / SHA-256，支持文本与本地文件。',
    path: '/hash-tool',
    tags: ['通用', '安全'],
    accent: '#ef4444',
  },
  {
    id: 'color-tool',
    name: '颜色转换',
    description: 'HEX ↔ ARGB / RGB，预览色值，适配 Android 色值。',
    path: '/color-tool',
    tags: ['Android', 'UI'],
    accent: '#f97316',
  },
  {
    id: 'density-buckets',
    name: '密度与资源目录',
    description: 'ldpi～xxxhdpi 对照与 drawable/mipmap 资源目录建议。',
    path: '/density-buckets',
    tags: ['Android', 'UI'],
    accent: '#eab308',
  },
  {
    id: 'proguard-snippets',
    name: 'ProGuard 片段',
    description: '常用 keep / 混淆规则片段库，本地检索复制。',
    path: '/proguard-snippets',
    tags: ['Android', '构建'],
    accent: '#84cc16',
  },
  {
    id: 'json-xml-format',
    name: 'JSON / XML 格式化',
    description: '格式化、压缩、基础校验，不上传数据。',
    path: '/json-xml-format',
    tags: ['通用'],
    accent: '#0ea5e9',
  },
  {
    id: 'cert-info',
    name: '证书信息',
    description: '粘贴 PEM/证书 DER，查看指纹与基本信息（本地计算）。',
    path: '/cert-info',
    tags: ['Android', '安全'],
    accent: '#64748b',
  },
]
