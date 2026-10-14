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
 * Client-side email helper. Live Creem receipts / gift mails are sent by
 * creem-webhook (Resend + service role). The send-email Edge Function is locked
 * to service_role and must not be called from the browser.
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
          `${payload.gift.senderName} sent you a Cuddlepost.`,
          `Open your gift: ${payload.giftUrl}`,
          ``,
          `This link stays open for ${days} days.`,
        ].join('\n')

  await new Promise((r) => setTimeout(r, 200))
  console.info(`[email:${payload.kind}] to=${payload.to}\n${subject}\n${body}`)
}
