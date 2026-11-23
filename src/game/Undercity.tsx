import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Cloud, Environment, Html, PerspectiveCamera } from '@react-three/drei'
import { CuboidCollider, Physics, RigidBody } from '@react-three/rapier'
import type { RapierRigidBody } from '@react-three/rapier'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { RefObject } from 'react'
import * as THREE from 'three'
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, CarFront, Map, Settings, Volume2, VolumeX, X } from 'lucide-react'

const COLORS = ['#9f382f', '#4d6674', '#b8b29d', '#2f5d46', '#5a4a70', '#a66d3c', '#22282b', '#d2cfbd']
const PERSON_COLORS = ['#c6a48b', '#6a4a37', '#deb893', '#80553f', '#3d2b24', '#a67c64']
const TRAFFIC_COLORS = ['#a02f29', '#273d4c', '#d3d0be', '#6d7442', '#d3a148', '#34343a']
const ROAD_SIZE = 120

type Mission = { title: string; target: THREE.Vector3; reward: number }

function seeded(seed: number) { return Math.abs(Math.sin(seed * 12.9898) * 43758.5453) % 1 }

function Building({ position, size, seed }: { position: [number, number, number]; size: [number, number, number]; seed: number }) {
  const floors = Math.max(3, Math.floor(size[1] / 2.2))
  return (
    <group position={position}>
      <RigidBody type="fixed" colliders="cuboid">
        <mesh castShadow receiveShadow>
          <boxGeometry args={size} />
          <meshStandardMaterial color={seeded(seed) > .5 ? '#252d2d' : '#303735'} roughness={.82} />
        </mesh>
      </RigidBody>
      {Array.from({ length: floors }).map((_, floor) => (
        <group key={floor} position={[0, -size[1] / 2 + 1.55 + floor * 2.2, size[2] / 2 + .014]}>
          {[-.28, .28].map((side) => (
            <mesh key={side} position={[side * size[0], 0, 0]}>
              <planeGeometry args={[.72, .48]} />
              <meshBasicMaterial color={(floor + seed) % 5 === 0 ? '#dca75f' : '#78908a'} toneMapped={false} />
            </mesh>
          ))}
        </group>
      ))}
      <mesh position={[0, -size[1] / 2 + .85, size[2] / 2 + .12]}>
        <boxGeometry args={[1.15, 1.7, .18]} />
        <meshStandardMaterial color="#202729" metalness={.4} />
      </mesh>
      {seed % 3 === 0 && <mesh position={[0, size[1] / 2 - .7, size[2] / 2 + .08]}><boxGeometry args={[2.2, .28, .8]} /><meshStandardMaterial color="#746b54" roughness={.8} /></mesh>}
    </group>
  )
}

function CityChunk({ cx, cz }: { cx: number; cz: number }) {
  const buildings = useMemo(() => {
    const result: { position: [number, number, number]; size: [number, number, number]; seed: number }[] = []
    for (let gx = -12; gx <= 12; gx += 8) {
      for (let gz = -12; gz <= 12; gz += 8) {
        if (Math.abs(gx) < 5 && Math.abs(gz) < 5) continue
        const seed = cx * 101 + cz * 97 + gx * 3 + gz * 7
        const height = 6 + Math.floor(seeded(seed) * 12)
        result.push({ position: [cx * 32 + gx, height / 2, cz * 32 + gz], size: [5.6 + seeded(seed + 2) * 1.2, height, 5.4], seed })
      }
    }
    return result
  }, [cx, cz])

  return (
    <group>
      <mesh position={[cx * 32, -.04, cz * 32]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[32, 32]} />
        <meshStandardMaterial color="#343a38" roughness={.9} />
      </mesh>
      {[-3.5, 3.5].map((offset) => (
        <mesh key={offset} position={[cx * 32 + offset, -.01, cz * 32]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[6.2, 32]} /><meshStandardMaterial color="#232827" roughness={.95} />
        </mesh>
      ))}
      {[-2.8, 0, 2.8].map((offset) => (
        <mesh key={offset} position={[cx * 32 + offset, .002, cz * 32]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[.11, 28]} /><meshBasicMaterial color="#aaa174" />
        </mesh>
      ))}
      {buildings.map((building, index) => <Building key={index} {...building} />)}
      {[-12, 12].map((offset) => (
        <group key={offset} position={[cx * 32 + offset, 0, cz * 32 + 12]}>
          <mesh position={[0, 1.5, 0]} castShadow><cylinderGeometry args={[.04, .06, 3, 8]} /><meshStandardMaterial color="#1d2222" /></mesh>
          <mesh position={[0, 3.05, 0]}><boxGeometry args={[.5, .12, .28]} /><meshStandardMaterial color="#e0dfa9" emissive="#dbe09b" emissiveIntensity={1.2} /></mesh>
        </group>
      ))}
      <mesh position={[cx * 32 - 8, .012, cz * 32 + 8]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[7, 1.2]} /><meshPhysicalMaterial color="#101819" roughness={.12} metalness={.2} clearcoat={1} />
      </mesh>
    </group>
  )
}

