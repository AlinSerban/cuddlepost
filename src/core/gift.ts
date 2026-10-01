export type PlushType = 'bear' | 'bunny' | 'cat' | 'puppy'
export type PatchType = 'heart' | 'star' | 'flower' | 'paw'
export type PatchSlot = 'chest' | 'head' | 'leftFoot' | 'rightFoot'
export type DeliveryMethod = 'link' | 'email'
export type GiftStatus = 'pending_payment' | 'paid' | 'reported' | 'deleted'

import type { BrandId } from './brand'

export interface Gift {
  id: string
  brand: BrandId
  plush: PlushType
  color: string
  patchColor: string
  patches: Partial<Record<PatchSlot, PatchType>>
  senderName: string
  recipientName: string
  message: string
  occasion: string
  hasVoice: boolean
  createdAt: number
  status?: GiftStatus
}

export interface GiftDraft extends Omit<Gift, 'id' | 'createdAt' | 'hasVoice' | 'brand' | 'status'> {
  senderEmail: string
  recipientEmail: string
  delivery: DeliveryMethod
  voice: Blob | null
}

export const PLUSH_TYPES: { id: PlushType; label: string; emoji: string }[] = [
  { id: 'bear', label: 'Bear', emoji: '🧸' },
  { id: 'bunny', label: 'Bunny', emoji: '🐰' },
  { id: 'cat', label: 'Kitty', emoji: '🐱' },
  { id: 'puppy', label: 'Puppy', emoji: '🐶' },
]

export const PATCH_TYPES: { id: PatchType; label: string; emoji: string }[] = [
  { id: 'heart', label: 'Heart', emoji: '❤' },
  { id: 'star', label: 'Star', emoji: '★' },
  { id: 'flower', label: 'Flower', emoji: '✿' },
  { id: 'paw', label: 'Paw', emoji: '🐾' },
]

export const PATCH_SLOTS: { id: PatchSlot; label: string }[] = [
  { id: 'chest', label: 'Chest' },
  { id: 'head', label: 'Forehead' },
  { id: 'leftFoot', label: 'Left foot' },
  { id: 'rightFoot', label: 'Right foot' },
]

export const PATCH_COLORS = ['#e8436b', '#ffffff', '#ffc93c', '#7c5cff', '#2bb5a0', '#3a2a2a']

export const OCCASIONS = [
  'Just because',
  'I miss you',
  'Happy birthday',
  "I'm sorry",
  'Get well soon',
  'Anniversary',
  'Thank you',
]

export const PRICE = { amount: 5.99, currency: 'USD', label: '$5.99' }

export function createDraft(overrides: Partial<GiftDraft> = {}): GiftDraft {
  return {
    plush: 'bear',
    color: '#c98b5e',
    patchColor: '#e8436b',
    patches: { chest: 'heart' },
    senderName: '',
    recipientName: '',
    message: '',
    occasion: OCCASIONS[0],
    senderEmail: '',
    recipientEmail: '',
    delivery: 'link',
    voice: null,
    ...overrides,
  }
}

/** Short random id for /gift/:id links (not guessable enough for casual abuse). */
export function newGiftId(): string {
  const alphabet = 'abcdefghijkmnopqrstuvwxyz23456789'
  const bytes = crypto.getRandomValues(new Uint8Array(10))
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('')
}

export function draftToGift(draft: GiftDraft, id: string, brand: BrandId): Gift {
  return {
    id,
    brand,
    plush: draft.plush,
    color: draft.color,
    patchColor: draft.patchColor,
    patches: draft.patches,
    senderName: draft.senderName.trim(),
    recipientName: draft.recipientName.trim(),
    message: draft.message.trim(),
    occasion: draft.occasion,
    hasVoice: Boolean(draft.voice),
    createdAt: Date.now(),
    status: 'paid',
  }
}

export function giftPath(giftId: string): string {
  return `/gift/${giftId}`
}

export function giftUrl(giftId: string): string {
  return window.location.origin + giftPath(giftId)
}

export function validateDraft(draft: GiftDraft): string | null {
  if (!draft.senderName.trim()) return 'Add your name'
  if (!draft.recipientName.trim()) return "Add the recipient's name"
  if (!draft.message.trim()) return 'Write a little message'
  if (!/^\S+@\S+\.\S+$/.test(draft.senderEmail)) return 'Add a valid email for your receipt'
  if (draft.delivery === 'email' && !/^\S+@\S+\.\S+$/.test(draft.recipientEmail))
    return "Add the recipient's email"
  return null
}
