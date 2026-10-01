import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import type { BrandId } from './brand'
import { createDraft, giftPath, giftUrl, validateDraft, type Gift, type GiftDraft } from './gift'
import {
  checkoutAndCreateGift,
  loadGift,
  loadVoiceUrl,
  recallManageToken,
  rememberManageToken,
  toPublicGift,
} from './services'
import type { StoredGift } from './api'

export function useGiftFlow(brand: BrandId, initial?: Partial<GiftDraft>) {
  const navigate = useNavigate()
  const [draft, setDraft] = useState(() => createDraft(initial))
  const [error, setError] = useState<string | null>(null)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [paying, setPaying] = useState(false)

  const update = useCallback((patch: Partial<GiftDraft>) => {
    setDraft((d) => ({ ...d, ...patch }))
    setError(null)
  }, [])

  const openCheckout = () => {
    const problem = validateDraft(draft)
    setError(problem)
    if (!problem) setCheckoutOpen(true)
    return !problem
  }

  const pay = async () => {
    setPaying(true)
    setError(null)
    try {
      const { payment, gift } = await checkoutAndCreateGift(brand, draft)
      if (!payment.ok || !gift) {
        setPaying(false)
        if (!payment.checkoutUrl) setError('Payment failed, please try again.')
        return
      }
      const q = new URLSearchParams()
      if (draft.delivery === 'email' && draft.recipientEmail) q.set('to', draft.recipientEmail)
      // Keep manage/delete link on this page even if localStorage is cleared
      q.set('manage', gift.manageToken)
      navigate(`/sent/${gift.id}?${q.toString()}`)
    } catch (err) {
      console.error(err)
      setPaying(false)
      setError('Something went wrong saving your gift. Please try again.')
    }
  }

  return {
    draft,
    update,
    error,
    setError,
    checkoutOpen,
    closeCheckout: () => !paying && setCheckoutOpen(false),
    openCheckout,
    paying,
    pay,
  }
}

export function useGiftById(_brand: BrandId) {
  const { id = '' } = useParams<{ id: string }>()
  const [params] = useSearchParams()
  const [stored, setStored] = useState<StoredGift | null | undefined>(undefined)
  const [voiceSrc, setVoiceSrc] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    setStored(undefined)
    setVoiceSrc(null)
    if (!id) {
      setStored(null)
      return
    }
    loadGift(id).then(async (g) => {
      if (!alive) return
      setStored(g)
      if (g?.hasVoice) {
        const url = await loadVoiceUrl(g)
        if (alive) setVoiceSrc(url)
      }
    })
    return () => {
      alive = false
    }
  }, [id])

  const gift: Gift | null | undefined =
    stored === undefined ? undefined : stored ? toPublicGift(stored) : null

  const manageFromUrl = params.get('manage')
  useEffect(() => {
    if (id && manageFromUrl) rememberManageToken(id, manageFromUrl)
  }, [id, manageFromUrl])

  return {
    id,
    loading: stored === undefined,
    gift,
    stored: stored ?? null,
    url: gift ? giftUrl(gift.id) : '',
    path: gift ? giftPath(gift.id) : '',
    voiceSrc,
    emailedTo: params.get('to'),
    manageToken: manageFromUrl || (id ? recallManageToken(id) : null),
  }
}

/** @deprecated use useGiftById */
export const useGiftFromUrl = useGiftById

export async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    const area = document.createElement('textarea')
    area.value = text
    document.body.appendChild(area)
    area.select()
    const ok = document.execCommand('copy')
    area.remove()
    return ok
  }
}
