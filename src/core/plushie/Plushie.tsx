import { useMemo, useRef, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { PatchSlot, PatchType, PlushType } from '../gift'

export interface PlushieProps {
  plush: PlushType
  color: string
  patchColor: string
  patches: Partial<Record<PatchSlot, PatchType>>
  squishKey?: number
}

type Vec3 = [number, number, number]

const ANCHORS: Record<PatchSlot, { position: Vec3; rotation: Vec3; scale: number }> = {
  chest: { position: [0, 0.26, 0.6], rotation: [-0.25, 0, 0], scale: 1 },
  head: { position: [0, 1.33, 0.43], rotation: [-0.62, 0, 0], scale: 0.7 },
  leftFoot: { position: [-0.33, -0.62, 0.665], rotation: [0, 0, 0], scale: 0.75 },
  rightFoot: { position: [0.33, -0.62, 0.665], rotation: [0, 0, 0], scale: 0.75 },
}

const CREAM = new THREE.Color('#fff4ea')

function Fabric({ color }: { color: string | THREE.Color }) {
  return (
    <meshPhysicalMaterial
      color={color}
      roughness={0.95}
      sheen={1}
      sheenRoughness={0.45}
      sheenColor="#fff6f0"
    />
  )
}

function Blob({
  position,
  scale,
  rotation = [0, 0, 0],
  children,
}: {
  position: Vec3
  scale: Vec3 | number
  rotation?: Vec3
  children: ReactNode
}) {
  return (
    <mesh position={position} scale={scale} rotation={rotation} castShadow>
      <sphereGeometry args={[1, 40, 32]} />
      {children}
    </mesh>
  )
}

export function Plushie({ plush, color, patchColor, patches, squishKey = 0 }: PlushieProps) {
  const group = useRef<THREE.Group>(null)
  const squish = useRef({ key: squishKey, t: 1 })

  const { base, accent, dark } = useMemo(() => {
    const base = new THREE.Color(color)
    return {
      base,
      accent: base.clone().lerp(CREAM, 0.6),
      dark: base.clone().multiplyScalar(0.72),
    }
  }, [color])

  useFrame((_, delta) => {
    const s = squish.current
    if (s.key !== squishKey) {
      s.key = squishKey
      s.t = 0
    }
    s.t = Math.min(1, s.t + delta * 1.8)
    const wobble = Math.sin(s.t * Math.PI * 3) * (1 - s.t) * 0.14
    group.current?.scale.set(1 + wobble, 1 - wobble, 1 + wobble)
  })

  return (
    <group ref={group}>
      {/* body + belly */}
      <Blob position={[0, 0, 0]} scale={[0.72, 0.8, 0.62]}>
        <Fabric color={base} />
      </Blob>
      <Blob position={[0, -0.05, 0.3]} scale={[0.48, 0.55, 0.35]}>
        <Fabric color={accent} />
      </Blob>

      {/* head */}
      <Blob position={[0, 1.02, 0]} scale={[0.588, 0.532, 0.532]}>
        <Fabric color={base} />
      </Blob>
      <Blob position={[0, 0.9, 0.46]} scale={plush === 'bunny' ? [0.18, 0.13, 0.12] : [0.24, 0.17, 0.14]}>
        <Fabric color={accent} />
      </Blob>
      <Blob position={[0, 0.95, 0.6]} scale={[0.07, 0.05, 0.04]}>
        <meshStandardMaterial color={plush === 'cat' || plush === 'bunny' ? '#e06b86' : '#3a2626'} roughness={0.35} />
      </Blob>
      <Eyes />
      {[-1, 1].map((side) => (
        <Blob key={side} position={[0.3 * side, 0.95, 0.44]} scale={[0.08, 0.05, 0.03]}>
          <meshStandardMaterial color="#ff8fa8" roughness={1} transparent opacity={0.75} />
        </Blob>
      ))}
      {plush === 'cat' && <Whiskers />}
      <Ears plush={plush} base={base} accent={accent} dark={dark} />

      {/* arms + legs */}
      {[-1, 1].map((side) => (
        <group key={side}>
          <Blob position={[0.62 * side, 0.15, 0.15]} scale={[0.17, 0.33, 0.17]} rotation={[0.3, 0, 0.5 * side]}>
            <Fabric color={base} />
          </Blob>
          <Blob position={[0.33 * side, -0.62, 0.32]} scale={[0.24, 0.22, 0.32]}>
            <Fabric color={base} />
          </Blob>
          <Blob position={[0.33 * side, -0.62, 0.63]} scale={[0.15, 0.14, 0.03]}>
            <Fabric color={accent} />
          </Blob>
        </group>
      ))}

      <Tail plush={plush} base={base} dark={dark} />

      {(Object.keys(ANCHORS) as PatchSlot[]).map((slot) => {
        const type = patches[slot]
        if (!type) return null
        const a = ANCHORS[slot]
        return (
          <group key={slot} position={a.position} rotation={a.rotation} scale={a.scale}>
            <Patch type={type} color={patchColor} />
          </group>
        )
      })}
    </group>
  )
}

function Eyes() {
  return (
    <>
      {[-1, 1].map((side) => (
        <group key={side} position={[0.19 * side, 1.1, 0.48]}>
          <mesh>
            <sphereGeometry args={[0.055, 24, 24]} />
            <meshStandardMaterial color="#1c1414" roughness={0.15} metalness={0.1} />
          </mesh>
          <mesh position={[0.018, 0.02, 0.045]}>
            <sphereGeometry args={[0.014, 12, 12]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
        </group>
      ))}
    </>
  )
}

function Whiskers() {
  return (
    <>
      {[-1, 1].map((side) =>
        [-0.12, 0, 0.12].map((tilt) => (
          <mesh
            key={`${side}${tilt}`}
            position={[0.3 * side, 0.9 + tilt * 0.25, 0.52]}
            rotation={[0, 0, Math.PI / 2 + tilt * side]}
          >
            <cylinderGeometry args={[0.005, 0.005, 0.28, 6]} />
            <meshBasicMaterial color="#3a2626" />
          </mesh>
        )),
      )}
    </>
  )
}

function Ears({
  plush,
  base,
  accent,
  dark,
}: {
  plush: PlushType
  base: THREE.Color
  accent: THREE.Color
  dark: THREE.Color
}) {
  return (
    <>
      {[-1, 1].map((side) => {
        switch (plush) {
          case 'bear':
            return (
              <group key={side} position={[0.38 * side, 1.45, 0]}>
                <Blob position={[0, 0, 0]} scale={[0.17, 0.17, 0.1]}>
                  <Fabric color={base} />
                </Blob>
                <Blob position={[0, 0, 0.06]} scale={[0.1, 0.1, 0.05]}>
                  <Fabric color={accent} />
                </Blob>
              </group>
            )
          case 'bunny':
            return (
              <group key={side} position={[0.2 * side, 1.75, -0.05]} rotation={[0, 0, -0.15 * side]}>
                <Blob position={[0, 0, 0]} scale={[0.13, 0.42, 0.09]}>
                  <Fabric color={base} />
                </Blob>
                <Blob position={[0, -0.02, 0.05]} scale={[0.07, 0.32, 0.05]}>
                  <Fabric color={accent} />
                </Blob>
              </group>
            )
          case 'cat':
            return (
              <group key={side} position={[0.32 * side, 1.48, 0]} rotation={[0, 0, -0.35 * side]}>
                <mesh castShadow>
                  <coneGeometry args={[0.18, 0.34, 32]} />
                  <Fabric color={base} />
                </mesh>
                <mesh position={[0, -0.03, 0.06]} scale={[1, 1, 0.5]}>
                  <coneGeometry args={[0.1, 0.22, 32]} />
                  <Fabric color={accent} />
                </mesh>
              </group>
            )
          case 'puppy':
            return (
              <Blob key={side} position={[0.54 * side, 1.0, 0]} scale={[0.14, 0.3, 0.1]} rotation={[0, 0, 0.25 * side]}>
                <Fabric color={dark} />
              </Blob>
            )
        }
      })}
    </>
  )
}

function Tail({ plush, base, dark }: { plush: PlushType; base: THREE.Color; dark: THREE.Color }) {
  const catTail = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, -0.5, -0.5),
      new THREE.Vector3(0.35, -0.4, -0.7),
      new THREE.Vector3(0.55, -0.05, -0.62),
      new THREE.Vector3(0.48, 0.3, -0.5),
    ])
    return new THREE.TubeGeometry(curve, 40, 0.065, 12, false)
  }, [])

  switch (plush) {
    case 'bear':
      return (
        <Blob position={[0, -0.4, -0.58]} scale={0.12}>
          <Fabric color={base} />
        </Blob>
      )
    case 'bunny':
      return (
        <Blob position={[0, -0.35, -0.6]} scale={0.18}>
          <Fabric color="#fffaf5" />
        </Blob>
      )
    case 'cat':
      return (
        <mesh geometry={catTail} castShadow>
          <Fabric color={base} />
        </mesh>
      )
    case 'puppy':
      return (
        <Blob position={[0, -0.25, -0.62]} scale={[0.08, 0.2, 0.08]} rotation={[-0.6, 0, 0]}>
          <Fabric color={dark} />
        </Blob>
      )
  }
}

