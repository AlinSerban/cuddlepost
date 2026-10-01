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
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

/**
 * Checkout adapter. Today: stub that always succeeds after a short delay.
 * Tomorrow: Polar (primary) / Paddle / Creem — create a checkout session server-side,
 * redirect the buyer, then finalize the gift from a webhook with the service role key.
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

  // Real providers need a Supabase Edge Function (or CF Worker) that creates the session.
  const fn =
    (import.meta.env.VITE_SUPABASE_FUNCTIONS_URL as string | undefined) ||
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`
  const res = await fetch(`${fn}/create-checkout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({
      brand,
      amount: PRICE.amount,
      currency: PRICE.currency,
      senderEmail: draft.senderEmail,
      recipientName: draft.recipientName,
      provider,
    }),
  })
  if (!res.ok) return { ok: false, paymentId: '', provider }
  const data = (await res.json()) as { checkoutUrl: string; paymentId: string }
  return {
    ok: true,
    paymentId: data.paymentId,
    provider,
    checkoutUrl: data.checkoutUrl,
  }
}
