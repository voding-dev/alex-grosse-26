/**
 * Reduced motion utilities
 * All animations should respect prefers-reduced-motion
 */

import React from 'react';

/**
 * Check if reduced motion is preferred
 */
export function shouldReduceMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Get animation duration based on reduced motion preference
 */
export function getAnimationDuration(defaultDuration: number): number {
  return shouldReduceMotion() ? 0 : defaultDuration;
}

/**
 * Get CSS transition that respects reduced motion
 */
export function getTransition(property: string, duration: number = 300, easing: string = 'ease'): string {
  if (shouldReduceMotion()) {
    return `${property} 0s`;
  }
  return `${property} ${duration}ms ${easing}`;
}

/**
 * Hook to detect reduced motion preference changes
 */
export function useReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  
  const [reduced, setReduced] = React.useState(() => shouldReduceMotion());
  
  React.useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    
    function handleChange() {
      setReduced(mediaQuery.matches);
    }
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);
  
  return reduced;
}

