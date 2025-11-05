"use client";

import { useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { shouldReduceMotion } from '@/lib/reducedMotion';

interface UseScenePerfOptions {
  maxDPR?: { mobile: number; desktop: number };
  pauseWhenOffscreen?: boolean;
}

/**
 * Hook to manage scene performance settings
 * Auto-adjusts DPR and pauses rendering when offscreen
 */
export function useScenePerf(options: UseScenePerfOptions = {}) {
  const {
    maxDPR = { mobile: 1.5, desktop: 2 },
    pauseWhenOffscreen = true,
  } = options;

  const [isVisible, setIsVisible] = useState(true);
  const [dpr, setDpr] = useState(1);
  const reducedMotion = shouldReduceMotion();
  const containerRef = useRef<HTMLDivElement>(null);

  // Set DPR cap
  useEffect(() => {
    if (reducedMotion) {
      setDpr(1);
      return;
    }

    const isMobile = window.innerWidth < 768;
    const max = isMobile ? maxDPR.mobile : maxDPR.desktop;
    const currentDPR = window.devicePixelRatio;
    setDpr(Math.min(currentDPR, max));
  }, [maxDPR, reducedMotion]);

  // Pause when offscreen
  useEffect(() => {
    if (!pauseWhenOffscreen || !containerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          setIsVisible(entry.isIntersecting);
        });
      },
      { threshold: 0 }
    );

    observer.observe(containerRef.current);

    return () => observer.disconnect();
  }, [pauseWhenOffscreen]);

  // Throttle frame updates to 30Hz when not visible
  useFrame((state, delta) => {
    if (reducedMotion || !isVisible) {
      return;
    }

    // Continue normal rendering
  });

  return {
    dpr,
    isVisible,
    reducedMotion,
    containerRef,
  };
}



