import { Canvas } from '@react-three/fiber'
import { ContactShadows, Float, OrbitControls } from '@react-three/drei'
import { useEffect, useState } from 'react'
import { PLUSH_TYPES } from '../gift'
import { Plushie, type PlushieProps } from './Plushie'

interface PlushViewerProps extends Omit<PlushieProps, 'squishKey'> {
  className?: string
  autoRotate?: boolean
  shadowColor?: string
  /** Changes to this value trigger a squish animation (e.g. on customization). */
  bounceOn?: unknown
}

function webglOk() {
  try {
    const canvas = document.createElement('canvas')
    return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'))
  } catch {
    return false
  }
}

function StaticFallback({
  className,
  plush,
  color,
}: {
  className?: string
  plush: PlushieProps['plush']
  color: string
}) {
  const meta = PLUSH_TYPES.find((p) => p.id === plush)!
  return (
    <div className={className} style={{ display: 'grid', placeItems: 'center', background: 'transparent' }}>
      <div
        style={{
          width: '70%',
          aspectRatio: '1',
          borderRadius: '50%',
          background: `radial-gradient(circle at 35% 30%, #fff8, transparent 45%), ${color}`,
          display: 'grid',
          placeItems: 'center',
          fontSize: 'clamp(3rem, 12vw, 5.5rem)',
          boxShadow: '0 18px 40px #0004',
        }}
        aria-label={`${meta.label} plushie`}
      >
        {meta.emoji}
      </div>
    </div>
  )
}

export function PlushViewer({
  className,
  autoRotate = false,
  shadowColor = '#000000',
  bounceOn,
  ...plush
}: PlushViewerProps) {
  const [taps, setTaps] = useState(0)
  const [prevBounce, setPrevBounce] = useState(bounceOn)
  const [bounces, setBounces] = useState(0)
  const [ok, setOk] = useState(true)

  if (prevBounce !== bounceOn) {
    setPrevBounce(bounceOn)
    setBounces((b) => b + 1)
  }

  useEffect(() => {
    setOk(webglOk())
  }, [])

  if (!ok) {
    return <StaticFallback className={className} plush={plush.plush} color={plush.color} />
  }

  return (
    <div className={className} style={{ touchAction: 'none' }}>
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [0, 0.95, 5.5], fov: 34 }}
        onCreated={({ gl }) => {
          gl.domElement.addEventListener('webglcontextlost', (e) => {
            e.preventDefault()
            setOk(false)
          })
        }}
        fallback={<StaticFallback className={className} plush={plush.plush} color={plush.color} />}
      >
        <ambientLight intensity={0.55} />
        <hemisphereLight args={['#fff6ee', '#b9a4c9', 0.7]} />
        <directionalLight position={[3, 5, 4]} intensity={1.6} castShadow shadow-mapSize={[1024, 1024]} />
        <directionalLight position={[-4, 2, -3]} intensity={0.5} color="#ffd9e4" />
        <Float speed={2} rotationIntensity={0.15} floatIntensity={0.35} floatingRange={[-0.03, 0.05]}>
          <group onPointerDown={() => setTaps((t) => t + 1)}>
            <Plushie {...plush} squishKey={taps + bounces} />
          </group>
        </Float>
        <ContactShadows
          position={[0, -0.88, 0]}
          opacity={0.35}
          scale={4}
          blur={2.6}
          far={1.5}
          color={shadowColor}
        />
        <OrbitControls
          enablePan={false}
          enableZoom={false}
          autoRotate={autoRotate}
          autoRotateSpeed={1.2}
          target={[0, 0.62, 0]}
          minPolarAngle={Math.PI * 0.25}
          maxPolarAngle={Math.PI * 0.6}
        />
      </Canvas>
    </div>
  )
}