const heartGeometry = (() => {
  const s = new THREE.Shape()
  s.moveTo(5, 5)
  s.bezierCurveTo(5, 5, 4, 0, 0, 0)
  s.bezierCurveTo(-6, 0, -6, 7, -6, 7)
  s.bezierCurveTo(-6, 11, -3, 15.4, 5, 19)
  s.bezierCurveTo(12, 15.4, 16, 11, 16, 7)
  s.bezierCurveTo(16, 7, 16, 0, 10, 0)
  s.bezierCurveTo(7, 0, 5, 5, 5, 5)
  const g = new THREE.ExtrudeGeometry(s, { depth: 2, bevelEnabled: true, bevelSize: 1.2, bevelThickness: 1.2, bevelSegments: 4 })
  g.center()
  g.scale(0.011, 0.011, 0.011)
  g.rotateZ(Math.PI)
  return g
})()

const starGeometry = (() => {
  const s = new THREE.Shape()
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? 1 : 0.48
    const a = (i / 10) * Math.PI * 2 + Math.PI / 2
    const x = Math.cos(a) * r
    const y = Math.sin(a) * r
    if (i === 0) s.moveTo(x, y)
    else s.lineTo(x, y)
  }
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.12, bevelEnabled: true, bevelSize: 0.08, bevelThickness: 0.08, bevelSegments: 3 })
  g.center()
  g.scale(0.14, 0.14, 0.14)
  return g
})()

