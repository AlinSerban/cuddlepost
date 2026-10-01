import { drawLines, fitLine, fitText, roundRectPath, spacedText } from './core/keepsake/canvas'
import type { KeepsakeTheme } from './core/keepsake/theme'

const PAPER = '#f6eddf'
const CREAM = '#fffaf1'
const KRAFT = '#d9b48a'
const TERRA = '#c8693f'
const SAGE = '#6b8f71'
const COCOA = '#3b2f2a'

const caveat = (weight: number) => (px: number) => `${weight} ${px}px Caveat`
const fraunces = (px: number) => `700 ${px}px Fraunces`
const dmSans = (px: number) => `700 ${px}px "DM Sans"`

function paperNoise(ctx: CanvasRenderingContext2D, random: () => number) {
  const tile = document.createElement('canvas')
  tile.width = tile.height = 160
  const t = tile.getContext('2d')!
  for (let i = 0; i < 900; i++) {
    t.fillStyle = `rgba(90, 64, 38, ${0.03 + random() * 0.06})`
    t.fillRect(random() * 160, random() * 160, 1 + random(), 1 + random())
  }
  return ctx.createPattern(tile, 'repeat')
}

function postDate(ts: number) {
  return new Date(ts).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()
}

/** Luggage tag with a pointed left end, like `.v3-tag` on the site. */
function tagPath(ctx: CanvasRenderingContext2D, x0: number, y0: number, w: number, h: number, point: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x0 + point, y0)
  ctx.lineTo(x0 + w - r, y0)
  ctx.arcTo(x0 + w, y0, x0 + w, y0 + r, r)
  ctx.lineTo(x0 + w, y0 + h - r)
  ctx.arcTo(x0 + w, y0 + h, x0 + w - r, y0 + h, r)
  ctx.lineTo(x0 + point, y0 + h)
  ctx.lineTo(x0, y0 + h / 2)
  ctx.closePath()
}

