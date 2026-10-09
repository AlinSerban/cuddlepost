import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { track } from './analytics'
import type { BrandId } from './brand'
import { createDraft, giftPath, giftUrl, isGiftExpired, validateDraft, type Gift, type GiftDraft } from './gift'
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
    if (!problem) {
      setCheckoutOpen(true)
      track('checkout_opened', { plush: draft.plush, delivery: draft.delivery })
    }
    return !problem
  }

  const pay = async () => {
    setPaying(true)
    setError(null)
    track('pay_clicked', { plush: draft.plush, delivery: draft.delivery })
    try {
      const { payment, gift } = await checkoutAndCreateGift(brand, draft)
      if (!payment.ok || !gift) {
        setPaying(false)
        if (!payment.checkoutUrl) setError('Payment failed, please try again.')
        return
      }
      track('gift_created', {
        plush: draft.plush,
        delivery: draft.delivery,
        has_voice: Boolean(draft.voice),
      })
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
  const [confirmingPayment, setConfirmingPayment] = useState(false)

  const manageFromUrl = params.get('manage')
  const awaitingPayment = Boolean(manageFromUrl || params.get('checkout_id'))

  useEffect(() => {
    if (id && manageFromUrl) rememberManageToken(id, manageFromUrl)
  }, [id, manageFromUrl])

  useEffect(() => {
    let alive = true
    let timer: ReturnType<typeof setTimeout> | undefined
    setStored(undefined)
    setVoiceSrc(null)
    setConfirmingPayment(false)
    if (!id) {
      setStored(null)
      return
    }

    const started = Date.now()
    const poll = async () => {
      try {
        const g = await loadGift(id)
        if (!alive) return
        if (g) {
          setStored(g)
          setConfirmingPayment(false)
          if (g.hasVoice && !isGiftExpired(g)) {
            const url = await loadVoiceUrl(g)
            if (alive) setVoiceSrc(url)
          }
          return
        }
        if (awaitingPayment && Date.now() - started < 45_000) {
          setConfirmingPayment(true)
          setStored(undefined)
          timer = setTimeout(poll, 1500)
          return
        }
        setStored(null)
        setConfirmingPayment(false)
      } catch {
        if (!alive) return
        if (awaitingPayment && Date.now() - started < 45_000) {
          setConfirmingPayment(true)
          timer = setTimeout(poll, 1500)
          return
        }
        setStored(null)
        setConfirmingPayment(false)
      }
    }

    void poll()
    return () => {
      alive = false
      if (timer) clearTimeout(timer)
    }
  }, [id, awaitingPayment])

  const gift: Gift | null | undefined =
    stored === undefined ? undefined : stored ? toPublicGift(stored) : null

  return {
    id,
    loading: stored === undefined,
    confirmingPayment,
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
