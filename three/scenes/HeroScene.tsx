"use client";

import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { PerspectiveCamera, Environment, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { shouldReduceMotion } from '@/lib/reducedMotion';

interface HeroSceneProps {
  children?: React.ReactNode;
  env?: string;
  cameraPosition?: [number, number, number];
  autoRotate?: boolean;
}

export function HeroScene({
  children,
  env,
  cameraPosition = [0, 0, 5],
  autoRotate = false,
}: HeroSceneProps) {
  const groupRef = useRef<THREE.Group>(null);
  const reducedMotion = shouldReduceMotion();

  useFrame(() => {
    if (reducedMotion || !groupRef.current || !autoRotate) return;

    groupRef.current.rotation.y += 0.01;
  });

  return (
    <>
      <PerspectiveCamera makeDefault position={cameraPosition} />
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
      {env && <Environment preset={env as any} />}
      {!reducedMotion && <OrbitControls enableDamping dampingFactor={0.05} />}
      <group ref={groupRef}>{children}</group>
    </>
  );
}















