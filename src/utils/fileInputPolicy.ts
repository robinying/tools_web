export const HASH_FILE_MAX_BYTES = 50 * 1024 * 1024
export const IMAGE_FILE_MAX_BYTES = 25 * 1024 * 1024
export const IMAGE_MAX_PIXELS = 24_000_000
export const IMAGE_MAX_EDGE = 8_000

export interface ImageDimensions {
  width: number
  height: number
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KiB`
  return `${(bytes / 1024 / 1024).toFixed(0)} MiB`
}

export function validateFileSize(file: File, maxBytes: number): string | null {
  if (file.size <= maxBytes) return null
  return `文件超过 ${formatBytes(maxBytes)} 限制`
}

export function validateImageDimensions(
  dimensions: ImageDimensions,
  maxPixels = IMAGE_MAX_PIXELS,
  maxEdge = IMAGE_MAX_EDGE,
): string | null {
  const { width, height } = dimensions
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
    return '无法读取图片尺寸'
  }
  if (width > maxEdge || height > maxEdge) {
    return `图片边长不能超过 ${maxEdge.toLocaleString()} px`
  }
  if (width * height > maxPixels) {
    return `图片像素不能超过 ${(maxPixels / 1_000_000).toFixed(0)} MP`
  }
  return null
}

export function scaleToMaxEdge(dimensions: ImageDimensions, maxEdge: number): ImageDimensions {
  const { width, height } = dimensions
  const scale = Math.min(1, maxEdge / Math.max(width, height))
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  }
}

export async function readImageDimensions(file: File): Promise<ImageDimensions> {
  if ('createImageBitmap' in window) {
    const bitmap = await createImageBitmap(file)
    try {
      return { width: bitmap.width, height: bitmap.height }
    } finally {
      bitmap.close()
    }
  }

  const url = URL.createObjectURL(file)
  try {
    return await new Promise<ImageDimensions>((resolve, reject) => {
      const image = new Image()
      image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight })
      image.onerror = () => reject(new Error('图片加载失败'))
      image.src = url
    })
  } finally {
    URL.revokeObjectURL(url)
  }
}