function Pedestrian({ index, playerRef }: { index: number; playerRef: RefObject<RapierRigidBody | null> }) {
  const ref = useRef<THREE.Group>(null)
  const start = useMemo(() => [(-48 + (index * 7) % 96), 0, (-48 + (index * 11) % 96)] as [number, number, number], [index])
  const route = index % 4
  const speed = 1.1 + seeded(index) * .9
  useFrame((state, delta) => {
    if (!ref.current) return
    const t = state.clock.elapsedTime * speed + index * 1.7
    let x = start[0]
    let z = start[2]
    if (route === 0) { z = ((t * 2.2 + start[2] + 60) % 120) - 60; x = start[0] + 3.4 }
    if (route === 1) { x = ((t * 2.2 + start[0] + 60) % 120) - 60; z = start[2] + 3.4 }
    if (route === 2) { z = ((-t * 1.7 + start[2] + 60) % 120) - 60; x = start[0] - 3.4 }
    if (route === 3) { x = ((-t * 1.7 + start[0] + 60) % 120) - 60; z = start[2] - 3.4 }
    const playerTranslation = playerRef.current?.translation()
    const playerPos = playerTranslation ? new THREE.Vector3(playerTranslation.x, playerTranslation.y, playerTranslation.z) : null
    if (playerPos && ref.current.position.distanceTo(playerPos) < 2.2) {
      const away = ref.current.position.clone().sub(playerPos).normalize()
      x += away.x * 2
      z += away.z * 2
    }
    ref.current.position.lerp(new THREE.Vector3(x, 0, z), 1 - Math.pow(.0001, delta))
  })
  return (
    <group ref={ref} position={start}>
      <mesh position={[0, 1.35, 0]} castShadow><capsuleGeometry args={[.24, .8, 5, 8]} /><meshStandardMaterial color={PERSON_COLORS[index % PERSON_COLORS.length]} /></mesh>
      <mesh position={[0, 2.05, 0]} castShadow><sphereGeometry args={[.22, 10, 8]} /><meshStandardMaterial color={PERSON_COLORS[(index + 3) % PERSON_COLORS.length]} /></mesh>
      {[-.4, .4].map((x) => <mesh key={x} position={[x, .42, 0]}><boxGeometry args={[.16, .84, .16]} /><meshStandardMaterial color="#252b2c" /></mesh>)}
      {index % 11 === 0 && <Html position={[0, 2.75, 0]} center distanceFactor={18}><div className="npc-tag">Vecino</div></Html>}
    </group>
  )
}

