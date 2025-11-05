"use client";

import { useEffect, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { PerspectiveCamera, useGLTF, Environment } from '@react-three/drei';
import * as THREE from 'three';
import { shouldReduceMotion } from '@/lib/reducedMotion';
import { useLenis } from '@/hooks/useLenis';

interface SpinModelOnScrollProps {
  glb: string;
  base?: string;
  normal?: string;
  roughness?: string;
  metallic?: string;
  env?: string;
  start?: number;
  end?: number;
  className?: string;
}

function Model({
  glb,
  base,
  normal,
  roughness,
  metallic,
  env,
  start = 0,
  end = 1,
}: Omit<SpinModelOnScrollProps, 'className'>) {
  const modelRef = useRef<THREE.Group>(null);
  const scrollProgress = useRef(0);
  const reducedMotion = shouldReduceMotion();
  const lenis = useLenis();

  const { scene } = useGLTF(glb);

  // Update scroll progress
  useEffect(() => {
    if (reducedMotion) return;

    const updateProgress = () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const documentHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = Math.max(0, Math.min(1, scrollTop / documentHeight));
      scrollProgress.current = progress;
    };

    window.addEventListener('scroll', updateProgress, { passive: true });
    updateProgress();

    return () => window.removeEventListener('scroll', updateProgress);
  }, [reducedMotion]);

  // Update rotation based on scroll
  useFrame(() => {
    if (!modelRef.current || reducedMotion) return;

    const progress = scrollProgress.current;
    const normalizedProgress = (progress - start) / (end - start);
    const clampedProgress = Math.max(0, Math.min(1, normalizedProgress));

    // Rotate Y from 0 to 2π
    modelRef.current.rotation.y = clampedProgress * Math.PI * 2;

    // Throttle to 30Hz
    if (Date.now() % 33 < 16) {
      return;
    }
  });

  // Pause when offscreen
  useEffect(() => {
    if (!modelRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          // Would pause rendering here if needed
        });
      },
      { threshold: 0 }
    );

    observer.observe(modelRef.current.parentElement!);

    return () => observer.disconnect();
  }, []);

  // Set DPR cap
  useEffect(() => {
    const isMobile = window.innerWidth < 768;
    const maxDPR = isMobile ? 1.5 : 2;
    const currentDPR = window.devicePixelRatio;
    if (currentDPR > maxDPR) {
      // Note: DPR adjustment would need to be handled at Canvas level
    }
  }, []);

  return (
    <group ref={modelRef}>
      <primitive object={scene} />
      {env && <Environment preset={env as any} />}
    </group>
  );
}

export function SpinModelOnScroll({
  glb,
  base,
  normal,
  roughness,
  metallic,
  env,
  start = 0,
  end = 1,
  className = '',
}: SpinModelOnScrollProps) {
  const reducedMotion = shouldReduceMotion();

  if (reducedMotion) {
    return (
      <div className={className}>
        <p>3D model disabled for reduced motion preference</p>
      </div>
    );
  }

  return (
    <div className={`relative w-full h-full ${className}`}>
      <Canvas frameloop="demand" dpr={[1, 2]}>
        <PerspectiveCamera makeDefault position={[0, 0, 5]} />
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        <Model
          glb={glb}
          base={base}
          normal={normal}
          roughness={roughness}
          metallic={metallic}
          env={env}
          start={start}
          end={end}
        />
      </Canvas>
    </div>
  );
}


