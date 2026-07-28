export const OUTPUT_FORMATS = ['jpeg', 'png', 'webp'] as const

export type OutputFormat = (typeof OUTPUT_FORMATS)[number]
export type WatermarkPosition =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'middle-left'
  | 'center'
  | 'middle-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right'

export interface ImageSize {
  width: number
  height: number
}

export interface Point {
  x: number
  y: number
}

export interface OutputFormatInfo {
  mimeType: string
  extension: string
  supportsQuality: boolean
}

const FORMAT_INFO: Record<OutputFormat, OutputFormatInfo> = {
  jpeg: { mimeType: 'image/jpeg', extension: 'jpg', supportsQuality: true },
  png: { mimeType: 'image/png', extension: 'png', supportsQuality: false },
  webp: { mimeType: 'image/webp', extension: 'webp', supportsQuality: true },
}

export function getOutputFormatInfo(format: OutputFormat): OutputFormatInfo {
  return FORMAT_INFO[format]
}

export function normalizeQuality(quality: number): number {
  if (!Number.isFinite(quality)) return 0.8
  return Math.min(1, Math.max(0, quality))
}

export function calculateOutputSize(source: ImageSize, maxLongEdge: number): ImageSize {
  const { width, height } = source
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new Error('图片尺寸无效')
  }
  if (!Number.isFinite(maxLongEdge) || maxLongEdge <= 0) return { width, height }

  const scale = Math.min(1, maxLongEdge / Math.max(width, height))
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  }
}

export function calculateWatermarkPosition(
  canvas: ImageSize,
  item: ImageSize,
  position: WatermarkPosition,
  margin: number,
): Point {
  const safeMargin = Math.max(0, Number.isFinite(margin) ? margin : 0)
  const x = position.endsWith('left')
    ? safeMargin
    : position.endsWith('right')
      ? canvas.width - item.width - safeMargin
      : (canvas.width - item.width) / 2
  const y = position.startsWith('top')
    ? safeMargin
    : position.startsWith('bottom')
      ? canvas.height - item.height - safeMargin
      : (canvas.height - item.height) / 2

  const maxX = Math.max(0, canvas.width - item.width)
  const maxY = Math.max(0, canvas.height - item.height)
  return {
    x: Math.round(Math.min(maxX, Math.max(0, x))),
    y: Math.round(Math.min(maxY, Math.max(0, y))),
  }
}

export function makeOutputFileName(fileName: string, suffix: string, format: OutputFormat): string {
  const base = fileName.replace(/\.[^.]+$/, '') || 'image'
  return `${base}${suffix}.${getOutputFormatInfo(format).extension}`
}

export function canvasToBlob(
  canvas: HTMLCanvasElement,
  format: OutputFormat,
  quality: number,
): Promise<Blob> {
  const { mimeType, supportsQuality } = getOutputFormatInfo(format)
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob)
        else reject(new Error('浏览器未能生成图片文件'))
      },
      mimeType,
      supportsQuality ? normalizeQuality(quality) : undefined,
    )
  })
}