function TrafficCar({ index, playerRef }: { index: number; playerRef: RefObject<RapierRigidBody | null> }) {
  const ref = useRef<THREE.Group>(null)
  const direction = index % 4
  const speed = 3.5 + seeded(index + 20) * 3
  useFrame((state, delta) => {
    if (!ref.current) return
    const playerTranslation = playerRef.current?.translation()
    if (playerTranslation && ref.current.position.distanceTo(new THREE.Vector3(playerTranslation.x, playerTranslation.y, playerTranslation.z)) > 58) {
      ref.current.position.set(((playerTranslation.x + (index % 9 - 4) * 8 + 60) % 120) - 60, .55, ((playerTranslation.z + (index % 7 - 3) * 8 + 60) % 120) - 60)
    }
    const movement = speed * delta
    if (direction === 0) { ref.current.position.z -= movement; ref.current.rotation.y = Math.PI }
    if (direction === 1) { ref.current.position.z += movement; ref.current.rotation.y = 0 }
    if (direction === 2) { ref.current.position.x -= movement; ref.current.rotation.y = -Math.PI / 2 }
    if (direction === 3) { ref.current.position.x += movement; ref.current.rotation.y = Math.PI / 2 }
    if (ref.current.position.z < -60) ref.current.position.z = 60
    if (ref.current.position.z > 60) ref.current.position.z = -60
    if (ref.current.position.x < -60) ref.current.position.x = 60
    if (ref.current.position.x > 60) ref.current.position.x = -60
  })
  const initial = [(direction === 2 || direction === 3 ? ((index * 9) % 120) - 60 : (index % 2 ? -3.5 : 3.5)), .55, (direction === 0 || direction === 1 ? ((index * 9) % 120) - 60 : (index % 2 ? -3.5 : 3.5))] as [number, number, number]
  return (
    <group ref={ref} position={initial}>
      <mesh castShadow position={[0, .55, 0]}><boxGeometry args={[1.55, .62, 3.15]} /><meshStandardMaterial color={TRAFFIC_COLORS[index % TRAFFIC_COLORS.length]} metalness={.35} roughness={.4} /></mesh>
      <mesh castShadow position={[0, 1.08, -.28]}><boxGeometry args={[1.38, .55, 1.45]} /><meshStandardMaterial color="#566a70" metalness={.25} /></mesh>
      {[-.72, .72].flatMap((x) => [-1.05, 1.05].map((z) => <mesh key={`${x}-${z}`} position={[x, .28, z]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[.34, .34, .22, 12]} /><meshStandardMaterial color="#171919" /></mesh>))}
    </group>
  )
}

function TrafficLights() {
  const [green, setGreen] = useState(true)
  useEffect(() => {
    const id = window.setInterval(() => setGreen(value => !value), 9000)
    return () => window.clearInterval(id)
  }, [])

  return (
    <group>
      {[-18, 18].flatMap((x) => [-18, 18].map((z) => (
        <group key={`${x}-${z}`} position={[x, 0, z]}>
          <mesh position={[0, 1.8, 0]}><cylinderGeometry args={[.045, .06, 3.6, 8]} /><meshStandardMaterial color="#202525" /></mesh>
          <mesh position={[0, 3.1, 0]}><boxGeometry args={[.42, .8, .32]} /><meshStandardMaterial color="#151919" /></mesh>
          <mesh position={[0, 3.27, .17]}><sphereGeometry args={[.09, 8, 8]} /><meshBasicMaterial color={green ? '#77c96b' : '#4a2522'} /></mesh>
          <mesh position={[0, 2.93, .17]}><sphereGeometry args={[.09, 8, 8]} /><meshBasicMaterial color={green ? '#35201d' : '#dc5b43'} /></mesh>
        </group>
      )))}
    </group>
  )
}

function Player({ rigidRef, visible }: { rigidRef: RefObject<RapierRigidBody | null>; visible: boolean }) {
  return (
    <RigidBody ref={rigidRef} position={[0, 1.2, 8]} type="kinematicPosition" enabledRotations={[false, false, false]} colliders={false} canSleep={false}>
      <CuboidCollider args={[.34, 1.15, .34]} position={[0, .05, 0]} />
      <group visible={visible}>
        <mesh castShadow position={[0, -.1, 0]}><capsuleGeometry args={[.34, 1.15, 6, 10]} /><meshStandardMaterial color="#d6c6a6" roughness={.7} /></mesh>
        <mesh castShadow position={[0, .78, 0]}><sphereGeometry args={[.32, 16, 12]} /><meshStandardMaterial color="#b98d70" /></mesh>
      </group>
    </RigidBody>
  )
}

