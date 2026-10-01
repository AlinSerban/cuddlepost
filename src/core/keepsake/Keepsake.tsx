import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { copyText } from '../flow'
import { PLUSH_TYPES, type Gift } from '../gift'
import { QrCode } from '../ui/QrCode'
import { getDevice, type DeviceInfo } from './device'
import { homeScreenLabel, promptInstall, useAppIcon, useCanPromptInstall } from './homescreen'
import type { KeepsakeTheme } from './theme'
import { canShareFile, createWallpaper, downloadWallpaper, wallpaperSize, type Wallpaper } from './wallpaper'
import './keepsake.css'

interface KeepsakeProps {
  gift: Gift
  theme: KeepsakeTheme
  title: ReactNode
  subtitle: ReactNode
  /** Brand button classes, reused inside the sheets. */
  btn: string
  btnAlt: string
  className?: string
}

/**
 * "Keep it close" options for the recipient. Phones get Add to Home Screen + a lock screen
 * wallpaper; desktops get a desktop-sized wallpaper and a QR to continue on their phone.
 */
export function Keepsake({ gift, theme, title, subtitle, btn, btnAlt, className = '' }: KeepsakeProps) {
  const [device] = useState(getDevice)
  const canPrompt = useCanPromptInstall()
  const icon = useAppIcon(gift, theme)
  const [sheet, setSheet] = useState<'wallpaper' | 'home' | null>(null)
  const [installed, setInstalled] = useState(false)
  const closeSheet = useCallback(() => setSheet(null), [])
  const mobile = device.platform !== 'desktop'
  const plush = PLUSH_TYPES.find((p) => p.id === gift.plush)!.label.toLowerCase()
  const label = homeScreenLabel(gift)

  const addToHome = async () => {
    if (canPrompt && !device.inApp) setInstalled(await promptInstall())
    else setSheet('home')
  }

  return (
    <section className={`pg-keep ${className}`}>
      <header className="pg-keep-head">
        <h3>{title}</h3>
        <p>{subtitle}</p>
      </header>

      <div className="pg-keep-options">
        {mobile && !device.standalone && !installed && (
          <button type="button" className="pg-keep-opt" onClick={addToHome}>
            <span className="pg-keep-art">
              <AppIcon src={icon} />
            </span>
            <span className="pg-keep-copy">
              <strong>Add to Home Screen</strong>
              <small>Opens straight to your {plush}, like an app</small>
            </span>
          </button>
        )}
        <button type="button" className="pg-keep-opt" onClick={() => setSheet('wallpaper')}>
          <span className="pg-keep-art">
            <span className={`pg-keep-device is-${mobile ? 'mobile' : 'desktop'}`}>{icon && <img src={icon} alt="" />}</span>
          </span>
          <span className="pg-keep-copy">
            <strong>{mobile ? 'Save as wallpaper' : 'Download wallpaper'}</strong>
            <small>{mobile ? 'For your lock screen or home screen' : 'Made to fit your screen'}</small>
          </span>
        </button>
      </div>

      {installed && (
        <p className="pg-keep-note" role="status">
          Done! Look for “{label}” on your home screen.
        </p>
      )}

      {!mobile && (
        <div className="pg-keep-phone">
          <QrCode value={window.location.href} size={124} dark={theme.qr.dark} light={theme.qr.light} />
          <p>
            <strong>Want it on your phone too?</strong>
            Point your phone's camera at this code to put {gift.senderName}'s {plush} on your home screen or lock
            screen.
          </p>
        </div>
      )}

      {sheet === 'wallpaper' && (
        <WallpaperSheet gift={gift} theme={theme} device={device} btn={btn} btnAlt={btnAlt} onClose={closeSheet} />
      )}
      {sheet === 'home' && (
        <HomeScreenSheet device={device} icon={icon} label={label} btn={btn} btnAlt={btnAlt} onClose={closeSheet} />
      )}
    </section>
  )
}

function AppIcon({ src }: { src: string | null }) {
  return src ? <img className="pg-app-icon" src={src} alt="" /> : <span className="pg-app-icon is-loading" />
}

