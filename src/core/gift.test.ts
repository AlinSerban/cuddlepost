import { describe, expect, it } from 'vitest'
import {
  GIFT_TTL_HOURS,
  PRICE,
  createDraft,
  draftToGift,
  giftExpiresAt,
  giftPath,
  giftUrl,
  isGiftExpired,
  newGiftId,
  validateDraft,
} from './gift'

function validDraft(overrides: Parameters<typeof createDraft>[0] = {}) {
  return createDraft({
    senderName: 'Alex',
    recipientName: 'Sam',
    message: 'Thinking of you',
    senderEmail: 'alex@example.com',
    delivery: 'link',
    ...overrides,
  })
}

describe('gift expiry', () => {
  it('uses a 72 hour TTL', () => {
    expect(GIFT_TTL_HOURS).toBe(72)
  })

  it('computes expiresAt from createdAt', () => {
    const created = Date.UTC(2026, 0, 1, 12, 0, 0)
    expect(giftExpiresAt(created)).toBe(created + 72 * 60 * 60 * 1000)
  })

  it('is not expired before the deadline', () => {
    const createdAt = 1_000_000
    const expiresAt = giftExpiresAt(createdAt)
    expect(isGiftExpired({ createdAt, expiresAt }, expiresAt - 1)).toBe(false)
  })

  it('is expired at and after the deadline', () => {
    const createdAt = 1_000_000
    const expiresAt = giftExpiresAt(createdAt)
    expect(isGiftExpired({ createdAt, expiresAt }, expiresAt)).toBe(true)
    expect(isGiftExpired({ createdAt, expiresAt }, expiresAt + 1)).toBe(true)
  })

  it('falls back to createdAt + TTL when expiresAt is missing/0', () => {
    const createdAt = Date.UTC(2026, 5, 1)
    const exp = giftExpiresAt(createdAt)
    expect(isGiftExpired({ createdAt, expiresAt: 0 }, exp - 1)).toBe(false)
    expect(isGiftExpired({ createdAt, expiresAt: 0 }, exp)).toBe(true)
  })
})

describe('validateDraft', () => {
  it('accepts a complete link delivery draft', () => {
    expect(validateDraft(validDraft())).toBeNull()
  })

  it('requires sender name, recipient name, and message', () => {
    expect(validateDraft(validDraft({ senderName: '  ' }))).toBe('Add your name')
    expect(validateDraft(validDraft({ recipientName: '' }))).toBe("Add the recipient's name")
    expect(validateDraft(validDraft({ message: '\n' }))).toBe('Write a little message')
  })

  it('requires a valid sender email', () => {
    expect(validateDraft(validDraft({ senderEmail: 'not-an-email' }))).toBe(
      'Add a valid email for your receipt',
    )
  })

  it('requires recipient email only for email delivery', () => {
    expect(validateDraft(validDraft({ delivery: 'link', recipientEmail: '' }))).toBeNull()
    expect(validateDraft(validDraft({ delivery: 'email', recipientEmail: '' }))).toBe(
      "Add the recipient's email",
    )
    expect(
      validateDraft(validDraft({ delivery: 'email', recipientEmail: 'sam@example.com' })),
    ).toBeNull()
  })

  it('blocks moderated text in names or message', () => {
    const err = validateDraft(validDraft({ message: 'you are a fucking idiot' }))
    expect(err).toMatch(/message/i)
    expect(err).toMatch(/can’t allow|can't allow|kinder/i)
  })
})

describe('draft helpers', () => {
  it('keeps the live price at $5.99 USD', () => {
    expect(PRICE).toEqual({ amount: 5.99, currency: 'USD', label: '$5.99' })
  })

  it('createDraft applies defaults and overrides', () => {
    const d = createDraft({ plush: 'puppy', senderName: 'Alex' })
    expect(d.plush).toBe('puppy')
    expect(d.senderName).toBe('Alex')
    expect(d.delivery).toBe('link')
    expect(d.patches.chest).toBe('heart')
  })

  it('draftToGift trims fields, sets paid + expiry, and maps voice', () => {
    const draft = validDraft({
      senderName: '  Alex  ',
      recipientName: ' Sam',
      message: ' hi ',
      voice: new Blob(['x'], { type: 'audio/webm' }),
    })
    const gift = draftToGift(draft, 'abc123', 'cuddlepost')
    expect(gift.id).toBe('abc123')
    expect(gift.brand).toBe('cuddlepost')
    expect(gift.senderName).toBe('Alex')
    expect(gift.recipientName).toBe('Sam')
    expect(gift.message).toBe('hi')
    expect(gift.hasVoice).toBe(true)
    expect(gift.status).toBe('paid')
    expect(gift.expiresAt).toBe(giftExpiresAt(gift.createdAt))
  })

  it('newGiftId returns a short non-empty id', () => {
    const id = newGiftId()
    expect(id).toMatch(/^[abcdefghijkmnopqrstuvwxyz23456789]{10}$/)
    expect(newGiftId()).not.toBe(id)
  })

  it('giftPath and giftUrl build the public link', () => {
    expect(giftPath('xyz')).toBe('/gift/xyz')
    expect(giftUrl('xyz')).toBe(`${window.location.origin}/gift/xyz`)
  })
})
