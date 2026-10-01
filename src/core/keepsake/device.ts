export type Platform = 'ios' | 'android' | 'desktop'

export interface DeviceInfo {
  platform: Platform
  tablet: boolean
  /** Instagram, TikTok, Facebook etc. webviews: no "Add to Home Screen" and unreliable downloads. */
  inApp: boolean
  /** Already opened from a home screen icon. */
  standalone: boolean
  desktopOs: 'windows' | 'mac' | 'other'
  browser: 'safari' | 'samsung' | 'other'
}

const IN_APP_BROWSER =
  /FBAN|FBAV|FB_IAB|FBIOS|Instagram|Line\/|MicroMessenger|TikTok|musical_ly|Bytedance|Snapchat|Twitter|LinkedInApp|Pinterest|; wv\)/i

export function isStandalone(): boolean {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

export function getDevice(): DeviceInfo {
  const ua = navigator.userAgent
  const iPadOS = /Macintosh/.test(ua) && navigator.maxTouchPoints > 1
  const ios = /iPhone|iPad|iPod/.test(ua) || iPadOS
  const android = /Android/.test(ua)
  return {
    platform: ios ? 'ios' : android ? 'android' : 'desktop',
    tablet: iPadOS || /iPad/.test(ua) || (android && !/Mobile/.test(ua)),
    inApp: IN_APP_BROWSER.test(ua),
    standalone: isStandalone(),
    desktopOs: /Windows/.test(ua) ? 'windows' : /Macintosh/.test(ua) ? 'mac' : 'other',
    browser: /SamsungBrowser/.test(ua)
      ? 'samsung'
      : ios && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua)
        ? 'safari'
        : 'other',
  }
}
