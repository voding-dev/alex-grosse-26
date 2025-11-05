"use client";

import { useEffect, useRef } from 'react';
import { shouldReduceMotion } from '@/lib/reducedMotion';

interface CursorFluidProps {
  enabled?: boolean;
}

export function CursorFluid({ enabled = true }: CursorFluidProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();

  useEffect(() => {
    // Disable on reduced motion or touch devices
    if (!enabled || shouldReduceMotion() || 'ontouchstart' in window) {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    // Set canvas size
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // Mouse trail
    const trail: Array<{ x: number; y: number; life: number }> = [];
    const maxTrailLength = 20;
    let mouseX = 0;
    let mouseY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    };

    window.addEventListener('mousemove', handleMouseMove);

    // Animation loop
    function animate() {
      if (!ctx) return;

      // Clear with alpha for trail effect
      ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Add new point
      trail.push({ x: mouseX, y: mouseY, life: 1 });

      // Remove old points
      if (trail.length > maxTrailLength) {
        trail.shift();
      }

      // Draw trail
      trail.forEach((point, index) => {
        const alpha = point.life * (index / trail.length);
        const size = 10 * alpha;

        ctx.beginPath();
        ctx.arc(point.x, point.y, size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 166, 23, ${alpha * 0.3})`;
        ctx.fill();

        // Decay life
        point.life *= 0.95;
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    }

    animate();

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [enabled]);

  // Don't render if disabled
  if (!enabled || shouldReduceMotion() || 'ontouchstart' in window) {
    return null;
  }

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-[9999] mix-blend-difference"
      style={{ opacity: 0.5 }}
    />
  );
}

