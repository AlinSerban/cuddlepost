import { describe, expect, it } from 'vitest'
import { giftExpiresAt } from '../gift'
import { newManageToken, publicGiftView, type StoredGift } from './types'

function sampleStored(): StoredGift {
  const createdAt = 1_700_000_000_000
  return {
    id: 'g1',
    brand: 'cuddlepost',
    plush: 'cat',
    color: '#111111',
    patchColor: '#ffffff',
    patches: {},
    senderName: 'A',
    recipientName: 'B',
    message: 'Hey',
    occasion: 'Thank you',
    hasVoice: true,
    createdAt,
    expiresAt: giftExpiresAt(createdAt),
    status: 'paid',
    senderEmail: 'a@x.com',
    recipientEmail: 'b@x.com',
    delivery: 'link',
    paymentId: 'ord_1',
    paymentProvider: 'creem',
    manageToken: 'deadbeef',
    voicePath: 'voices/g1.webm',
  }
}

describe('newManageToken', () => {
  it('returns a 32-char hex string', () => {
    const token = newManageToken()
    expect(token).toMatch(/^[0-9a-f]{32}$/)
    expect(newManageToken()).not.toBe(token)
  })
})

describe('publicGiftView', () => {
  it('strips private store fields from the public gift shape', () => {
    const pub = publicGiftView(sampleStored())
    expect(pub).toMatchObject({
      id: 'g1',
      brand: 'cuddlepost',
      plush: 'cat',
      hasVoice: true,
      status: 'paid',
    })
    expect(pub).not.toHaveProperty('senderEmail')
    expect(pub).not.toHaveProperty('recipientEmail')
    expect(pub).not.toHaveProperty('manageToken')
    expect(pub).not.toHaveProperty('paymentId')
    expect(pub).not.toHaveProperty('paymentProvider')
    expect(pub).not.toHaveProperty('voicePath')
    expect(pub).not.toHaveProperty('delivery')
  })
})
