"use client";

import Image from "next/image";
import { LightboxCloseButton } from "./lightbox-close-button";

interface LightboxHeaderProps {
  onClose: () => void;
}

export function LightboxHeader({ onClose }: LightboxHeaderProps) {
  return (
    <header className="relative flex items-center justify-center bg-accent px-4 py-3 sm:px-6 sm:py-4">
      {/* Close button positioned absolutely on the left */}
      <div className="absolute left-3 top-1/2 -translate-y-1/2 sm:left-4 md:left-6">
        <LightboxCloseButton onClose={onClose} />
      </div>
      {/* Centered SVG */}
      <div className="flex items-center justify-center">
        <Image
          src="/ag-wordmark-white.svg"
          alt="Alex Grosse"
          width={280}
          height={70}
          className="h-8 w-auto object-contain sm:h-10 md:h-12 lg:h-14"
        />
      </div>
    </header>
  );
}