function Disc({ position, radius, color, scaleX = 1 }: { position: [number, number]; radius: number; color: string; scaleX?: number }) {
  return (
    <mesh position={[position[0], position[1], 0]} rotation={[Math.PI / 2, 0, 0]} scale={[scaleX, 1, 1]}>
      <cylinderGeometry args={[radius, radius, 0.035, 28]} />
      <meshStandardMaterial color={color} roughness={0.6} />
    </mesh>
  )
}

function Patch({ type, color }: { type: PatchType; color: string }) {
  switch (type) {
    case 'heart':
      return (
        <mesh geometry={heartGeometry}>
          <meshStandardMaterial color={color} roughness={0.55} />
        </mesh>
      )
    case 'star':
      return (
        <mesh geometry={starGeometry}>
          <meshStandardMaterial color={color} roughness={0.55} />
        </mesh>
      )
    case 'flower':
      return (
        <group>
          {Array.from({ length: 5 }, (_, i) => {
            const a = (i / 5) * Math.PI * 2 + Math.PI / 2
            return <Disc key={i} position={[Math.cos(a) * 0.075, Math.sin(a) * 0.075]} radius={0.058} color={color} />
          })}
          <group position={[0, 0, 0.012]}>
            <Disc position={[0, 0]} radius={0.045} color="#fff3c4" />
          </group>
        </group>
      )
    case 'paw':
      return (
        <group>
          <Disc position={[0, -0.035]} radius={0.075} scaleX={1.15} color={color} />
          {[
            [-0.095, 0.055],
            [-0.035, 0.1],
            [0.035, 0.1],
            [0.095, 0.055],
          ].map(([x, y], i) => (
            <Disc key={i} position={[x, y]} radius={0.034} color={color} />
          ))}
        </group>
      )
  }
}

