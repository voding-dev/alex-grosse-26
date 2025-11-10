"use client";

import { useEffect, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { PerspectiveCamera, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import Image from 'next/image';
import { shouldReduceMotion } from '@/lib/reducedMotion';

interface DepthParallaxHeroProps {
  src: string;
  depthSrc?: string;
  alphaSrc?: string;
  roughnessSrc?: string;
  intensity?: number;
  alt?: string;
  className?: string;
}

function DepthPlane({
  src,
  depthSrc,
  alphaSrc,
  roughnessSrc,
  intensity = 0.12,
}: Omit<DepthParallaxHeroProps, 'alt' | 'className'>) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  const reducedMotion = shouldReduceMotion();

  // Load textures
  const baseTexture = useTexture(src);
  const depthTexture = depthSrc ? useTexture(depthSrc) : null;
  const alphaTexture = alphaSrc ? useTexture(alphaSrc) : null;
  const roughnessTexture = roughnessSrc ? useTexture(roughnessSrc) : null;

  // Handle mouse movement
  useEffect(() => {
    if (reducedMotion) return;

    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth) * 2 - 1;
      const y = -(e.clientY / window.innerHeight) * 2 + 1;
      setMouse({ x, y });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [reducedMotion]);

  useFrame(() => {
    if (!meshRef.current || reducedMotion) return;

    // Lerp mouse position for smooth movement
    const targetX = mouse.x * 6; // ±6° tilt
    const targetY = mouse.y * 6;

    meshRef.current.rotation.x = THREE.MathUtils.lerp(
      meshRef.current.rotation.x,
      targetY * (Math.PI / 180),
      0.08
    );
    meshRef.current.rotation.y = THREE.MathUtils.lerp(
      meshRef.current.rotation.y,
      targetX * (Math.PI / 180),
      0.08
    );

    // Depth displacement
    if (depthTexture) {
      // This would require a custom shader for proper depth displacement
      // For now, we'll use a simple parallax effect
    }
  });

  return (
    <mesh ref={meshRef}>
      <planeGeometry args={[2, 2, 32, 32]} />
      <meshStandardMaterial
        map={baseTexture}
        alphaMap={alphaTexture || undefined}
        roughnessMap={roughnessTexture || undefined}
        transparent={!!alphaTexture}
      />
    </mesh>
  );
}

export function DepthParallaxHero({
  src,
  depthSrc,
  alphaSrc,
  roughnessSrc,
  intensity = 0.12,
  alt = '',
  className = '',
}: DepthParallaxHeroProps) {
  const reducedMotion = shouldReduceMotion();

  // Fallback to static image on reduced motion
  if (reducedMotion) {
    return (
      <picture className={className}>
        <source srcSet={src} type="image/webp" />
        <img src={src} alt={alt} className="w-full h-full object-cover" />
      </picture>
    );
  }

  return (
    <div className={`relative w-full h-full ${className}`}>
      <Canvas frameloop="demand">
        <PerspectiveCamera makeDefault position={[0, 0, 1]} />
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        <DepthPlane
          src={src}
          depthSrc={depthSrc}
          alphaSrc={alphaSrc}
          roughnessSrc={roughnessSrc}
          intensity={intensity}
        />
      </Canvas>
    </div>
  );
}








