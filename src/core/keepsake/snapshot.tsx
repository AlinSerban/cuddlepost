import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { ContactShadows } from '@react-three/drei'
import { useRef } from 'react'
import { createRoot } from 'react-dom/client'
import type { Gift, PlushType } from '../gift'
import { Plushie } from '../plushie/Plushie'

type PlushLook = Pick<Gift, 'plush' | 'color' | 'patchColor' | 'patches'>

const SIZE = 1280
const FOV = 30
const cache = new Map<string, Promise<HTMLImageElement>>()

/** Renders the plushie once, offscreen, into a square transparent image (cached per look). */
export function snapshotPlush(look: PlushLook, shadowColor: string): Promise<HTMLImageElement> {
  const key = JSON.stringify([look.plush, look.color, look.patchColor, look.patches, shadowColor])
  let shot = cache.get(key)
  if (!shot) {
    shot = renderSnapshot(look, shadowColor)
    shot.catch(() => cache.delete(key))
    cache.set(key, shot)
  }
  return shot
}

function framing(plush: PlushType) {
  const top = plush === 'bunny' ? 2.2 : 1.68
  const bottom = -0.95
  const center = (top + bottom) / 2
  const half = ((top - bottom) / 2) * 1.08
  const distance = half / Math.tan(((FOV / 2) * Math.PI) / 180)
  return { center, position: [0, center + distance * 0.12, distance] as [number, number, number] }
}

function renderSnapshot(look: PlushLook, shadowColor: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const host = document.createElement('div')
    host.setAttribute('aria-hidden', 'true')
    host.style.cssText = `position:fixed;left:${-SIZE * 2}px;top:0;width:${SIZE}px;height:${SIZE}px;pointer-events:none;`
    document.body.appendChild(host)
    const root = createRoot(host)
    let settled = false

    const finish = (dataUrl: string | null) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      setTimeout(() => {
        root.unmount()
        host.remove()
      })
      if (!dataUrl) return reject(new Error('Could not render the plushie'))
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error('Could not load the plushie snapshot'))
      img.src = dataUrl
    }
    const timer = setTimeout(() => finish(null), 15000)

    const { center, position } = framing(look.plush)
    root.render(
      <Canvas
        shadows
        dpr={1}
        gl={{ preserveDrawingBuffer: true, antialias: true, alpha: true }}
        camera={{ position, fov: FOV }}
        onCreated={({ camera }) => camera.lookAt(0, center, 0)}
      >
        <ambientLight intensity={0.55} />
        <hemisphereLight args={['#fff6ee', '#b9a4c9', 0.7]} />
        <directionalLight position={[3, 5, 4]} intensity={1.6} castShadow shadow-mapSize={[1024, 1024]} />
        <directionalLight position={[-4, 2, -3]} intensity={0.5} color="#ffd9e4" />
        <group rotation={[0, -0.28, 0]}>
          <Plushie plush={look.plush} color={look.color} patchColor={look.patchColor} patches={look.patches} />
        </group>
        <ContactShadows position={[0, -0.88, 0]} opacity={0.35} scale={4} blur={2.6} far={1.5} color={shadowColor} />
        <Capture onCapture={finish} />
      </Canvas>,
    )
  })
}

function Capture({ onCapture }: { onCapture: (dataUrl: string) => void }) {
  const gl = useThree((s) => s.gl)
  const frames = useRef(0)
  useFrame(() => {
    frames.current += 1
    if (frames.current === 4) onCapture(gl.domElement.toDataURL('image/png'))
  })
  return null
}