function Sheet({ title, onClose, children }: { title: ReactNode; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = overflow
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  return (
    <div className="pg-modal-backdrop pg-sheet-backdrop" onClick={onClose}>
      <div className="pg-modal pg-sheet" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="pg-modal-close" onClick={onClose} aria-label="Close">
          ×
        </button>
        <h3>{title}</h3>
        {children}
      </div>
    </div>
  )
}

function Steps({ items }: { items: ReactNode[] }) {
  return (
    <ol className="pg-steps">
      {items.map((item, i) => (
        <li key={i}>
          <span className="pg-step-n">{i + 1}</span>
          <span>{item}</span>
        </li>
      ))}
    </ol>
  )
}

type SaveMethod = 'share' | 'download' | 'hold'

function WallpaperSheet({
  gift,
  theme,
  device,
  btn,
  btnAlt,
  onClose,
}: {
  gift: Gift
  theme: KeepsakeTheme
  device: DeviceInfo
  btn: string
  btnAlt: string
  onClose: () => void
}) {
  const format = device.platform === 'desktop' ? 'desktop' : 'mobile'
  const size = useMemo(() => wallpaperSize(format, device.tablet), [format, device.tablet])
  const [wall, setWall] = useState<Wallpaper | null>(null)
  const [failed, setFailed] = useState(false)
  const [saved, setSaved] = useState(false)
  const [shareFailed, setShareFailed] = useState(false)

  useEffect(() => {
    let alive = true
    let made: Wallpaper | null = null
    createWallpaper(gift, theme, format, device.tablet).then(
      (w) => {
        if (alive) setWall((made = w))
        else URL.revokeObjectURL(w.url)
      },
      () => alive && setFailed(true),
    )
    return () => {
      alive = false
      if (made) URL.revokeObjectURL(made.url)
    }
  }, [gift, theme, format, device.tablet])

  // iOS saves images to Photos through the share sheet; Android and desktop just download.
  const method: SaveMethod =
    device.platform === 'ios'
      ? wall && !shareFailed && canShareFile(wall.file)
        ? 'share'
        : 'hold'
      : device.platform === 'android' && device.inApp
        ? 'hold'
        : 'download'

  const save = async () => {
    if (!wall) return
    if (method === 'share') {
      try {
        await navigator.share({ files: [wall.file] })
        setSaved(true)
      } catch (e) {
        if ((e as DOMException).name !== 'AbortError') setShareFailed(true)
      }
      return
    }
    downloadWallpaper(wall)
    setSaved(true)
  }

  const saveLabel = method === 'share' ? 'Save to Photos' : format === 'mobile' ? 'Save to my phone' : 'Download wallpaper'
  const title = saved ? 'Now make it your wallpaper' : format === 'mobile' ? 'Your new wallpaper' : 'Your desktop wallpaper'

  return (
    <Sheet title={title} onClose={onClose}>
      {!saved && (
        <div className={`pg-wall-frame is-${format}`} style={{ aspectRatio: `${size.width} / ${size.height}` }}>
          {wall ? (
            <img src={wall.url} alt="Wallpaper preview" />
          ) : (
            <span className="pg-wall-loading">
              {failed ? "Sorry, this device couldn't make the wallpaper." : 'Stitching your wallpaper…'}
            </span>
          )}
        </div>
      )}

      {!saved && method === 'hold' && wall && (
        <p className="pg-sheet-hint">
          Press and hold the picture, then tap <b>{device.platform === 'ios' ? 'Save to Photos' : 'Download image'}</b>.
        </p>
      )}
      {saved && <Steps items={wallpaperSteps(device)} />}

      <div className="pg-sheet-actions">
        {!saved && method !== 'hold' && (
          <button type="button" className={btn} disabled={!wall} onClick={save}>
            {saveLabel}
          </button>
        )}
        {!saved && method === 'hold' && wall && (
          <button type="button" className={btn} onClick={() => setSaved(true)}>
            I saved it, what's next?
          </button>
        )}
        {saved && (
          <>
            <button type="button" className={btn} onClick={onClose}>
              Done
            </button>
            <button type="button" className={btnAlt} onClick={() => setSaved(false)}>
              {format === 'desktop' ? "Didn't download? Try again" : 'Back to the picture'}
            </button>
          </>
        )}
      </div>

      {!saved && wall && (
        <p className="pg-sheet-meta">
          {wall.width} × {wall.height} px · made for your screen
        </p>
      )}
    </Sheet>
  )
}

function wallpaperSteps(device: DeviceInfo): ReactNode[] {
  if (device.platform === 'ios')
    return [
      <>
        Open the <b>Photos</b> app and tap your new wallpaper.
      </>,
      <>
        Tap Share <ShareIcon />, then <b>Use as Wallpaper</b>.
      </>,
      <>
        Tap <b>Add</b>, then <b>Set as Wallpaper Pair</b> to see it on both screens.
      </>,
    ]
  if (device.platform === 'android')
    return [
      <>
        Open the picture from your <b>downloads</b> or your <b>Gallery</b> app.
      </>,
      <>
        Tap <b>⋮</b>, then <b>Set as wallpaper</b> (sometimes under <b>Use as</b>).
      </>,
      <>
        Choose <b>Home screen</b>, <b>Lock screen</b>, or both.
      </>,
    ]
  if (device.desktopOs === 'windows')
    return [
      <>
        Open your <b>Downloads</b> folder.
      </>,
      <>Right-click the picture.</>,
      <>
        Choose <b>Set as desktop background</b>.
      </>,
    ]
  if (device.desktopOs === 'mac')
    return [
      <>
        Open your <b>Downloads</b> folder in Finder.
      </>,
      <>Control-click (or right-click) the picture.</>,
      <>
        Choose <b>Set Desktop Picture</b>.
      </>,
    ]
  return [
    <>
      Open your system's <b>Background</b> or <b>Wallpaper</b> settings.
    </>,
    <>
      Pick the picture from your <b>Downloads</b> folder.
    </>,
  ]
}

function HomeScreenSheet({
  device,
  icon,
  label,
  btn,
  btnAlt,
  onClose,
}: {
  device: DeviceInfo
  icon: string | null
  label: string
  btn: string
  btnAlt: string
  onClose: () => void
}) {
  const [copied, setCopied] = useState(false)

  return (
    <Sheet title={device.inApp ? 'Open it in your browser first' : 'Add it to your Home Screen'} onClose={onClose}>
      <div className="pg-home-preview" aria-hidden>
        {Array.from({ length: 8 }, (_, i) =>
          i === 5 ? (
            <span key={i} className="pg-home-app is-ours">
              <AppIcon src={icon} />
              <small>{label}</small>
            </span>
          ) : (
            <span key={i} className="pg-home-app">
              <i />
              <small />
            </span>
          ),
        )}
      </div>
      {device.inApp && <p className="pg-sheet-hint">This app's built-in browser can't add pages to your home screen.</p>}
      <Steps items={homeScreenSteps(device, label)} />
      <div className="pg-sheet-actions">
        {device.inApp && (
          <button type="button" className={btn} onClick={async () => setCopied(await copyText(window.location.href))}>
            {copied ? 'Copied! Paste it in your browser' : 'Copy link'}
          </button>
        )}
        <button type="button" className={device.inApp ? btnAlt : btn} onClick={onClose}>
          Got it
        </button>
      </div>
    </Sheet>
  )
}

function homeScreenSteps(device: DeviceInfo, label: string): ReactNode[] {
  const done = (
    <>
      Tap <b>Add</b>. “{label}” will be waiting on your home screen.
    </>
  )
  if (device.inApp) {
    const browser = device.platform === 'ios' ? 'Safari' : 'Chrome'
    return [
      <>
        Tap <b>•••</b> or <b>⋮</b> at the top or bottom of this screen.
      </>,
      <>
        Choose <b>Open in browser</b> (or <b>Open in {browser}</b>).
      </>,
      <>
        In {browser}, tap <b>Add to Home Screen</b> on this page again.
      </>,
    ]
  }
  if (device.platform === 'ios')
    return [
      device.browser === 'safari' ? (
        <>
          Tap Share <ShareIcon /> in Safari's toolbar. Don't see it? Tap <b>•••</b> first.
        </>
      ) : (
        <>
          Tap Share <ShareIcon /> in the address bar.
        </>
      ),
      <>
        Scroll down and tap <b>Add to Home Screen</b> <AddIcon />.
      </>,
      done,
    ]
  if (device.browser === 'samsung')
    return [
      <>
        Tap the menu <b>☰</b> at the bottom of the screen.
      </>,
      <>
        Tap <b>Add page to</b>, then <b>Home screen</b>.
      </>,
      done,
    ]
  return [
    <>
      Tap the menu <b>⋮</b> in the corner of your browser.
    </>,
    <>
      Tap <b>Add to Home screen</b> (sometimes called <b>Install app</b>).
    </>,
    done,
  ]
}

function ShareIcon() {
  return (
    <svg className="pg-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" role="img" aria-label="Share icon">
      <path d="M12 3v12M8 7l4-4 4 4" />
      <path d="M7 10H6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2h-1" />
    </svg>
  )
}

function AddIcon() {
  return (
    <svg className="pg-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" role="img" aria-label="Add icon">
      <rect x="3.5" y="3.5" width="17" height="17" rx="4" />
      <path d="M12 8v8M8 12h8" />
    </svg>
  )
}
