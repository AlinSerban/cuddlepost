import { getGiftStore, MAX_VOICE_BYTES, type StoredGift } from './api'
import type { BrandId } from './brand'
import { sendGiftEmail } from './email'
import type { Gift, GiftDraft } from './gift'
import { giftExpiresAt, giftUrl } from './gift'
import { processPayment, type PaymentResult } from './payment'

export type { PaymentResult }

const MANAGE_KEY = 'pg-manage-tokens'

export function rememberManageToken(giftId: string, token: string) {
  try {
    const map = JSON.parse(localStorage.getItem(MANAGE_KEY) || '{}') as Record<string, string>
    map[giftId] = token
    localStorage.setItem(MANAGE_KEY, JSON.stringify(map))
  } catch {
    /* ignore quota */
  }
}

export function recallManageToken(giftId: string): string | null {
  try {
    const map = JSON.parse(localStorage.getItem(MANAGE_KEY) || '{}') as Record<string, string>
    return map[giftId] || null
  } catch {
    return null
  }
}

export function managePath(giftId: string, token: string) {
  return `/manage/${giftId}?token=${encodeURIComponent(token)}`
}

export function manageUrl(giftId: string, token: string) {
  return window.location.origin + managePath(giftId, token)
}

/** Pay first; only then persist gift + voice. Real MoRs redirect before this runs. */
export async function checkoutAndCreateGift(
  brand: BrandId,
  draft: GiftDraft,
): Promise<{ payment: PaymentResult; gift: StoredGift | null }> {
  if (draft.voice && draft.voice.size > MAX_VOICE_BYTES) {
    return {
      payment: { ok: false, paymentId: '', provider: 'stub' },
      gift: null,
    }
  }

  const payment = await processPayment(brand, draft)
  if (!payment.ok) return { payment, gift: null }

  if (payment.checkoutUrl) {
    // Pending gift created by create-checkout Edge Function; creem-webhook marks paid.
    if (payment.giftId && payment.manageToken) {
      rememberManageToken(payment.giftId, payment.manageToken)
    }
    window.location.assign(payment.checkoutUrl)
    return { payment, gift: null }
  }

  const gift = await getGiftStore().finalizePaidGift({
    brand,
    draft,
    paymentId: payment.paymentId,
    paymentProvider: payment.provider,
  })
  rememberManageToken(gift.id, gift.manageToken)

  const url = giftUrl(gift.id)
  const manage = manageUrl(gift.id, gift.manageToken)

  try {
    await sendGiftEmail({
      kind: 'receipt',
      brand,
      to: draft.senderEmail,
      gift,
      giftUrl: url,
      manageUrl: manage,
    })
    if (draft.delivery === 'email' && draft.recipientEmail) {
      await sendGiftEmail({
        kind: 'gift',
        brand,
        to: draft.recipientEmail,
        gift,
        giftUrl: url,
      })
    }
  } catch (err) {
    // Gift is already saved — don't fail checkout if mail provider blips
    console.error('[email] send failed after gift created', err)
  }

  return { payment, gift }
}

export async function loadGift(id: string): Promise<StoredGift | null> {
  return getGiftStore().getGift(id)
}

export async function loadVoiceUrl(gift: StoredGift): Promise<string | null> {
  return getGiftStore().getVoiceUrl(gift)
}

export async function reportGift(id: string, reason: string, details?: string) {
  return getGiftStore().reportGift(id, reason, details)
}

export async function deleteGift(id: string, manageToken: string) {
  return getGiftStore().deleteGift(id, manageToken)
}

/** @deprecated use loadVoiceUrl — kept for gradual migration */
export function loadVoice(giftId: string): string | null {
  try {
    return localStorage.getItem(`pg-local-voice:${giftId}`)
  } catch {
    return null
  }
}

export function toPublicGift(gift: StoredGift): Gift {
  return {
    id: gift.id,
    brand: gift.brand,
    plush: gift.plush,
    color: gift.color,
    patchColor: gift.patchColor,
    patches: gift.patches,
    senderName: gift.senderName,
    recipientName: gift.recipientName,
    message: gift.message,
    occasion: gift.occasion,
    hasVoice: gift.hasVoice,
    createdAt: gift.createdAt,
    expiresAt: gift.expiresAt || giftExpiresAt(gift.createdAt),
    status: gift.status,
  }
}
