"use client";

import { useEffect, useState } from 'react';
import Lenis from 'lenis';
import { shouldReduceMotion } from '@/lib/reducedMotion';

let lenisInstance: Lenis | null = null;

export function useLenis(): Lenis | null {
  const [lenis, setLenis] = useState<Lenis | null>(null);

  useEffect(() => {
    if (shouldReduceMotion()) {
      return;
    }

    if (!lenisInstance) {
      lenisInstance = new Lenis({
        duration: 1.2,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        orientation: 'vertical',
        gestureOrientation: 'vertical',
        smoothWheel: true,
        wheelMultiplier: 1,
        smoothTouch: false,
        touchMultiplier: 2,
      });

      function raf(time: number) {
        lenisInstance?.raf(time);
        requestAnimationFrame(raf);
      }

      requestAnimationFrame(raf);
    }

    setLenis(lenisInstance);

    return () => {
      // Don't destroy on unmount - keep instance alive
    };
  }, []);

  return lenis;
}



