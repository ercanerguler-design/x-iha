'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { MeshStandardMaterial } from 'three';
import * as THREE from 'three';

function Wing({ position, rotation }: { position: [number, number, number]; rotation: [number, number, number] }) {
  return (
    <mesh position={position} rotation={rotation} castShadow>
      <boxGeometry args={[2.2, 0.06, 0.7]} />
      <meshStandardMaterial color="#1a2030" metalness={0.9} roughness={0.2} />
    </mesh>
  );
}

function TailFin({ position, rotation }: { position: [number, number, number]; rotation: [number, number, number] }) {
  return (
    <mesh position={position} rotation={rotation}>
      <boxGeometry args={[0.5, 0.06, 0.35]} />
      <meshStandardMaterial color="#151c28" metalness={0.9} roughness={0.3} />
    </mesh>
  );
}

export function DroneModel() {
  const groupRef = useRef<THREE.Group>(null!);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    groupRef.current.rotation.y = t * 0.4;
    groupRef.current.position.y = Math.sin(t * 0.8) * 0.15;
  });

  return (
    <group ref={groupRef}>
      {/* Main fuselage - tube body */}
      <mesh castShadow>
        <cylinderGeometry args={[0.15, 0.15, 2.8, 12]} />
        <meshStandardMaterial color="#0d1520" metalness={0.95} roughness={0.15} />
      </mesh>

      {/* Nose cone */}
      <mesh position={[0, 1.6, 0]} castShadow>
        <coneGeometry args={[0.15, 0.5, 12]} />
        <meshStandardMaterial color="#00d4ff" metalness={0.8} roughness={0.1} emissive="#00d4ff" emissiveIntensity={0.3} />
      </mesh>

      {/* Main wings */}
      <Wing position={[0, 0.2, 0]} rotation={[0, 0, 0]} />
      <Wing position={[0, 0.2, 0]} rotation={[0, Math.PI / 2, 0]} />

      {/* Swept forward canards */}
      <mesh position={[0, 1.0, 0]} rotation={[0, 0.35, 0]}>
        <boxGeometry args={[1.1, 0.05, 0.35]} />
        <meshStandardMaterial color="#1a2030" metalness={0.9} roughness={0.2} />
      </mesh>
      <mesh position={[0, 1.0, 0]} rotation={[0, -0.35 + Math.PI / 2, 0]}>
        <boxGeometry args={[1.1, 0.05, 0.35]} />
        <meshStandardMaterial color="#1a2030" metalness={0.9} roughness={0.2} />
      </mesh>

      {/* Tail fins */}
      <TailFin position={[0.0, -1.1, 0.22]} rotation={[0.6, 0, 0]} />
      <TailFin position={[0.0, -1.1, -0.22]} rotation={[-0.6, 0, 0]} />
      <TailFin position={[0.22, -1.1, 0.0]} rotation={[0, 0.6, Math.PI / 2]} />
      <TailFin position={[-0.22, -1.1, 0.0]} rotation={[0, -0.6, Math.PI / 2]} />

      {/* Camera dome */}
      <mesh position={[0, -0.5, 0]} castShadow>
        <sphereGeometry args={[0.12, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#00d4ff" metalness={0.5} roughness={0.1} transparent opacity={0.7} emissive="#00d4ff" emissiveIntensity={0.5} />
      </mesh>

      {/* Propeller motor housing at tail */}
      <mesh position={[0, -1.5, 0]}>
        <cylinderGeometry args={[0.12, 0.08, 0.2, 8]} />
        <meshStandardMaterial color="#0d1520" metalness={0.9} roughness={0.2} />
      </mesh>

      {/* Propeller blades */}
      <PropellerBlades />

      {/* Wing tip lights */}
      <mesh position={[1.1, 0.2, 0]}>
        <sphereGeometry args={[0.04, 6, 6]} />
        <meshStandardMaterial color="#ff4d00" emissive="#ff4d00" emissiveIntensity={2} />
      </mesh>
      <mesh position={[-1.1, 0.2, 0]}>
        <sphereGeometry args={[0.04, 6, 6]} />
        <meshStandardMaterial color="#00ff88" emissive="#00ff88" emissiveIntensity={2} />
      </mesh>
    </group>
  );
}

function PropellerBlades() {
  const ref = useRef<THREE.Group>(null!);
  useFrame(() => {
    ref.current.rotation.y += 0.3;
  });
  return (
    <group ref={ref} position={[0, -1.62, 0]}>
      <mesh rotation={[0, 0, 0]}>
        <boxGeometry args={[0.8, 0.02, 0.06]} />
        <meshStandardMaterial color="#1a2030" metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[0.8, 0.02, 0.06]} />
        <meshStandardMaterial color="#1a2030" metalness={0.8} roughness={0.2} />
      </mesh>
    </group>
  );
}

export function ParticleField() {
  const count = 200;
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 20;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 20;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 10;
    }
    return pos;
  }, []);

  const ref = useRef<THREE.Points>(null!);
  useFrame((state) => {
    ref.current.rotation.y = state.clock.elapsedTime * 0.02;
    ref.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.01) * 0.1;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute args={[positions, 3]} attach="attributes-position" />
      </bufferGeometry>
      <pointsMaterial color="#00d4ff" size={0.04} transparent opacity={0.5} sizeAttenuation />
    </points>
  );
}
