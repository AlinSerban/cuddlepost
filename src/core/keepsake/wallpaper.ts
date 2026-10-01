import type { Gift } from '../gift'
import { loadFonts, seeded } from './canvas'
import { snapshotPlush } from './snapshot'
import type { KeepsakeTheme, WallpaperFormat, WallpaperLayout } from './theme'

export interface Wallpaper {
  file: File
  url: string
  width: number
  height: number
}

/** Matches the device's real screen (portrait on phones, square on tablets so it survives rotation). */
export function wallpaperSize(format: WallpaperFormat, tablet: boolean) {
  const dpr = Math.min(window.devicePixelRatio || 1, 3)
  const a = (window.screen?.width || 0) * dpr
  const b = (window.screen?.height || 0) * dpr
  let short = Math.min(a, b)
  let long = Math.max(a, b)
  if (!short) [short, long] = format === 'desktop' ? [1440, 2560] : [1290, 2796]
  if (format === 'mobile' && tablet) short = long
  const [minLong, maxLong] = format === 'desktop' ? [1920, 3840] : [2000, 3000]
  const scale = Math.min(Math.max(1, minLong / long), maxLong / long)
  short = Math.round(short * scale)
  long = Math.round(long * scale)
  return format === 'desktop' ? { width: long, height: short } : { width: short, height: long }
}

function layoutFor(format: WallpaperFormat, w: number, h: number): WallpaperLayout {
  if (format === 'desktop') {
    const unit = Math.min(h / 900, w / 1440)
    const size = h * 0.6
    return {
      unit,
      plush: { x: (w - size) / 2, y: h * 0.06, size },
      text: { x: w / 2, top: h * 0.685, bottom: h * 0.86, width: Math.min(w * 0.5, 620 * unit) },
      brandY: h * 0.895,
    }
  }
  if (w / h > 0.8) {
    const unit = w / 1100
    const size = w * 0.4
    return {
      unit,
      plush: { x: (w - size) / 2, y: h * 0.2, size },
      text: { x: w / 2, top: h * 0.61, bottom: h * 0.76, width: w * 0.5 },
      brandY: h * 0.79,
    }
  }
  // Phones: top ~30% is left for the lock screen clock, bottom corners for the flashlight/camera buttons.
  const unit = Math.min(w / 430, h / 932)
  const size = Math.min(w * 0.86, h * 0.37)
  return {
    unit,
    plush: { x: (w - size) / 2, y: h * 0.49 - size / 2, size },
    text: { x: w / 2, top: h * 0.69, bottom: h * 0.875, width: Math.min(w * 0.76, 330 * unit) },
    brandY: h * 0.912,
  }
}

export async function createWallpaper(
  gift: Gift,
  theme: KeepsakeTheme,
  format: WallpaperFormat,
  tablet: boolean,
): Promise<Wallpaper> {
  const { width, height } = wallpaperSize(format, tablet)
  const [plush] = await Promise.all([snapshotPlush(gift, theme.shadowColor), loadFonts(theme.fonts)])
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas is not supported')
  theme.drawWallpaper({
    ctx,
    width,
    height,
    format,
    layout: layoutFor(format, width, height),
    plush,
    gift,
    random: seeded(gift.id),
  })
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not export wallpaper'))), 'image/jpeg', 0.92),
  )
  const name = `${slug(theme.brand)}-${slug(gift.recipientName) || 'gift'}-wallpaper.jpg`
  return { file: new File([blob], name, { type: 'image/jpeg' }), url: URL.createObjectURL(blob), width, height }
}

export function downloadWallpaper(wallpaper: Wallpaper) {
  const a = document.createElement('a')
  a.href = wallpaper.url
  a.download = wallpaper.file.name
  document.body.appendChild(a)
  a.click()
  a.remove()
}

export function canShareFile(file: File) {
  return typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })
}

function slug(text: string) {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}
