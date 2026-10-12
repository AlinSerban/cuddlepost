import { describe, expect, it } from 'vitest'
import { findBlockedText, textLooksClean } from './moderation'

describe('moderation', () => {
  it('treats empty text as clean', () => {
    expect(textLooksClean('')).toBe(true)
    expect(textLooksClean('   ')).toBe(true)
  })

  it('allows ordinary affectionate copy', () => {
    expect(textLooksClean('Thinking of you always')).toBe(true)
    expect(textLooksClean('Happy birthday Sam')).toBe(true)
  })

  it('flags clear profanity', () => {
    expect(textLooksClean('what the fuck')).toBe(false)
  })

  it('findBlockedText reports the failing field label', () => {
    expect(
      findBlockedText([
        { label: 'Your name', value: 'Alex' },
        { label: 'Your message', value: 'you fucking suck' },
      ]),
    ).toMatch(/^Your message/)
  })

  it('findBlockedText returns null when all fields are clean', () => {
    expect(
      findBlockedText([
        { label: 'Your name', value: 'Alex' },
        { label: 'Your message', value: 'Miss you' },
      ]),
    ).toBeNull()
  })
})
