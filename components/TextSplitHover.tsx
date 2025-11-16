"use client";

import { useEffect, useRef, useState, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { shouldReduceMotion } from '@/lib/reducedMotion';

interface TextSplitHoverProps {
  children: string;
  className?: string;
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'span' | 'div';
}

export function TextSplitHover({ 
  children, 
  className,
  as: Component = 'span'
}: TextSplitHoverProps) {
  const [isHovered, setIsHovered] = useState(false);
  const reducedMotion = shouldReduceMotion();
  
  // Split text into letters
  const letters = children.split('').map((char, index) => {
    if (char === ' ') {
      return <span key={index} className="inline-block w-2" aria-hidden="true" />;
    }
    return (
      <span
        key={index}
        className="inline-block transition-transform duration-300 ease-out"
        style={{
          transform: isHovered && !reducedMotion 
            ? `translateY(${-8 + (index % 3) * 2}px)` 
            : 'translateY(0)',
          transitionDelay: reducedMotion ? '0ms' : `${index * 10}ms`,
        }}
        aria-hidden="true"
      >
        {char}
      </span>
    );
  });

  return (
    <Component
      className={cn('inline-block', className)}
      onMouseEnter={() => !reducedMotion && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      aria-label={children}
    >
      {letters}
    </Component>
  );
}
















