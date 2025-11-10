"use client";

import { useEffect, useRef, useState } from 'react';
import { Rive } from 'rive-js';
import { shouldReduceMotion } from '@/lib/reducedMotion';

interface RiveEmbedProps {
  src: string;
  artboard?: string;
  stateMachine?: string;
  inputs?: Record<string, number | boolean>;
  className?: string;
  fallbackSvg?: string;
}

export function RiveEmbed({
  src,
  artboard,
  stateMachine,
  inputs = {},
  className = '',
  fallbackSvg,
}: RiveEmbedProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const riveRef = useRef<Rive | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [useFallback, setUseFallback] = useState(false);
  const reducedMotion = shouldReduceMotion();

  useEffect(() => {
    if (reducedMotion || useFallback) {
      if (fallbackSvg) {
        setUseFallback(true);
      }
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    // Check if canvas/WebGL is supported
    const gl = canvas.getContext('webgl') || canvas.getContext('webgl2');
    if (!gl && fallbackSvg) {
      setUseFallback(true);
      return;
    }

    // Load Rive animation
    const rive = new Rive({
      src,
      canvas,
      autoplay: true,
      artboard,
      stateMachines: stateMachine ? [stateMachine] : undefined,
      onLoad: () => {
        setIsLoaded(true);
        riveRef.current = rive;

        // Set initial inputs
        if (stateMachine && inputs) {
          Object.entries(inputs).forEach(([name, value]) => {
            rive.stateMachineInputs(stateMachine).forEach((input) => {
              if (input.name === name) {
                if (typeof value === 'boolean') {
                  input.value = value;
                } else {
                  input.value = value;
                }
              }
            });
          });
        }
      },
      onLoadError: () => {
        if (fallbackSvg) {
          setUseFallback(true);
        }
      },
    });

    // Pause when offscreen
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            rive.play();
          } else {
            rive.pause();
          }
        });
      },
      { threshold: 0 }
    );

    observer.observe(canvas);

    return () => {
      observer.disconnect();
      rive.cleanup();
    };
  }, [src, artboard, stateMachine, inputs, fallbackSvg, reducedMotion, useFallback]);

  // Expose setInput method
  const setInput = (name: string, value: number | boolean) => {
    if (!riveRef.current || !stateMachine) return;

    riveRef.current.stateMachineInputs(stateMachine).forEach((input) => {
      if (input.name === name) {
        if (typeof value === 'boolean') {
          input.value = value;
        } else {
          input.value = value;
        }
      }
    });
  };

  // Expose via ref if needed
  useEffect(() => {
    if (canvasRef.current) {
      (canvasRef.current as any).setInput = setInput;
    }
  }, [setInput]);

  if (useFallback && fallbackSvg) {
    return (
      <img
        src={fallbackSvg}
        alt=""
        className={className}
        aria-hidden="true"
      />
    );
  }

  if (reducedMotion) {
    return fallbackSvg ? (
      <img src={fallbackSvg} alt="" className={className} aria-hidden="true" />
    ) : null;
  }

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ display: isLoaded ? 'block' : 'none' }}
    />
  );
}







