"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export function LoadingPage() {
  const [isVisible, setIsVisible] = useState(false);
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith('/admin') ?? false;

  useEffect(() => {
    // Trigger animation after mount for smooth transition
    const timer = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(timer);
  }, []);

  // Background color: dark for admin, yellow/accent for site
  const bgColor = isAdmin ? 'bg-background' : 'bg-accent';

  return (
    <div 
      className={`flex min-h-screen items-center justify-center ${bgColor} transition-opacity duration-500 ease-out`} 
      style={{ opacity: isVisible ? 1 : 0 }}
    >
      <div 
        className="text-center transition-opacity duration-700 ease-out"
        style={{
          opacity: isVisible ? 1 : 0,
          transform: isVisible ? 'translateY(0)' : 'translateY(12px)',
          transition: 'opacity 700ms ease-out, transform 700ms ease-out',
          transitionDelay: '200ms'
        }}
      >
        <div 
          className="mb-4 flex items-center justify-center transition-opacity duration-500 ease-out"
          style={{
            opacity: isVisible ? 1 : 0,
            transitionDelay: '300ms'
          }}
        >
          <Image
            src="/smallbrandmark-alexgrosse-white.svg"
            alt="Alex Grosse"
            width={32}
            height={32}
            className="h-8 w-8 object-contain"
            style={{
              animation: 'pulseOpacity 2s ease-in-out infinite',
            }}
          />
        </div>
        <p 
          className={`${isAdmin ? 'text-foreground/60' : 'text-white/80'} uppercase tracking-wider text-sm font-medium transition-opacity duration-500 ease-out`}
          style={{
            opacity: isVisible ? 1 : 0,
            transitionDelay: '400ms',
          }}
        >
          Loading<span className="inline-block" style={{ animation: 'pulseDots 1.5s ease-in-out infinite 0.2s' }}>.</span><span className="inline-block" style={{ animation: 'pulseDots 1.5s ease-in-out infinite 0.4s' }}>.</span><span className="inline-block" style={{ animation: 'pulseDots 1.5s ease-in-out infinite 0.6s' }}>.</span>
        </p>
      </div>
    </div>
  );
}
