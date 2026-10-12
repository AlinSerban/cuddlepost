import { describe, expect, it } from 'vitest'
import { hexToHsl, hslToHex } from './color'

describe('color conversion', () => {
  it('round-trips common hex colors through HSL', () => {
    for (const hex of ['#c98b5e', '#e8436b', '#ffffff', '#000000', '#7c5cff']) {
      const hsl = hexToHsl(hex)
      expect(hslToHex(hsl).toLowerCase()).toBe(hex.toLowerCase())
    }
  })

  it('parses hex into hue/sat/light ranges', () => {
    const hsl = hexToHsl('#ff0000')
    expect(hsl.h).toBeGreaterThanOrEqual(0)
    expect(hsl.h).toBeLessThan(360)
    expect(hsl.s).toBeGreaterThan(90)
    expect(hsl.l).toBeGreaterThan(40)
    expect(hsl.l).toBeLessThan(60)
  })
})
