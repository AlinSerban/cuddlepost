import type { BrandId } from '../brand'
import type { Gift, GiftDraft, GiftStatus } from '../gift'

export interface StoredGift extends Gift {
  senderEmail: string
  recipientEmail: string
  delivery: 'link' | 'email'
  paymentId: string
  paymentProvider: string
  manageToken: string
  voicePath: string | null
  status: GiftStatus
}

export interface FinalizePaymentInput {
  brand: BrandId
  draft: GiftDraft
  paymentId: string
  paymentProvider: string
}

export interface GiftStore {
  mode: 'local' | 'supabase'
  finalizePaidGift(input: FinalizePaymentInput): Promise<StoredGift>
  getGift(id: string): Promise<StoredGift | null>
  getVoiceUrl(gift: StoredGift): Promise<string | null>
  reportGift(id: string, reason: string, details?: string): Promise<void>
  deleteGift(id: string, manageToken: string): Promise<boolean>
}

export function newManageToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

export function publicGiftView(gift: StoredGift): Gift {
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
    status: gift.status,
  }
}
