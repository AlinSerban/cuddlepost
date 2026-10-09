import type { BrandId } from '../brand'
import type { GiftDraft } from '../gift'
import { PRICE } from '../gift'

export type PaymentProvider = 'stub' | 'polar' | 'paddle' | 'creem'

export interface PaymentResult {
  ok: boolean
  paymentId: string
  provider: PaymentProvider
  /** When using a real MoR, redirect the browser here instead of creating the gift client-side. */
  checkoutUrl?: string
  giftId?: string
  manageToken?: string
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function blobToBase64(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer()
  let binary = ''
  const bytes = new Uint8Array(buffer)
  bytes.forEach((b) => (binary += String.fromCharCode(b)))
  return btoa(binary)
}

function functionsBase() {
  return (
    (import.meta.env.VITE_SUPABASE_FUNCTIONS_URL as string | undefined) ||
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`
  )
}

/**
 * Checkout adapter.
 * - stub: fake success, client creates the gift
 * - creem / others: Supabase Edge Function create-checkout → redirect; webhook finalizes
 */
export async function processPayment(
  brand: BrandId,
  draft: GiftDraft,
): Promise<PaymentResult> {
  const provider = (import.meta.env.VITE_PAYMENT_PROVIDER as PaymentProvider | undefined) || 'stub'

  if (provider === 'stub') {
    await wait(1200)
    return {
      ok: true,
      paymentId: `pay_stub_${Date.now()}`,
      provider: 'stub',
    }
  }

  const voiceBase64 = draft.voice ? await blobToBase64(draft.voice) : null
  const res = await fetch(`${functionsBase()}/create-checkout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY as string,
    },
    body: JSON.stringify({
      brand,
      amount: PRICE.amount,
      currency: PRICE.currency,
      provider,
      plush: draft.plush,
      color: draft.color,
      patchColor: draft.patchColor,
      patches: draft.patches,
      senderName: draft.senderName,
      recipientName: draft.recipientName,
      message: draft.message,
      occasion: draft.occasion,
      senderEmail: draft.senderEmail,
      recipientEmail: draft.recipientEmail,
      delivery: draft.delivery,
      voiceBase64,
      voiceContentType: draft.voice?.type || 'audio/webm',
    }),
  })
  if (!res.ok) return { ok: false, paymentId: '', provider }
  const data = (await res.json()) as {
    checkoutUrl: string
    paymentId: string
    giftId?: string
    manageToken?: string
  }
  return {
    ok: true,
    paymentId: data.paymentId,
    provider,
    checkoutUrl: data.checkoutUrl,
    giftId: data.giftId,
    manageToken: data.manageToken,
  }
}
