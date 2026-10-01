import { useRef } from 'react'
import { hexToHsl, hslToHex } from './color'

export const PLUSH_SWATCHES = [
  '#c98b5e',
  '#f3e6d4',
  '#f7b6c8',
  '#c7b3f0',
  '#a8e0c8',
  '#a9cff5',
  '#f6d77a',
  '#9a9aa6',
  '#4b3b3b',
]

interface ColorWheelProps {
  value: string
  onChange: (hex: string) => void
  size?: number
}

export function ColorWheel({ value, onChange, size = 180 }: ColorWheelProps) {
  const ref = useRef<HTMLDivElement>(null)
  const hsl = hexToHsl(value)
  const radius = size / 2

  const pick = (clientX: number, clientY: number) => {
    const rect = ref.current!.getBoundingClientRect()
    const dx = clientX - rect.left - radius
    const dy = clientY - rect.top - radius
    const h = ((Math.atan2(dx, -dy) * 180) / Math.PI + 360) % 360
    const s = Math.min(1, Math.hypot(dx, dy) / radius) * 100
    onChange(hslToHex({ h, s, l: hsl.l }))
  }

  const stops = Array.from({ length: 7 }, (_, i) => `hsl(${i * 60} 100% ${hsl.l}%)`).join(', ')
  const knobR = (hsl.s / 100) * radius
  const knobX = radius + Math.sin((hsl.h * Math.PI) / 180) * knobR
  const knobY = radius - Math.cos((hsl.h * Math.PI) / 180) * knobR

  return (
    <div className="pg-colorwheel">
      <div
        ref={ref}
        className="pg-colorwheel-disc"
        style={{
          width: size,
          height: size,
          background: `radial-gradient(closest-side, hsl(0 0% ${hsl.l}%), transparent), conic-gradient(${stops})`,
        }}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId)
          pick(e.clientX, e.clientY)
        }}
        onPointerMove={(e) => {
          if (e.buttons) pick(e.clientX, e.clientY)
        }}
      >
        <span className="pg-colorwheel-knob" style={{ left: knobX, top: knobY, background: value }} />
      </div>
      <label className="pg-colorwheel-light">
        <span>Shade</span>
        <input
          type="range"
          min={20}
          max={90}
          value={Math.round(hsl.l)}
          style={{
            background: `linear-gradient(90deg, hsl(${hsl.h} ${hsl.s}% 20%), hsl(${hsl.h} ${hsl.s}% 55%), hsl(${hsl.h} ${hsl.s}% 90%))`,
          }}
          onChange={(e) => onChange(hslToHex({ ...hsl, l: Number(e.target.value) }))}
        />
      </label>
      <div className="pg-swatches">
        {PLUSH_SWATCHES.map((c) => (
          <button
            key={c}
            type="button"
            className={`pg-swatch ${c === value ? 'is-active' : ''}`}
            style={{ background: c }}
            onClick={() => onChange(c)}
            aria-label={`Color ${c}`}
          />
        ))}
      </div>
    </div>
  )
}

