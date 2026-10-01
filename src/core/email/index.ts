import { BRANDS, type BrandId } from '../brand'
import type { Gift } from '../gift'

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
 * Transactional email stub. Logs in the console until Resend/Postmark is wired
 * through a Supabase Edge Function with the API key on the server.
 */
export async function sendGiftEmail(payload: GiftEmailPayload): Promise<void> {
  const brand = BRANDS[payload.brand]
  const subject =
    payload.kind === 'receipt'
      ? `Your ${brand.name} receipt · gift for ${payload.gift.recipientName}`
      : `${payload.gift.senderName} sent you a ${brand.name}`

  const body =
    payload.kind === 'receipt'
      ? [
          `Thanks for sending a ${brand.name}.`,
          `Recipient: ${payload.gift.recipientName}`,
          `Open / share: ${payload.giftUrl}`,
          payload.manageUrl ? `Manage / delete: ${payload.manageUrl}` : '',
        ]
          .filter(Boolean)
          .join('\n')
      : [
          `Hi ${payload.gift.recipientName},`,
          `${payload.gift.senderName} sent you something soft.`,
          `Open your gift: ${payload.giftUrl}`,
        ].join('\n')

  const fnBase =
    (import.meta.env.VITE_SUPABASE_FUNCTIONS_URL as string | undefined) ||
    (import.meta.env.VITE_SUPABASE_URL ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1` : '')

  if (fnBase && import.meta.env.VITE_EMAIL_ENABLED === 'true') {
    await fetch(`${fnBase}/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ ...payload, subject, body, from: brand.supportEmail }),
    })
    return
  }

  await new Promise((r) => setTimeout(r, 200))
  console.info(`[email:${payload.kind}] to=${payload.to}\n${subject}\n${body}`)
}
