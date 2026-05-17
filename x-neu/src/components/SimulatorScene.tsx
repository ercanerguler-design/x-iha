'use client';

import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Line } from '@react-three/drei';
import * as THREE from 'three';

export interface TelemetryData {
  altitude: number;
  speed: number;
  heading: number;
  battery: number;
  lat: number;
  lng: number;
  missionTime: number;
}

export interface SimulatorCanvasProps {
  onTelemetry: (d: Partial<TelemetryData>) => void;
  lockedTargets: number[];
  onTargetLock: (i: number) => void;
}

// ── Ground plane ──────────────────────────────────────────────────────────────
function Terrain() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[60, 60]} />
      <meshStandardMaterial color="#080f08" />
    </mesh>
  );
}

// ── Military grid overlay ─────────────────────────────────────────────────────
function TacticalGrid() {
  const range = 5;
  const els: React.ReactElement[] = [];
  for (let i = -range; i <= range; i++) {
    const p = i * 4;
    const major = i === 0;
    const col = major ? '#00d4ff' : '#00cc00';
    const w = major ? 0.8 : 0.3;
    const op = major ? 0.3 : 0.1;
    els.push(
      <Line key={`h${i}`} points={[new THREE.Vector3(-20, 0.02, p), new THREE.Vector3(20, 0.02, p)]}
        color={col} lineWidth={w} transparent opacity={op} />,
      <Line key={`v${i}`} points={[new THREE.Vector3(p, 0.02, -20), new THREE.Vector3(p, 0.02, 20)]}
        color={col} lineWidth={w} transparent opacity={op} />,
    );
  }
  return <group>{els}</group>;
}

// ── Ground target ─────────────────────────────────────────────────────────────
function Target({ position, locked }: { position: [number, number, number]; locked: boolean }) {
  const ringRef = useRef<THREE.Mesh>(null);
  const pulse = useRef(0);

  useFrame((_, dt) => {
    if (ringRef.current && locked) {
      pulse.current += dt * 4;
      const s = 1 + Math.sin(pulse.current) * 0.22;
      ringRef.current.scale.set(s, s, 1);
    }
  });

  return (
    <group position={position}>
      {/* Vehicle body */}
      <mesh position={[0, 0.2, 0]}>
        <boxGeometry args={[1.0, 0.35, 1.6]} />
        <meshStandardMaterial
          color={locked ? '#cc3300' : '#553300'}
          emissive={locked ? '#ff2200' : '#1a0800'}
          emissiveIntensity={locked ? 0.7 : 0.15}
        />
      </mesh>

      {/* Lock ring */}
      {locked && (
        <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
          <ringGeometry args={[0.9, 1.1, 32]} />
          <meshBasicMaterial color="#ff4d00" transparent opacity={0.85} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* Corner brackets */}
      {locked &&
        ([-1, 1] as const).flatMap((sx) =>
          ([-1, 1] as const).map((sz) => (
            <group key={`${sx}_${sz}`} position={[sx * 0.62, 0.42, sz * 0.92]}>
              <mesh><boxGeometry args={[0.22, 0.02, 0.02]} /><meshBasicMaterial color="#ff4d00" /></mesh>
              <mesh><boxGeometry args={[0.02, 0.02, 0.22]} /><meshBasicMaterial color="#ff4d00" /></mesh>
            </group>
          )),
        )}

      {locked && <pointLight color="#ff2200" intensity={1.2} distance={5} />}
    </group>
  );
}

// ── Waypoint marker ───────────────────────────────────────────────────────────
function WaypointMarker({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.16, 0.26, 16]} />
        <meshBasicMaterial color="#00d4ff" transparent opacity={0.55} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

// ── Patrol drone ──────────────────────────────────────────────────────────────
function PatrolDrone({
  waypoints,
  targetPositions,
  onTelemetry,
  onTargetLock,
}: {
  waypoints: THREE.Vector3[];
  targetPositions: THREE.Vector3[];
  onTelemetry: (d: Partial<TelemetryData>) => void;
  onTargetLock: (i: number) => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const propRef = useRef<THREE.Group>(null);
  const pos = useRef(waypoints[0].clone());
  const wpIdx = useRef(1);
  const t = useRef(0);
  const locked = useRef(new Set<number>());

  const SPEED = 5;
  const ALT = 3;

  useFrame((_, dt) => {
    if (!groupRef.current) return;
    t.current += dt;

    const dest = waypoints[wpIdx.current];
    const dir = dest.clone().sub(pos.current);
    dir.y = 0;
    const dist = dir.length();

    if (dist < 0.55) {
      wpIdx.current = (wpIdx.current + 1) % waypoints.length;
    } else {
      dir.normalize();
      pos.current.x += dir.x * dt * SPEED;
      pos.current.z += dir.z * dt * SPEED;
      pos.current.y = ALT + Math.sin(t.current * 1.8) * 0.12;
      groupRef.current.rotation.y = Math.atan2(dir.x, dir.z);
    }
    groupRef.current.position.copy(pos.current);

    if (propRef.current) propRef.current.rotation.y += 0.38;

    // Target proximity lock
    targetPositions.forEach((tp, i) => {
      const dx = pos.current.x - tp.x;
      const dz = pos.current.z - tp.z;
      if (Math.hypot(dx, dz) < 7 && !locked.current.has(i)) {
        locked.current.add(i);
        onTargetLock(i);
      }
    });

    // Telemetry
    const dest2 = waypoints[wpIdx.current];
    const hdgRad = Math.atan2(dest2.x - pos.current.x, dest2.z - pos.current.z);
    const heading = ((hdgRad * 180) / Math.PI + 360) % 360;
    onTelemetry({
      altitude: Math.round(ALT * 82 + 200 + Math.sin(t.current) * 9),
      speed: Math.round(SPEED * 36 + Math.sin(t.current * 0.7) * 7),
      heading: Math.round(heading),
      battery: Math.max(10, 100 - t.current * 0.38),
      lat: 39.9334 + pos.current.x * 0.00008,
      lng: 32.8597 + pos.current.z * 0.00008,
      missionTime: t.current,
    });
  });

  return (
    <group ref={groupRef}>
      {/* Fuselage */}
      <mesh>
        <cylinderGeometry args={[0.12, 0.16, 0.65, 8]} />
        <meshStandardMaterial color="#0d1520" metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Nose cone */}
      <mesh position={[0, 0, 0.38]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.12, 0.32, 8]} />
        <meshStandardMaterial color="#00d4ff" emissive="#00d4ff" emissiveIntensity={0.5} />
      </mesh>
      {/* Wings */}
      {([-0.64, 0.64] as const).map((x, i) => (
        <mesh key={i} position={[x, 0, 0]}>
          <boxGeometry args={[0.54, 0.03, 0.22]} />
          <meshStandardMaterial color="#080d18" metalness={0.6} />
        </mesh>
      ))}
      {/* Propellers */}
      <group ref={propRef} position={[0, 0.14, 0]}>
        {[0, 1, 2, 3].map((i) => (
          <mesh key={i} rotation={[0, (i * Math.PI) / 2, 0]}>
            <boxGeometry args={[0.44, 0.01, 0.05]} />
            <meshStandardMaterial color="#2a2a2a" />
          </mesh>
        ))}
      </group>
      {/* Nav light */}
      <pointLight color="#00d4ff" intensity={1.8} distance={4.5} />
    </group>
  );
}

