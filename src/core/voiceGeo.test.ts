import { describe, expect, it } from 'vitest'
import { isVoiceRestricted } from './voiceGeo'

describe('isVoiceRestricted', () => {
  it('allows null / unknown geo (fail open)', () => {
    expect(isVoiceRestricted(null)).toBe(false)
    expect(isVoiceRestricted({ country: '', region: '' })).toBe(false)
  })

  it('allows typical regions', () => {
    expect(isVoiceRestricted({ country: 'RO', region: '' })).toBe(false)
    expect(isVoiceRestricted({ country: 'US', region: 'CA' })).toBe(false)
    expect(isVoiceRestricted({ country: 'GB', region: 'ENG' })).toBe(false)
  })

  it('blocks Illinois (BIPA)', () => {
    expect(isVoiceRestricted({ country: 'US', region: 'IL' })).toBe(true)
    expect(isVoiceRestricted({ country: 'us', region: 'il' })).toBe(true)
  })
})
