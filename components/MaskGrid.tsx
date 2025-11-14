"use client";

import { useState, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import Image from 'next/image';

interface MaskGridItem {
  id: string;
  content: ReactNode;
  mask?: string; // SVG URL or mask token
  fallbackPng?: string; // PNG fallback
}

interface MaskGridProps {
  items: MaskGridItem[];
  columns?: number;
  gap?: number;
  className?: string;
}

export function MaskGrid({ items, columns = 3, gap = 4, className }: MaskGridProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Check if mask-image is supported
  const supportsMaskImage = typeof window !== 'undefined' && 
    CSS.supports('mask-image', 'url(#test)');

  return (
    <div
      className={cn('grid', className)}
      style={{
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: `${gap * 0.25}rem`,
      }}
    >
      {items.map((item) => {
        const isHovered = hoveredId === item.id;
        const maskUrl = item.mask?.startsWith('mask:') 
          ? `/masks/${item.mask.replace('mask:', '')}.svg`
          : item.mask;

        return (
          <div
            key={item.id}
            className="relative overflow-hidden group"
            onMouseEnter={() => setHoveredId(item.id)}
            onMouseLeave={() => setHoveredId(null)}
            onFocus={() => setHoveredId(item.id)}
            onBlur={() => setHoveredId(null)}
            tabIndex={0}
            style={{
              maskImage: supportsMaskImage && maskUrl ? `url(${maskUrl})` : undefined,
              WebkitMaskImage: supportsMaskImage && maskUrl ? `url(${maskUrl})` : undefined,
              clipPath: isHovered ? 'ellipse(100% 100% at 50% 50%)' : 'ellipse(0% 0% at 50% 50%)',
              transition: 'clip-path 0.3s ease-out',
            }}
          >
            {!supportsMaskImage && item.fallbackPng && (
              <Image
                src={item.fallbackPng}
                alt=""
                fill
                className="absolute inset-0 object-cover opacity-50"
                aria-hidden="true"
              />
            )}
            <div className="relative z-10">{item.content}</div>
          </div>
        );
      })}
    </div>
  );
}