// ── Inner scene (inside Canvas) ───────────────────────────────────────────────
function Scene({ onTelemetry, lockedTargets, onTargetLock }: SimulatorCanvasProps) {
  const waypoints = [
    new THREE.Vector3(-9, 3, -9),
    new THREE.Vector3(9, 3, -9),
    new THREE.Vector3(11, 3, 0),
    new THREE.Vector3(9, 3, 9),
    new THREE.Vector3(-9, 3, 9),
    new THREE.Vector3(-11, 3, 0),
  ];

  const targetPositions: [number, number, number][] = [
    [7, 0, -5],
    [-5, 0, 4],
    [1, 0, 8],
  ];

  const pathPoints = [...waypoints, waypoints[0]];

  return (
    <>
      <ambientLight intensity={0.12} />
      <directionalLight position={[5, 15, 5]} intensity={0.4} color="#b0d4ff" />

      <Terrain />
      <TacticalGrid />

      {/* Flight path dashed line */}
      <Line
        points={pathPoints}
        color="#00d4ff"
        lineWidth={1}
        transparent
        opacity={0.22}
        dashed
        dashScale={4}
      />

      {targetPositions.map((pos, i) => (
        <Target key={i} position={pos} locked={lockedTargets.includes(i)} />
      ))}

      {waypoints.map((wp, i) => (
        <WaypointMarker key={i} position={wp.toArray() as [number, number, number]} />
      ))}

      <PatrolDrone
        waypoints={waypoints}
        targetPositions={targetPositions.map((p) => new THREE.Vector3(...p))}
        onTelemetry={onTelemetry}
        onTargetLock={onTargetLock}
      />

      <OrbitControls
        enableZoom
        enablePan={false}
        minPolarAngle={Math.PI / 10}
        maxPolarAngle={Math.PI / 2.1}
        minDistance={8}
        maxDistance={48}
        autoRotate={false}
      />

      <fog attach="fog" args={['#050508', 35, 68]} />
    </>
  );
}

// ── Exported canvas component ─────────────────────────────────────────────────
export function SimulatorCanvas({ onTelemetry, lockedTargets, onTargetLock }: SimulatorCanvasProps) {
  return (
    <Canvas
      camera={{ position: [0, 22, 18], fov: 42 }}
      gl={{ antialias: true, alpha: false }}
      style={{ background: '#050508', width: '100%', height: '100%' }}
    >
      <Scene onTelemetry={onTelemetry} lockedTargets={lockedTargets} onTargetLock={onTargetLock} />
    </Canvas>
  );
}