export const cuddlepostKeepsake: KeepsakeTheme = {
  brand: 'Cuddlepost',
  appColor: PAPER,
  statusBar: 'default',
  shadowColor: '#5a3b22',
  qr: { dark: COCOA, light: CREAM },
  fonts: [caveat(500)(30), caveat(700)(30), fraunces(30), dmSans(20)],

  drawIconBackground(ctx, s) {
    ctx.fillStyle = '#7f9e84'
    ctx.fillRect(0, 0, s, s)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.13)'
    ctx.lineWidth = Math.max(1, s / 256)
    for (let i = 1; i < 8; i++) {
      const v = (s / 8) * i
      ctx.beginPath()
      ctx.moveTo(v, 0)
      ctx.lineTo(v, s)
      ctx.moveTo(0, v)
      ctx.lineTo(s, v)
      ctx.stroke()
    }
  },

  drawWallpaper({ ctx, width: w, height: h, layout: L, plush, gift, random }) {
    const u = L.unit
    ctx.fillStyle = PAPER
    ctx.fillRect(0, 0, w, h)
    const noise = paperNoise(ctx, random)
    if (noise) {
      ctx.fillStyle = noise
      ctx.fillRect(0, 0, w, h)
    }

    // the parcel the plushie arrived in
    const p = L.plush
    const pw = p.size * 0.8
    const ph = p.size * 0.72
    const px = p.x + (p.size - pw) / 2
    const py = p.y + p.size * 0.1
    ctx.save()
    ctx.shadowColor = 'rgba(90, 59, 34, 0.28)'
    ctx.shadowBlur = 40 * u
    ctx.shadowOffsetY = 20 * u
    roundRectPath(ctx, px, py, pw, ph, 22 * u)
    const kraft = ctx.createLinearGradient(px, py, px + pw, py + ph)
    kraft.addColorStop(0, '#e0bd92')
    kraft.addColorStop(1, '#cfa576')
    ctx.fillStyle = kraft
    ctx.fill()
    ctx.restore()

    ctx.save()
    roundRectPath(ctx, px, py, pw, ph, 22 * u)
    ctx.clip()
    ctx.fillStyle = 'rgba(200, 105, 63, 0.55)'
    ctx.fillRect(px + pw * 0.46, py, pw * 0.08, ph)
    ctx.restore()

    roundRectPath(ctx, px + 14 * u, py + 14 * u, pw - 28 * u, ph - 28 * u, 14 * u)
    ctx.setLineDash([8 * u, 7 * u])
    ctx.lineWidth = 2 * u
    ctx.strokeStyle = 'rgba(255, 250, 241, 0.6)'
    ctx.stroke()
    ctx.setLineDash([])

    ctx.drawImage(plush, p.x, p.y, p.size, p.size)

    // postmark
    const r = 46 * u
    ctx.save()
    ctx.translate(px + pw - 12 * u, py + 18 * u)
    ctx.rotate(0.21)
    ctx.strokeStyle = TERRA
    ctx.lineWidth = 2.5 * u
    for (const radius of [r, r - 6 * u]) {
      ctx.beginPath()
      ctx.arc(0, 0, radius, 0, Math.PI * 2)
      ctx.stroke()
    }
    ctx.fillStyle = TERRA
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    const occasion = gift.occasion.toUpperCase()
    const occSize = fitLine(ctx, occasion, dmSans, r * 1.5, 10 * u, 0.1)
    spacedText(ctx, occasion, 0, -6 * u, occSize * 0.1)
    ctx.font = dmSans(8 * u)
    ctx.fillText(postDate(gift.createdAt), 0, 10 * u)
    ctx.restore()

    // twine from the parcel to the tag
    const t = L.text
    ctx.beginPath()
    ctx.moveTo(px + pw * 0.5, py + ph - 4 * u)
    ctx.bezierCurveTo(px + pw * 0.4, t.top - 20 * u, t.x - t.width / 2 - 30 * u, t.top, t.x - t.width / 2 + 22 * u, t.top + 40 * u)
    ctx.lineWidth = 2 * u
    ctx.strokeStyle = SAGE
    ctx.stroke()

    // hand-written gift tag
    const padL = 38 * u
    const padR = 20 * u
    const padY = 14 * u
    const toH = 24 * u
    const signH = 28 * u
    const fit = fitText(ctx, gift.message, caveat(500), {
      maxWidth: t.width - padL - padR,
      maxHeight: t.bottom - t.top - padY * 2 - toH - signH,
      max: 28 * u,
      min: 16 * u,
      lineHeight: 1.08,
    })
    const th = padY * 2 + toH + fit.lines.length * fit.lineHeight + signH
    const x0 = -t.width / 2
    const y0 = -th / 2

    ctx.save()
    ctx.translate(t.x, t.top + th / 2)
    ctx.rotate(-0.03)
    ctx.save()
    ctx.shadowColor = 'rgba(90, 59, 34, 0.18)'
    ctx.shadowBlur = 14 * u
    ctx.shadowOffsetY = 6 * u
    tagPath(ctx, x0, y0, t.width, th, 16 * u, 16 * u)
    ctx.fillStyle = CREAM
    ctx.fill()
    ctx.restore()
    tagPath(ctx, x0, y0, t.width, th, 16 * u, 16 * u)
    ctx.lineWidth = 1.5 * u
    ctx.strokeStyle = KRAFT
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(x0 + 20 * u, 0, 5 * u, 0, Math.PI * 2)
    ctx.fillStyle = PAPER
    ctx.fill()
    ctx.lineWidth = 2 * u
    ctx.stroke()

    const tx = x0 + padL
    const maxW = t.width - padL - padR
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    fitLine(ctx, `To ${gift.recipientName}`, caveat(500), maxW, 19 * u)
    ctx.fillStyle = '#8a7466'
    ctx.fillText(`To ${gift.recipientName}`, tx, y0 + padY + toH / 2)
    ctx.font = caveat(500)(fit.size)
    ctx.fillStyle = COCOA
    const end = drawLines(ctx, fit.lines, tx, y0 + padY + toH, fit.lineHeight)
    fitLine(ctx, `Love, ${gift.senderName}`, caveat(700), maxW, 22 * u)
    ctx.fillStyle = TERRA
    ctx.fillText(`Love, ${gift.senderName}`, tx, end + signH / 2)
    ctx.restore()

    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = fraunces(15 * u)
    ctx.fillStyle = 'rgba(59, 47, 42, 0.7)'
    ctx.fillText('Cuddlepost', t.x, L.brandY)
  },
}
