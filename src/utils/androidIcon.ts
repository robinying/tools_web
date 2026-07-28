export interface IconDensity {
  directory: string
  size: number
}

export const ICON_DENSITIES: IconDensity[] = [
  { directory: 'mipmap-mdpi', size: 48 },
  { directory: 'mipmap-hdpi', size: 72 },
  { directory: 'mipmap-xhdpi', size: 96 },
  { directory: 'mipmap-xxhdpi', size: 144 },
  { directory: 'mipmap-xxxhdpi', size: 192 },
]

export interface DrawGeometry {
  sourceX: number
  sourceY: number
  sourceSize: number
  destinationX: number
  destinationY: number
  destinationSize: number
}

export function calculateIconGeometry(sourceWidth: number, sourceHeight: number, targetSize: number, padding: number): DrawGeometry {
  const sourceSize = Math.min(sourceWidth, sourceHeight)
  const safePadding = Math.max(0, Math.min(Math.floor(targetSize / 2), padding))
  const destinationSize = Math.max(1, targetSize - safePadding * 2)
  return {
    sourceX: Math.max(0, Math.floor((sourceWidth - sourceSize) / 2)),
    sourceY: Math.max(0, Math.floor((sourceHeight - sourceSize) / 2)),
    sourceSize,
    destinationX: safePadding,
    destinationY: safePadding,
    destinationSize,
  }
}

export function iconFileName(iconName: string): string {
  const normalized = iconName.trim().replace(/[^A-Za-z0-9_]/g, '_').replace(/^_+/, '')
  return `${normalized || 'ic_launcher'}.png`
}

export function createAdaptiveIconXml(iconName: string, backgroundColor: string): string {
  const resourceName = iconFileName(iconName).replace(/\.png$/, '')
  return `<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="${backgroundColor}" />
    <foreground android:drawable="@mipmap/${resourceName}_foreground" />
</adaptive-icon>`
}
