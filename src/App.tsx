import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Cloud, Environment, PerspectiveCamera } from '@react-three/drei'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { RefObject } from 'react'
import * as THREE from 'three'
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, CarFront, CircleHelp, Gamepad2, Settings, Volume2, VolumeX, X } from 'lucide-react'
import Undercity from './game/Undercity'

type Screen = 'menu' | 'game'

function Building({ position, size, accent = false }: { position: [number, number, number]; size: [number, number, number]; accent?: boolean }) {
  return (
    <group position={position}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={size} />
        <meshStandardMaterial color={accent ? '#29343a' : '#171c20'} roughness={0.72} />
      </mesh>
      {Array.from({ length: Math.max(2, Math.floor(size[1] / 2.4)) }).map((_, floor) => (
        <group key={floor} position={[0, -size[1] / 2 + 1.8 + floor * 2.4, size[2] / 2 + 0.012]}>
          <mesh position={[-size[0] * 0.24, 0, 0]}>
            <planeGeometry args={[0.55, 0.38]} />
            <meshBasicMaterial color={floor % 3 === 0 ? '#a8d6cf' : '#d5a64a'} toneMapped={false} />
          </mesh>
          <mesh position={[size[0] * 0.24, 0, 0]}>
            <planeGeometry args={[0.55, 0.38]} />
            <meshBasicMaterial color={floor % 4 === 0 ? '#e58a62' : '#74a5a0'} toneMapped={false} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

function StreetLamp({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 1.55, 0]} castShadow>
        <cylinderGeometry args={[0.035, 0.055, 3.1, 8]} />
        <meshStandardMaterial color="#22282b" metalness={0.8} roughness={0.3} />
      </mesh>
      <mesh position={[0, 3.12, 0]} castShadow>
        <boxGeometry args={[0.55, 0.12, 0.28]} />
        <meshStandardMaterial color="#b7c2b9" emissive="#dce7a6" emissiveIntensity={1.8} />
      </mesh>
    </group>
  )
}

function City() {
  const buildings = useMemo(() => {
    const items: { position: [number, number, number]; size: [number, number, number]; accent: boolean }[] = []
    for (let x = -38; x <= 38; x += 8) {
      for (let z = -38; z <= 38; z += 8) {
        if (Math.abs(x) < 5 || Math.abs(z) < 5) continue
        const seed = Math.abs(x * 17 + z * 31)
        const height = 5 + (seed % 10)
        items.push({
          position: [x + (seed % 3), height / 2, z + ((seed * 2) % 3)],
          size: [5.2 + (seed % 2), height, 5.2],
          accent: seed % 4 === 0,
        })
      }
    }
    return items
  }, [])

  return (
    <>
      <color attach="background" args={["#96a2a1"]} />
      <fog attach="fog" args={["#96a2a1", 34, 78]} />
      <hemisphereLight args={["#dce8dd", "#26302c", 1.4]} />
      <directionalLight position={[18, 30, 12]} intensity={2.2} castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-45} shadow-camera-right={45} shadow-camera-top={45} shadow-camera-bottom={-45} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="#343a38" roughness={0.92} />
      </mesh>
      <mesh position={[0, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[7, 100]} />
        <meshStandardMaterial color="#222725" roughness={0.95} />
      </mesh>
      <mesh position={[0, 0.014, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 2]} receiveShadow>
        <planeGeometry args={[7, 100]} />
        <meshStandardMaterial color="#222725" roughness={0.95} />
      </mesh>

      {[-15, -7.5, 7.5, 15].map((offset) => (
        <group key={offset}>
          {Array.from({ length: 9 }).map((_, i) => (
            <mesh key={i} position={[offset, 0.025, -36 + i * 9]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[0.12, 3]} />
              <meshBasicMaterial color="#c9bd78" />
            </mesh>
          ))}
        </group>
      ))}

      {buildings.map((building, index) => (
        <Building key={index} {...building} />
      ))}
      {[-18, -10, 10, 18].flatMap((x) => [-18, -10, 10, 18].map((z) => (
        <StreetLamp key={`${x}-${z}`} position={[x, 0, z]} />
      )))}
      <Cloud position={[0, 22, -28]} scale={8} speed={0.08} opacity={0.38} />
      <Cloud position={[24, 18, 18]} scale={6} speed={0.06} opacity={0.28} />
    </>
  )
}

function Player({ group, visible }: { group: RefObject<THREE.Group | null>; visible: boolean }) {
  return (
    <group ref={group} visible={visible}>
      <mesh position={[0, 1.45, 0]} castShadow>
        <capsuleGeometry args={[0.34, 1.15, 6, 10]} />
        <meshStandardMaterial color="#d6c6a6" roughness={0.7} />
      </mesh>
      <mesh position={[0, 2.18, 0]} castShadow>
        <sphereGeometry args={[0.32, 16, 12]} />
        <meshStandardMaterial color="#b98d70" roughness={0.8} />
      </mesh>
      <mesh position={[0, 1.72, -0.34]} castShadow>
        <boxGeometry args={[0.72, 0.75, 0.22]} />
        <meshStandardMaterial color="#3d5655" roughness={0.75} />
      </mesh>
    </group>
  )
}

function Vehicle({ group }: { group: RefObject<THREE.Group | null> }) {
  return (
    <group ref={group} position={[6, 0, 0]}>
      <mesh position={[0, 0.72, 0]} castShadow>
        <boxGeometry args={[1.9, 0.72, 3.6]} />
        <meshStandardMaterial color="#9f382f" metalness={0.45} roughness={0.38} />
      </mesh>
      <mesh position={[0, 1.38, -0.25]} castShadow>
        <boxGeometry args={[1.65, 0.7, 1.75]} />
        <meshStandardMaterial color="#5f7779" metalness={0.2} roughness={0.28} />
      </mesh>
      {[-0.95, 0.95].flatMap((x) => [-1.15, 1.15].map((z) => (
        <mesh key={`${x}-${z}`} position={[x, 0.48, z]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.42, 0.42, 0.28, 16]} />
          <meshStandardMaterial color="#111313" roughness={0.82} />
        </mesh>
      )))}
      <mesh position={[0, 0.65, 1.83]}>
        <boxGeometry args={[1.2, 0.28, 0.08]} />
        <meshBasicMaterial color="#e9c97c" toneMapped={false} />
      </mesh>
    </group>
  )
}

function GameWorld({ onModeChange, onDistanceChange }: { onModeChange: (mode: 'foot' | 'vehicle') => void; onDistanceChange: (distance: number) => void }) {
  const player = useRef<THREE.Group>(null)
  const vehicle = useRef<THREE.Group>(null)
  const keys = useRef<Record<string, boolean>>({})
  const inVehicle = useRef(false)
  const [visiblePlayer, setVisiblePlayer] = useState(true)
  const { camera } = useThree()

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      keys.current[event.code] = true
      if (event.code === 'KeyE' && !inVehicle.current && player.current && vehicle.current) {
        if (player.current.position.distanceTo(vehicle.current.position) < 4.5) {
          inVehicle.current = true
          setVisiblePlayer(false)
          onModeChange('vehicle')
        }
      }
      if (event.code === 'KeyQ' && inVehicle.current) {
        inVehicle.current = false
        setVisiblePlayer(true)
        if (player.current && vehicle.current) {
          player.current.position.set(vehicle.current.position.x - 2.2, 0, vehicle.current.position.z)
          onModeChange('foot')
        }
      }
    }
    const up = (event: KeyboardEvent) => { keys.current[event.code] = false }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [onModeChange])

  useFrame((_, delta) => {
    const current = inVehicle.current ? vehicle.current : player.current
    if (!current) return

    const forward = keys.current.KeyW || keys.current.ArrowUp
    const backward = keys.current.KeyS || keys.current.ArrowDown
    const left = keys.current.KeyA || keys.current.ArrowLeft
    const right = keys.current.KeyD || keys.current.ArrowRight

    if (inVehicle.current) {
      const speed = (forward ? 10 : 0) - (backward ? 6 : 0)
      if (left) current.rotation.y += delta * 1.7
      if (right) current.rotation.y -= delta * 1.7
      current.position.x += Math.sin(current.rotation.y) * speed * delta
      current.position.z += Math.cos(current.rotation.y) * speed * delta
    } else {
      const speed = 5.5 * delta
      if (forward) current.position.z -= speed
      if (backward) current.position.z += speed
      if (left) current.position.x -= speed
      if (right) current.position.x += speed
      if (left) current.rotation.y = Math.PI / 2
      if (right) current.rotation.y = -Math.PI / 2
      if (forward) current.rotation.y = Math.PI
      if (backward) current.rotation.y = 0
    }

    current.position.x = THREE.MathUtils.clamp(current.position.x, -46, 46)
    current.position.z = THREE.MathUtils.clamp(current.position.z, -46, 46)

    if (player.current && vehicle.current && !inVehicle.current) {
      onDistanceChange(player.current.position.distanceTo(vehicle.current.position))
    }

    const target = current.position.clone().add(new THREE.Vector3(0, 8, 13))
    camera.position.lerp(target, 1 - Math.pow(0.001, delta))
    camera.lookAt(current.position.x, current.position.y + 1, current.position.z)
  })

  return (
    <>
      <City />
      <Player group={player} visible={visiblePlayer} />
      <Vehicle group={vehicle} />
      <PerspectiveCamera makeDefault position={[6, 8, 14]} fov={55} />
      <Environment preset="city" />
    </>
  )
}

