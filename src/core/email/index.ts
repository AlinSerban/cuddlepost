import { BRANDS, type BrandId } from '../brand'
import { GIFT_TTL_HOURS, type Gift } from '../gift'

export type EmailKind = 'receipt' | 'gift'

export interface GiftEmailPayload {
  kind: EmailKind
  brand: BrandId
  to: string
  gift: Gift
  giftUrl: string
  manageUrl?: string
}

/**
 * Calls Supabase Edge Function `send-email` when VITE_EMAIL_ENABLED=true.
 * Resend API key lives only on the server.
 */
export async function sendGiftEmail(payload: GiftEmailPayload): Promise<void> {
  const brand = BRANDS[payload.brand]
  const days = GIFT_TTL_HOURS / 24
  const subject =
    payload.kind === 'receipt'
      ? `Your ${brand.name} receipt · gift for ${payload.gift.recipientName}`
      : `${payload.gift.senderName} sent you a ${brand.name}`

  const body =
    payload.kind === 'receipt'
      ? [
          `Thanks for sending a ${brand.name}.`,
          ``,
          `To: ${payload.gift.recipientName}`,
          `Open / share: ${payload.giftUrl}`,
          payload.manageUrl ? `Manage / delete: ${payload.manageUrl}` : '',
          ``,
          `This gift link stays open for ${days} days.`,
        ].join('\n')
      : [
          `Hi ${payload.gift.recipientName},`,
          ``,
          `${payload.gift.senderName} sent you something soft.`,
          `Open your gift: ${payload.giftUrl}`,
          ``,
          `This link stays open for ${days} days.`,
        ].join('\n')

  const fnBase =
    (import.meta.env.VITE_SUPABASE_FUNCTIONS_URL as string | undefined) ||
    (import.meta.env.VITE_SUPABASE_URL ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1` : '')

  if (fnBase && import.meta.env.VITE_EMAIL_ENABLED === 'true') {
    const res = await fetch(`${fnBase}/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        kind: payload.kind,
        brand: payload.brand,
        to: payload.to,
        subject,
        body,
        from: brand.supportEmail,
        giftUrl: payload.giftUrl,
        manageUrl: payload.manageUrl,
      }),
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      console.error('[email] send-email failed', res.status, text)
      throw new Error('Could not send email')
    }
    return
  }

  await new Promise((r) => setTimeout(r, 200))
  console.info(`[email:${payload.kind}] to=${payload.to}\n${subject}\n${body}`)
}
