type Ctx = CanvasRenderingContext2D

export function seeded(seed: string): () => number {
  let h = 1779033703 ^ seed.length
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  let a = h >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export async function loadFonts(fonts: string[]) {
  if (!document.fonts) return
  await Promise.all(fonts.map((f) => document.fonts.load(f).catch(() => [])))
}

export const EMOJI_FONT = '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif'

export function radialGlow(ctx: Ctx, x: number, y: number, r: number, stops: [number, string][]) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r)
  stops.forEach(([o, c]) => g.addColorStop(o, c))
  ctx.fillStyle = g
  ctx.fillRect(x - r, y - r, r * 2, r * 2)
}

export function roundRectPath(ctx: Ctx, x: number, y: number, w: number, h: number, r: number | number[]) {
  ctx.beginPath()
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, r)
  else ctx.rect(x, y, w, h)
}

/** Smooth closed blob through points around an ellipse, each pushed out/in by `factors`. */
export function blobPath(ctx: Ctx, cx: number, cy: number, rx: number, ry: number, factors: number[]) {
  const n = factors.length
  const pts = factors.map((f, i) => {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2
    return [cx + Math.cos(a) * rx * f, cy + Math.sin(a) * ry * f]
  })
  const mid = (p: number[], q: number[]) => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2]
  const start = mid(pts[n - 1], pts[0])
  ctx.beginPath()
  ctx.moveTo(start[0], start[1])
  for (let i = 0; i < n; i++) {
    const m = mid(pts[i], pts[(i + 1) % n])
    ctx.quadraticCurveTo(pts[i][0], pts[i][1], m[0], m[1])
  }
  ctx.closePath()
}

/** Draws text with manual letter spacing (canvas `letterSpacing` isn't everywhere yet). Returns its width. */
export function spacedText(ctx: Ctx, text: string, x: number, y: number, spacing: number) {
  const chars = Array.from(text)
  const widths = chars.map((c) => ctx.measureText(c).width)
  const total = widths.reduce((a, b) => a + b, 0) + spacing * (chars.length - 1)
  const align = ctx.textAlign
  let cx = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x
  ctx.textAlign = 'left'
  chars.forEach((c, i) => {
    ctx.fillText(c, cx, y)
    cx += widths[i] + spacing
  })
  ctx.textAlign = align
  return total
}

/** Shrinks a single line until it fits. Leaves `ctx.font` set to the result. */
export function fitLine(
  ctx: Ctx,
  text: string,
  font: (px: number) => string,
  maxWidth: number,
  size: number,
  spacingRatio = 0,
) {
  const count = Array.from(text).length
  for (let s = size; s > size * 0.5; s *= 0.94) {
    ctx.font = font(s)
    if (ctx.measureText(text).width + s * spacingRatio * (count - 1) <= maxWidth) return s
  }
  const min = size * 0.5
  ctx.font = font(min)
  return min
}

export interface FittedText {
  size: number
  lineHeight: number
  lines: string[]
}

/** Picks the largest size where wrapped text fits the box, clamping with an ellipsis at `min`. */
export function fitText(
  ctx: Ctx,
  text: string,
  font: (px: number) => string,
  o: { maxWidth: number; maxHeight: number; max: number; min: number; lineHeight: number },
): FittedText {
  let size = o.max
  for (;;) {
    ctx.font = font(size)
    const lines = wrapText(ctx, text, o.maxWidth)
    const lineHeight = size * o.lineHeight
    if (lines.length * lineHeight <= o.maxHeight || size <= o.min) {
      const max = Math.max(1, Math.floor(o.maxHeight / lineHeight))
      return { size, lineHeight, lines: lines.length > max ? clampLines(ctx, lines, max, o.maxWidth) : lines }
    }
    size = Math.max(o.min, size * 0.93)
  }
}

export function wrapText(ctx: Ctx, text: string, maxWidth: number): string[] {
  const lines: string[] = []
  for (const paragraph of text.split('\n')) {
    let line = ''
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      for (const piece of splitLongWord(ctx, word, maxWidth)) {
        const next = line ? `${line} ${piece}` : piece
        if (line && ctx.measureText(next).width > maxWidth) {
          lines.push(line)
          line = piece
        } else line = next
      }
    }
    if (line) lines.push(line)
  }
  return lines
}

function splitLongWord(ctx: Ctx, word: string, maxWidth: number): string[] {
  if (ctx.measureText(word).width <= maxWidth) return [word]
  const parts: string[] = []
  let part = ''
  for (const ch of Array.from(word)) {
    if (part && ctx.measureText(part + ch).width > maxWidth) {
      parts.push(part)
      part = ch
    } else part += ch
  }
  if (part) parts.push(part)
  return parts
}

function clampLines(ctx: Ctx, lines: string[], max: number, maxWidth: number) {
  const out = lines.slice(0, max)
  let last = Array.from(out[max - 1])
  while (last.length && ctx.measureText(last.join('') + '…').width > maxWidth) last = last.slice(0, -1)
  out[max - 1] = last.join('').trimEnd() + '…'
  return out
}

/** Draws lines with `textBaseline = 'middle'`, starting at `top`. */
export function drawLines(ctx: Ctx, lines: string[], x: number, top: number, lineHeight: number) {
  ctx.textBaseline = 'middle'
  lines.forEach((line, i) => ctx.fillText(line, x, top + lineHeight * (i + 0.5)))
  return top + lines.length * lineHeight
}