function DriveCar({ rigidRef, bodyColor = '#9f382f' }: { rigidRef: RefObject<RapierRigidBody | null>; bodyColor?: string }) {
  return (
    <RigidBody ref={rigidRef} position={[6, 1.1, 8]} colliders="cuboid" mass={1250} friction={1.1} restitution={.08} linearDamping={.55} angularDamping={1.4} enabledRotations={[false, true, false]}>
      <group>
        <mesh castShadow position={[0, .55, 0]}><boxGeometry args={[1.9, .72, 3.6]} /><meshStandardMaterial color={bodyColor} metalness={.45} roughness={.38} /></mesh>
        <mesh castShadow position={[0, 1.22, -.25]}><boxGeometry args={[1.65, .66, 1.75]} /><meshStandardMaterial color="#4d6669" metalness={.25} roughness={.28} /></mesh>
        {[-.95, .95].flatMap((x) => [-1.15, 1.15].map((z) => <mesh key={`${x}-${z}`} position={[x, .28, z]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[.42, .42, .28, 16]} /><meshStandardMaterial color="#111313" /></mesh>))}
      </group>
    </RigidBody>
  )
}

function ProceduralWorld({ playerRef, vehicleRef, onDistance, onVehicleMove, cameraMode }: { playerRef: RefObject<RapierRigidBody | null>; vehicleRef: RefObject<RapierRigidBody | null>; onDistance: (value: number) => void; onVehicleMove: (value: number) => void; cameraMode: 'third' | 'first' }) {
  const keys = useRef<Record<string, boolean>>({})
  const inVehicle = useRef(false)
  const yaw = useRef(Math.PI)
  const { camera } = useThree()
  const [night, setNight] = useState(false)
  const [raining, setRaining] = useState(false)

  useEffect(() => {
    const down = (event: KeyboardEvent) => { keys.current[event.code] = true }
    const up = (event: KeyboardEvent) => { keys.current[event.code] = false }
    const cycle = window.setInterval(() => setNight(value => !value), 45000)
    const rainCycle = window.setInterval(() => setRaining(value => !value), 32000)
    window.addEventListener('keydown', down); window.addEventListener('keyup', up)
    return () => { window.clearInterval(cycle); window.clearInterval(rainCycle); window.removeEventListener('keydown', down); window.removeEventListener('keyup', up) }
  }, [])

  useEffect(() => {
    const enterExit = (event: KeyboardEvent) => {
      if (event.code !== 'KeyE' && event.code !== 'KeyQ') return
      if (!playerRef.current || !vehicleRef.current) return
      const player = playerRef.current.translation()
      const vehicle = vehicleRef.current.translation()
      if (event.code === 'KeyE' && !inVehicle.current && Math.hypot(player.x - vehicle.x, player.z - vehicle.z) < 4.2) {
        inVehicle.current = true
        window.dispatchEvent(new CustomEvent('undercity-mode', { detail: 'vehicle' }))
      }
      if (event.code === 'KeyQ' && inVehicle.current) {
        inVehicle.current = false
        playerRef.current.setNextKinematicTranslation({ x: vehicle.x - 2.2, y: 1.2, z: vehicle.z })
        window.dispatchEvent(new CustomEvent('undercity-mode', { detail: 'foot' }))
      }
    }
    window.addEventListener('keydown', enterExit)
    return () => window.removeEventListener('keydown', enterExit)
  }, [playerRef, vehicleRef])

  useFrame((_, delta) => {
    const active = inVehicle.current ? vehicleRef.current : playerRef.current
    if (!active) return
    const forward = keys.current.KeyW || keys.current.ArrowUp
    const backward = keys.current.KeyS || keys.current.ArrowDown
    const left = keys.current.KeyA || keys.current.ArrowLeft
    const right = keys.current.KeyD || keys.current.ArrowRight

    if (inVehicle.current && vehicleRef.current) {
      const body = vehicleRef.current
      const lin = body.linvel()
      const speed = Math.hypot(lin.x, lin.z)
      onVehicleMove(speed)
      const rotation = body.rotation()
      const quat = new THREE.Quaternion(rotation.x, rotation.y, rotation.z, rotation.w)
      const forwardVector = new THREE.Vector3(0, 0, -1).applyQuaternion(quat)
      if (forward) body.applyImpulse({ x: forwardVector.x * 680 * delta, y: 0, z: forwardVector.z * 680 * delta }, true)
      if (backward) body.applyImpulse({ x: -forwardVector.x * 460 * delta, y: 0, z: -forwardVector.z * 460 * delta }, true)
      if (left) body.applyTorqueImpulse({ x: 0, y: 260 * delta * Math.min(1, speed / 3), z: 0 }, true)
      if (right) body.applyTorqueImpulse({ x: 0, y: -260 * delta * Math.min(1, speed / 3), z: 0 }, true)
      if (speed > 18) body.setLinvel({ x: lin.x * .985, y: lin.y, z: lin.z * .985 }, true)
    } else if (playerRef.current) {
      const body = playerRef.current
      const pos = body.translation()
      const move = 5.2 * delta
      let x = pos.x
      let z = pos.z
      if (forward) z -= move
      if (backward) z += move
      if (left) x -= move
      if (right) x += move
      if (left) yaw.current = Math.PI / 2
      if (right) yaw.current = -Math.PI / 2
      if (forward) yaw.current = Math.PI
      if (backward) yaw.current = 0
      body.setNextKinematicTranslation({ x: THREE.MathUtils.clamp(x, -58, 58), y: pos.y, z: THREE.MathUtils.clamp(z, -58, 58) })
      if (vehicleRef.current) onDistance(Math.hypot(pos.x - vehicleRef.current.translation().x, pos.z - vehicleRef.current.translation().z))
    }

    const pos = active.translation()
    if (inVehicle.current && vehicleRef.current) {
      const rotation = vehicleRef.current.rotation()
      yaw.current = 2 * Math.atan2(rotation.y, rotation.w)
    }
    if (cameraMode === 'first') {
      camera.position.lerp(new THREE.Vector3(pos.x, pos.y + (inVehicle.current ? 1.55 : 1.45), pos.z + (inVehicle.current ? 0 : .15)), .18)
      camera.lookAt(pos.x + Math.sin(yaw.current) * 10, pos.y + 1, pos.z + Math.cos(yaw.current) * 10)
    } else {
      const behind = new THREE.Vector3(Math.sin(yaw.current) * 11, 7.5, Math.cos(yaw.current) * 11)
      camera.position.lerp(new THREE.Vector3(pos.x + behind.x, pos.y + behind.y, pos.z + behind.z), 1 - Math.pow(.002, delta))
      camera.lookAt(pos.x, pos.y + 1, pos.z)
    }
  })

  const chunks = []
  for (let cx = -2; cx <= 2; cx++) for (let cz = -2; cz <= 2; cz++) chunks.push(<CityChunk key={`${cx}-${cz}`} cx={cx} cz={cz} />)

  return (
    <>
      <color attach="background" args={[night ? '#091018' : '#96a2a1']} />
      <fog attach="fog" args={[raining ? '#6f7b78' : (night ? '#091018' : '#96a2a1'), raining ? 18 : (night ? 28 : 38), 82]} />
      <hemisphereLight args={[night ? '#4b5b76' : '#dce8dd', '#26302c', night ? .55 : 1.35]} />
      <directionalLight position={[18, 30, 12]} intensity={night ? .35 : 2.2} castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-58} shadow-camera-right={58} shadow-camera-top={58} shadow-camera-bottom={-58} />
      {chunks}
      {raining && [-38, -24, -10, 6, 20, 36].map((x, index) => (
        <mesh key={x} position={[x, .018, index % 2 ? -21 : 18]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[2.4 + (index % 3), 24]} />
          <meshPhysicalMaterial color="#93aaa5" roughness={.08} metalness={.55} clearcoat={1} transparent opacity={.48} />
        </mesh>
      ))}
      <TrafficLights />
      <Cloud position={[0, 24, -34]} scale={8} speed={.08} opacity={night ? .18 : .38} />
      {Array.from({ length: 24 }).map((_, index) => <Pedestrian key={`p-${index}`} index={index} playerRef={playerRef} />)}
      {Array.from({ length: 16 }).map((_, index) => <TrafficCar key={`c-${index}`} index={index} playerRef={playerRef} />)}
      <PerspectiveCamera makeDefault position={[11, 9, 16]} fov={55} />
      <Environment preset="city" />
    </>
  )
}

