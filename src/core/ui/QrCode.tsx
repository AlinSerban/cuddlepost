import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

export function QrCode({
  value,
  dark = '#1a1a1a',
  light = '#ffffff',
  size = 180,
  className,
}: {
  value: string
  dark?: string
  light?: string
  size?: number
  className?: string
}) {
  const [src, setSrc] = useState<string>()
  useEffect(() => {
    QRCode.toDataURL(value, { margin: 1, width: size * 2, color: { dark, light } }).then(setSrc)
  }, [value, dark, light, size])
  return src ? <img className={className} src={src} width={size} height={size} alt="QR code for the gift link" /> : null
}

