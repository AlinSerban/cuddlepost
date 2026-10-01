import type { Gift } from '../gift'

export type WallpaperFormat = 'mobile' | 'desktop'

/** All positions are in output pixels. `unit` scales design sizes (1 unit ≈ 1 CSS px on a typical screen). */
export interface WallpaperLayout {
  unit: number
  /** Square area for the plushie snapshot (the plush fills ~85% of it). */
  plush: { x: number; y: number; size: number }
  /** Text area, `x` is its horizontal center. Kept clear of lock-screen clocks, docks and taskbars. */
  text: { x: number; top: number; bottom: number; width: number }
  brandY: number
}

export interface WallpaperScene {
  ctx: CanvasRenderingContext2D
  width: number
  height: number
  format: WallpaperFormat
  layout: WallpaperLayout
  plush: HTMLImageElement
  gift: Gift
  /** Seeded by the gift id, so the same gift always gets the same sparkle/noise pattern. */
  random: () => number
}

export interface KeepsakeTheme {
  brand: string
  /** Browser/status bar color and home screen splash background. */
  appColor: string
  statusBar: 'default' | 'black' | 'black-translucent'
  shadowColor: string
  qr: { dark: string; light: string }
  /** Canvas font descriptors to load before drawing, e.g. `600 40px Inter`. */
  fonts: string[]
  drawIconBackground: (ctx: CanvasRenderingContext2D, size: number) => void
  drawWallpaper: (scene: WallpaperScene) => void
}
