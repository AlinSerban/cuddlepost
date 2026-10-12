import { beforeEach, describe, expect, it } from 'vitest'
import { giftExpiresAt } from './gift'
import {
  managePath,
  manageUrl,
  recallManageToken,
  rememberManageToken,
  toPublicGift,
} from './services'
import type { StoredGift } from './api'

function sampleStored(overrides: Partial<StoredGift> = {}): StoredGift {
  const createdAt = Date.UTC(2026, 0, 1)
  return {
    id: 'gift1',
    brand: 'cuddlepost',
    plush: 'bear',
    color: '#c98b5e',
    patchColor: '#e8436b',
    patches: { chest: 'heart' },
    senderName: 'Alex',
    recipientName: 'Sam',
    message: 'Hi',
    occasion: 'Just because',
    hasVoice: false,
    createdAt,
    expiresAt: giftExpiresAt(createdAt),
    status: 'paid',
    senderEmail: 'alex@example.com',
    recipientEmail: 'sam@example.com',
    delivery: 'email',
    paymentId: 'pay_1',
    paymentProvider: 'creem',
    manageToken: 'secret-manage-token',
    voicePath: null,
    ...overrides,
  }
}

describe('manage token helpers', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('builds manage paths with an encoded token', () => {
    expect(managePath('abc', 'tok=1/2')).toBe('/manage/abc?token=tok%3D1%2F2')
    expect(manageUrl('abc', 'tok')).toBe(`${window.location.origin}/manage/abc?token=tok`)
  })

  it('remembers and recalls manage tokens per gift id', () => {
    rememberManageToken('a', 'token-a')
    rememberManageToken('b', 'token-b')
    expect(recallManageToken('a')).toBe('token-a')
    expect(recallManageToken('b')).toBe('token-b')
    expect(recallManageToken('missing')).toBeNull()
  })
})

describe('toPublicGift', () => {
  it('exposes public gift fields without emails, payment, or manage token', () => {
    const pub = toPublicGift(sampleStored())
    expect(pub.id).toBe('gift1')
    expect(pub.senderName).toBe('Alex')
    expect(pub.status).toBe('paid')
    expect(pub).not.toHaveProperty('senderEmail')
    expect(pub).not.toHaveProperty('recipientEmail')
    expect(pub).not.toHaveProperty('manageToken')
    expect(pub).not.toHaveProperty('paymentId')
    expect(pub).not.toHaveProperty('voicePath')
  })

  it('fills expiresAt from createdAt when missing', () => {
    const createdAt = Date.UTC(2026, 2, 1)
    const pub = toPublicGift(sampleStored({ createdAt, expiresAt: 0 }))
    expect(pub.expiresAt).toBe(giftExpiresAt(createdAt))
  })
})
