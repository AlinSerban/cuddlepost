import { describe, expect, it } from 'vitest'
import { BRANDS } from './brand'
import { MAX_VOICE_BYTES, MAX_VOICE_SECONDS } from './api'
import { legalPath, legalPages } from './legal'
import { MESSAGE_LIMIT } from './ui/Fields'

describe('product constants', () => {
  it('keeps cuddlepost brand contact details', () => {
    expect(BRANDS.cuddlepost.name).toBe('Cuddlepost')
    expect(BRANDS.cuddlepost.supportEmail).toBe('post@cuddlepost.fun')
  })

  it('caps voice notes at 2MB / 60s', () => {
    expect(MAX_VOICE_BYTES).toBe(2 * 1024 * 1024)
    expect(MAX_VOICE_SECONDS).toBe(60)
  })

  it('caps gift messages at 280 characters', () => {
    expect(MESSAGE_LIMIT).toBe(280)
  })
})

describe('legal helpers', () => {
  it('maps legal pages to root paths', () => {
    expect(legalPath('terms')).toBe('/terms')
    expect(legalPath('privacy')).toBe('/privacy')
    expect(legalPath('refund')).toBe('/refund')
  })

  it('includes terms, privacy, and refund copy for cuddlepost', () => {
    const pages = legalPages('cuddlepost')
    expect(pages.map((p) => p.id).sort()).toEqual(['privacy', 'refund', 'terms'])
    expect(pages.every((p) => p.sections.length > 0)).toBe(true)
    expect(JSON.stringify(pages)).toContain('post@cuddlepost.fun')
  })
})