function Menu({ onStart }: { onStart: () => void }) {
  const [showHelp, setShowHelp] = useState(false)
  const [muted, setMuted] = useState(false)

  return (
    <main className="menu-shell">
      <header className="topbar">
        <button className="icon-button" aria-label={muted ? 'Activar sonido' : 'Silenciar'} onClick={() => setMuted((value) => !value)}>
          {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>
        <button className="icon-button" aria-label="Ayuda" onClick={() => setShowHelp(true)}><CircleHelp size={18} /></button>
        <button className="icon-button" aria-label="Configuración"><Settings size={18} /></button>
      </header>

      <section className="brand-block">
        <p className="kicker"><span /> NIGHT DISTRICT 04</p>
        <h1>PROJECT:<br /><strong>UNDERCITY</strong></h1>
        <p className="tagline">Las calles tienen memoria. Conduce, explora y hazte tu lugar.</p>
      </section>

      <nav className="menu-actions" aria-label="Menu principal">
        <button className="primary-action" onClick={onStart}><span>INICIAR JUEGO</span><b>→</b></button>
        <button onClick={() => setShowHelp(true)}>CONTROLES</button>
      </nav>

      <div className="district-sign"><span>04</span><small>INDUSTRIAL<br />DISTRICT</small></div>

      {showHelp && (
        <div className="modal-backdrop" onClick={() => setShowHelp(false)}>
          <section className="modal" onClick={(event) => event.stopPropagation()}>
            <button className="modal-close" aria-label="Cerrar" onClick={() => setShowHelp(false)}><X size={19} /></button>
            <Gamepad2 size={28} />
            <h2>Controles</h2>
            <dl>
              <div><dt>WASD / Flechas</dt><dd>Mover</dd></div>
              <div><dt>E</dt><dd>Entrar al vehículo</dd></div>
              <div><dt>Q</dt><dd>Salir del vehículo</dd></div>
              <div><dt>Ratón</dt><dd>Mirar alrededor</dd></div>
            </dl>
          </section>
        </div>
      )}
    </main>
  )
}

function TouchControls({ mode }: { mode: 'foot' | 'vehicle' }) {
  const pressKey = (code: string, pressed: boolean) => {
    window.dispatchEvent(new KeyboardEvent(pressed ? 'keydown' : 'keyup', { code, bubbles: true }))
  }

  const holdProps = (code: string) => ({
    onPointerDown: (event: React.PointerEvent<HTMLButtonElement>) => {
      event.preventDefault()
      event.currentTarget.setPointerCapture(event.pointerId)
      pressKey(code, true)
    },
    onPointerUp: (event: React.PointerEvent<HTMLButtonElement>) => {
      event.preventDefault()
      pressKey(code, false)
    },
    onPointerCancel: () => pressKey(code, false),
    onLostPointerCapture: () => pressKey(code, false),
  })

  const tapAction = (code: string) => {
    pressKey(code, true)
    window.setTimeout(() => pressKey(code, false), 80)
  }

  return (
    <div className="touch-controls" onContextMenu={(event) => event.preventDefault()}>
      <div className="touch-dpad" aria-label="Controles de movimiento">
        <button className="touch-up" aria-label="Mover adelante" {...holdProps('KeyW')}><ArrowUp /></button>
        <button className="touch-left" aria-label="Mover izquierda" {...holdProps('KeyA')}><ArrowLeft /></button>
        <button className="touch-down" aria-label="Mover atras" {...holdProps('KeyS')}><ArrowDown /></button>
        <button className="touch-right" aria-label="Mover derecha" {...holdProps('KeyD')}><ArrowRight /></button>
      </div>
      <div className="touch-actions">
        {mode === 'foot' ? (
          <button aria-label="Entrar al vehiculo" onPointerDown={() => tapAction('KeyE')}><span>E</span><small>SUBIR</small></button>
        ) : (
          <button aria-label="Salir del vehiculo" onPointerDown={() => tapAction('KeyQ')}><span>Q</span><small>SALIR</small></button>
        )}
      </div>
    </div>
  )
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('menu')

  if (screen === 'menu') return <Menu onStart={() => setScreen('game')} />
  return <Undercity />
}