function TouchControls({ mode, onEnter }: { mode: 'foot' | 'vehicle'; onEnter: () => void }) {
  const press = (code: string, pressed: boolean) => window.dispatchEvent(new KeyboardEvent(pressed ? 'keydown' : 'keyup', { code, bubbles: true }))
  const hold = (code: string) => ({ onPointerDown: (event: React.PointerEvent<HTMLButtonElement>) => { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); press(code, true) }, onPointerUp: () => press(code, false), onPointerCancel: () => press(code, false), onLostPointerCapture: () => press(code, false) })
  return (
    <div className="touch-controls">
      <div className="touch-dpad"><button className="touch-up" aria-label="Adelante" {...hold('KeyW')}><ArrowUp /></button><button className="touch-left" aria-label="Izquierda" {...hold('KeyA')}><ArrowLeft /></button><button className="touch-down" aria-label="Atras" {...hold('KeyS')}><ArrowDown /></button><button className="touch-right" aria-label="Derecha" {...hold('KeyD')}><ArrowRight /></button></div>
      <div className="touch-actions"><button onPointerDown={onEnter}><span>{mode === 'foot' ? 'E' : 'Q'}</span><small>{mode === 'foot' ? 'SUBIR' : 'SALIR'}</small></button></div>
    </div>
  )
}

