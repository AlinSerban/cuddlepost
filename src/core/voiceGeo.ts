/**
 * Voice notes can be treated as biometric data in some places (e.g. Illinois BIPA).
 * We hide recording where that risk applies. Lookup fails open so local/dev still works.
 */

export type GeoInfo = {
  country: string
  region: string
}

/** ISO country, or COUNTRY-REGION (e.g. US-IL). */
const VOICE_RESTRICTED = new Set([
  'US-IL', // Illinois Biometric Information Privacy Act
])

export function isVoiceRestricted(geo: GeoInfo | null): boolean {
  if (!geo?.country) return false
  const country = geo.country.toUpperCase()
  const region = (geo.region || '').toUpperCase()
  if (region && VOICE_RESTRICTED.has(`${country}-${region}`)) return true
  return VOICE_RESTRICTED.has(country)
}

function parseCfTrace(text: string): GeoInfo | null {
  const loc = text.match(/^loc=([A-Za-z]{2})$/m)?.[1]
  if (!loc || loc === 'XX' || loc === 'T1') return null
  return { country: loc.toUpperCase(), region: '' }
}

async function detectViaIpApi(): Promise<GeoInfo | null> {
  try {
    const res = await fetch('https://ipapi.co/json/', { cache: 'no-store' })
    if (!res.ok) return null
    const data = (await res.json()) as { country_code?: string; region_code?: string; error?: boolean }
    if (data.error || !data.country_code) return null
    return {
      country: data.country_code.toUpperCase(),
      region: (data.region_code || '').toUpperCase(),
    }
  } catch {
    return null
  }
}

/** Resolve visitor country (+ region when needed). Prefer Cloudflare trace on Pages. */
export async function detectVisitorGeo(): Promise<GeoInfo | null> {
  try {
    const res = await fetch('/cdn-cgi/trace', { cache: 'no-store' })
    if (res.ok) {
      const geo = parseCfTrace(await res.text())
      if (geo) {
        if (geo.country === 'US') {
          const finer = await detectViaIpApi()
          if (finer?.country === 'US') return finer
        }
        return geo
      }
    }
  } catch {
    /* fall through */
  }
  return detectViaIpApi()
}

let cached: Promise<boolean> | null = null

/** true = voice recording allowed for this visitor */
export function voiceAllowed(): Promise<boolean> {
  if (!cached) {
    cached = detectVisitorGeo()
      .then((geo) => !isVoiceRestricted(geo))
      .catch(() => true)
  }
  return cached
}
