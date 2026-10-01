import { useEffect, useState, useSyncExternalStore } from 'react'
import { PLUSH_TYPES, type Gift, type VersionId } from '../gift'
import { getDevice } from './device'
import { snapshotPlush } from './snapshot'
import type { KeepsakeTheme } from './theme'

/** Home screen labels get cut off around 12 characters. */
export function homeScreenLabel(gift: Gift) {
  const name = gift.senderName.trim()
  if (`From ${name}`.length <= 12) return `From ${name}`
  if (name.length <= 12) return name
  return `${PLUSH_TYPES.find((p) => p.id === gift.plush)!.label} hug`
}

interface AppIcons {
  large: string
  medium: string
  apple: string
}

const iconCache = new Map<string, Promise<AppIcons>>()

export function getAppIcons(gift: Gift, theme: KeepsakeTheme): Promise<AppIcons> {
  const key = `${theme.brand}:${gift.id}`
  let icons = iconCache.get(key)
  if (!icons) {
    icons = snapshotPlush(gift, theme.shadowColor).then((img) => ({
      large: drawIcon(img, theme, 512),
      medium: drawIcon(img, theme, 192),
      apple: drawIcon(img, theme, 180),
    }))
    icons.catch(() => iconCache.delete(key))
    iconCache.set(key, icons)
  }
  return icons
}

function drawIcon(img: HTMLImageElement, theme: KeepsakeTheme, size: number) {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')!
  theme.drawIconBackground(ctx, size)
  const s = size * 0.86
  ctx.drawImage(img, (size - s) / 2, (size - s) / 2 + size * 0.03, s, s)
  return canvas.toDataURL('image/png')
}

export function useAppIcon(gift: Gift, theme: KeepsakeTheme) {
  const [src, setSrc] = useState<string | null>(null)
  useEffect(() => {
    let alive = true
    getAppIcons(gift, theme)
      .then((icons) => alive && setSrc(icons.large))
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [gift, theme])
  return src
}

function upsert(tag: 'meta' | 'link', key: string, value: string): () => void {
  const attr = tag === 'meta' ? 'name' : 'rel'
  const prop = tag === 'meta' ? 'content' : 'href'
  let el = document.head.querySelector(`${tag}[${attr}="${key}"]`)
  const previous = el?.getAttribute(prop) ?? null
  const created = !el
  if (!el) {
    el = document.createElement(tag)
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute(prop, value)
  const node = el
  return () => {
    if (created) node.remove()
    else if (previous !== null) node.setAttribute(prop, previous)
  }
}

/**
 * Makes the current gift page installable on phones: a per-gift manifest whose start URL is this
 * exact gift, and an app icon drawn from their plushie. Desktop is skipped on purpose.
 */
export function useHomeScreenSetup(gift: Gift | null, version: VersionId, theme: KeepsakeTheme) {
  useEffect(() => {
    if (!gift || getDevice().platform === 'desktop') return
    const label = homeScreenLabel(gift)
    const undo = [
      upsert('meta', 'theme-color', theme.appColor),
      upsert('meta', 'mobile-web-app-capable', 'yes'),
      upsert('meta', 'apple-mobile-web-app-capable', 'yes'),
      upsert('meta', 'apple-mobile-web-app-title', label),
      upsert('meta', 'apple-mobile-web-app-status-bar-style', theme.statusBar),
    ]
    let manifestUrl: string | null = null
    let alive = true

    getAppIcons(gift, theme)
      .then((icons) => {
        if (!alive) return
        const origin = window.location.origin
        // A blob manifest resolves relative URLs against blob:, so everything here is absolute.
        const manifest = {
          id: `${origin}/${version}/gift/${gift.id}`,
          name: `${label} · ${theme.brand}`,
          short_name: label,
          start_url: window.location.href,
          scope: `${origin}/${version}/`,
          display: 'standalone',
          orientation: 'portrait',
          background_color: theme.appColor,
          theme_color: theme.appColor,
          icons: [
            { src: icons.medium, sizes: '192x192', type: 'image/png', purpose: 'any' },
            { src: icons.large, sizes: '512x512', type: 'image/png', purpose: 'any' },
            { src: icons.large, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        }
        manifestUrl = URL.createObjectURL(new Blob([JSON.stringify(manifest)], { type: 'application/manifest+json' }))
        undo.push(upsert('link', 'apple-touch-icon', icons.apple), upsert('link', 'manifest', manifestUrl))
      })
      .catch(() => {})

    return () => {
      alive = false
      undo.forEach((fn) => fn())
      if (manifestUrl) URL.revokeObjectURL(manifestUrl)
    }
  }, [gift, version, theme])
}

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let deferredPrompt: BeforeInstallPromptEvent | null = null
const subscribers = new Set<() => void>()
const notify = () => subscribers.forEach((fn) => fn())

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  deferredPrompt = e as BeforeInstallPromptEvent
  notify()
})
window.addEventListener('appinstalled', () => {
  deferredPrompt = null
  notify()
})

/** True when the browser offers a native one-tap install (Chrome on Android). */
export function useCanPromptInstall() {
  return useSyncExternalStore(
    (fn) => {
      subscribers.add(fn)
      return () => subscribers.delete(fn)
    },
    () => deferredPrompt !== null,
  )
}

export async function promptInstall(): Promise<boolean> {
  const event = deferredPrompt
  if (!event) return false
  deferredPrompt = null
  notify()
  await event.prompt()
  return (await event.userChoice).outcome === 'accepted'
}
