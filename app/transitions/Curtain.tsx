"use client";

import { useEffect, useState, ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { shouldReduceMotion } from '@/lib/reducedMotion';

interface CurtainTransitionProps {
  children: ReactNode;
}

export function CurtainTransition({ children }: CurtainTransitionProps) {
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [progress, setProgress] = useState(0);
  const pathname = usePathname();
  const router = useRouter();
  const reducedMotion = shouldReduceMotion();

  useEffect(() => {
    // Reset transition state on pathname change
    setIsTransitioning(false);
    setProgress(0);
  }, [pathname]);

  // Intercept link clicks for curtain transition
  useEffect(() => {
    if (reducedMotion) return;

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const link = target.closest('a[href]') as HTMLAnchorElement;
      
      if (!link) return;
      
      const href = link.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) {
        return;
      }

      // External links or same origin but not same route
      const isExternal = href.startsWith('http') && !href.includes(window.location.origin);
      const isSameOrigin = href.startsWith('/') || href.includes(window.location.origin);
      
      if (isExternal || !isSameOrigin) {
        return; // Let browser handle it
      }

      e.preventDefault();
      
      // Start transition
      setIsTransitioning(true);
      setProgress(0);

      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 50);

      // Prefetch route
      router.prefetch(href);

      // Navigate after curtain
      setTimeout(() => {
        router.push(href);
        setTimeout(() => {
          setIsTransitioning(false);
          setProgress(0);
        }, 300);
      }, 600);
    };

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [router, reducedMotion]);

  return (
    <>
      {children}
      {isTransitioning && !reducedMotion && (
        <div
          className="fixed inset-0 z-[99999] pointer-events-none"
          style={{
            clipPath: `polygon(0 0, ${progress}% 0, ${progress}% 100%, 0 100%)`,
            transition: 'clip-path 0.3s ease-out',
          }}
        >
          <div className="absolute inset-0 bg-background" />
          {progress > 0 && (
            <div className="absolute top-0 left-0 right-0 h-1 bg-accent/50">
              <div
                className="h-full bg-accent transition-opacity duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>
      )}
    </>
  );
}

