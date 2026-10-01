import { useEffect } from 'react'
import { BRANDS, type BrandId } from './brand'
import { PLUSH_TYPES, type Gift } from './gift'

function upsertMeta(attr: 'name' | 'property', key: string, value: string): () => void {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`)
  const previous = el?.getAttribute('content') ?? null
  const created = !el
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', value)
  const node = el
  return () => {
    if (created) node.remove()
    else if (previous !== null) node.setAttribute('content', previous)
  }
}

function upsertTitle(title: string): () => void {
  const previous = document.title
  document.title = title
  return () => {
    document.title = previous
  }
}

/** Client-side SEO / social tags. Crawlers that execute JS see these; for perfect
 *  WhatsApp/iMessage previews, deploy the Cloudflare Pages Function in each app's `functions/`. */
export function usePageMeta(opts: {
  title: string
  description: string
  url?: string
  image?: string
  noindex?: boolean
}) {
  useEffect(() => {
    const undo = [
      upsertTitle(opts.title),
      upsertMeta('name', 'description', opts.description),
      upsertMeta('property', 'og:title', opts.title),
      upsertMeta('property', 'og:description', opts.description),
      upsertMeta('property', 'og:type', 'website'),
      upsertMeta('name', 'twitter:card', 'summary_large_image'),
    ]
    if (opts.url) undo.push(upsertMeta('property', 'og:url', opts.url))
    if (opts.image) {
      undo.push(
        upsertMeta('property', 'og:image', opts.image),
        upsertMeta('name', 'twitter:image', opts.image),
      )
    }
    if (opts.noindex) undo.push(upsertMeta('name', 'robots', 'noindex, nofollow'))
    return () => undo.forEach((fn) => fn())
  }, [opts.title, opts.description, opts.url, opts.image, opts.noindex])
}

export function useBrandHomeMeta(brand: BrandId) {
  const b = BRANDS[brand]
  usePageMeta({
    title: `${b.name} — ${b.tagline}`,
    description: `Send a personalized digital plushie with a private message. ${b.tagline}.`,
  })
}

export function useGiftMeta(brand: BrandId, gift: Gift | null | undefined) {
  const b = BRANDS[brand]
  const plush = gift ? PLUSH_TYPES.find((p) => p.id === gift.plush)?.label.toLowerCase() : 'plushie'
  usePageMeta({
    title: gift ? `${gift.senderName} sent you a ${b.name}` : `${b.name} gift`,
    description: gift
      ? `${gift.occasion} · a personalized ${plush} for ${gift.recipientName}`
      : 'Open your digital plushie gift.',
    url: gift ? window.location.href : undefined,
    noindex: true,
  })
}