export default function Undercity() {
  const playerRef = useRef<RapierRigidBody>(null)
  const vehicleRef = useRef<RapierRigidBody>(null)
  const [mode, setMode] = useState<'foot' | 'vehicle'>('foot')
  const [distance, setDistance] = useState(99)
  const [vehicleSpeed, setVehicleSpeed] = useState(0)
  const [cameraMode, setCameraMode] = useState<'third' | 'first'>(() => (localStorage.getItem('undercity-camera') as 'third' | 'first') || 'third')
  const [credits, setCredits] = useState(() => Number(localStorage.getItem('undercity-credits') || 240))
  const [missionIndex, setMissionIndex] = useState(0)
  const [achievements, setAchievements] = useState<string[]>(() => JSON.parse(localStorage.getItem('undercity-achievements') || '[]'))
  const engineAudio = useRef<{ context: AudioContext; oscillator: OscillatorNode; gain: GainNode } | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)

  const missions: Mission[] = useMemo(() => [
    { title: 'Entrega nocturna', target: new THREE.Vector3(-24, 0, -26), reward: 160 },
    { title: 'Carrera Industrial', target: new THREE.Vector3(28, 0, 30), reward: 280 },
    { title: 'Recoger vehículo', target: new THREE.Vector3(6, 0, 8), reward: 120 },
  ], [])
  const mission = missions[missionIndex]

  useEffect(() => {
    const listener = (event: Event) => setMode((event as CustomEvent<'foot' | 'vehicle'>).detail)
    window.addEventListener('undercity-mode', listener)
    const cameraListener = (event: KeyboardEvent) => { if (event.code === 'KeyV') setCameraMode(value => value === 'third' ? 'first' : 'third') }
    window.addEventListener('keydown', cameraListener)
    return () => { window.removeEventListener('undercity-mode', listener); window.removeEventListener('keydown', cameraListener) }
  }, [])

  useEffect(() => { localStorage.setItem('undercity-camera', cameraMode) }, [cameraMode])

  useEffect(() => {
    if (mode !== 'vehicle') {
      if (engineAudio.current) engineAudio.current.gain.gain.setTargetAtTime(.0001, engineAudio.current.context.currentTime, .08)
      return
    }

    if (!engineAudio.current) {
      const context = new AudioContext()
      const oscillator = context.createOscillator()
      const gain = context.createGain()
      oscillator.type = 'sawtooth'
      oscillator.frequency.value = 42
      gain.gain.value = .0001
      oscillator.connect(gain).connect(context.destination)
      oscillator.start()
      engineAudio.current = { context, oscillator, gain }
    }
    const audio = engineAudio.current
    audio.oscillator.frequency.setTargetAtTime(42 + vehicleSpeed * 13, audio.context.currentTime, .08)
    audio.gain.gain.setTargetAtTime(.018 + Math.min(vehicleSpeed / 800, .025), audio.context.currentTime, .08)
  }, [mode, vehicleSpeed])

  useEffect(() => () => {
    if (engineAudio.current) engineAudio.current.context.close()
  }, [])

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (!playerRef.current || !vehicleRef.current) return
      const pos = mode === 'vehicle' ? vehicleRef.current.translation() : playerRef.current.translation()
      if (Math.hypot(pos.x - mission.target.x, pos.z - mission.target.z) < 3.2) {
        const nextCredits = credits + mission.reward
        setCredits(nextCredits)
        localStorage.setItem('undercity-credits', String(nextCredits))
        setMissionIndex(value => (value + 1) % missions.length)
        setAchievements(value => {
          const next = [...new Set([...value, mission.title])]
          localStorage.setItem('undercity-achievements', JSON.stringify(next))
          return next
        })
      }
    }, 500)
    return () => window.clearInterval(timer)
  }, [credits, mission, missionIndex, missions.length, mode])

  const enterAction = () => {
    const code = mode === 'foot' ? 'KeyE' : 'KeyQ'
    window.dispatchEvent(new KeyboardEvent('keydown', { code, bubbles: true }))
  }

  return (
    <main className="game-shell undercity">
      <Canvas shadows dpr={[1, 1.5]} gl={{ antialias: true }}>
        <Physics gravity={[0, -9.81, 0]}>
          <Player rigidRef={playerRef} visible={mode === 'foot'} />
          <DriveCar rigidRef={vehicleRef} />
          <ProceduralWorld playerRef={playerRef} vehicleRef={vehicleRef} onDistance={setDistance} onVehicleMove={setVehicleSpeed} cameraMode={cameraMode} />
        </Physics>
      </Canvas>

      <header className="game-hud"><div className="hud-brand">UC <span>04</span></div><button className="hud-menu" onClick={() => setMenuOpen(value => !value)}><Settings size={16} /> MENU</button></header>
      <aside className="mission-panel"><small>MISIÓN ACTIVA</small><strong>{mission.title}</strong><span>+${mission.reward}</span></aside>
      <aside className="economy-panel"><small>SALDO</small><strong>${credits.toLocaleString()}</strong></aside>
      <aside className="map-panel"><div className="map-grid"><i style={{ left: '50%', top: '64%' }} /><b style={{ left: `${50 + mission.target.x / 2}%`, top: `${50 + mission.target.z / 2}%` }} /></div><Map size={14} /><span>CASA · 04</span></aside>
      {mode === 'foot' && distance < 4.2 && <div className="action-prompt"><kbd>E</kbd><span>Entrar al vehículo</span></div>}
      {mode === 'vehicle' && <div className="action-prompt"><CarFront size={18} /><span>Q salir · V cámara · {Math.round(vehicleSpeed * 3.6)} km/h</span></div>}
      <TouchControls mode={mode} onEnter={enterAction} />

      {menuOpen && <div className="game-menu"><button className="modal-close" onClick={() => setMenuOpen(false)}><X size={18} /></button><h2>GARAGE / CONFIGURACIÓN</h2><div className="garage-row"><div><CarFront /><span>SEDAN 04</span></div><strong>LISTO</strong></div><div className="camera-options"><button className={cameraMode === 'third' ? 'active' : ''} onClick={() => setCameraMode('third')}>TERCERA PERSONA</button><button className={cameraMode === 'first' ? 'active' : ''} onClick={() => setCameraMode('first')}>PRIMERA PERSONA</button></div><div className="achievement-count">LOGROS: {achievements.length}/{missions.length}</div></div>}
    </main>
  )
}
