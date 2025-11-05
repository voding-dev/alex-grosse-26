"use client";

import { X } from "lucide-react";

interface LightboxCloseButtonProps {
  onClose: () => void;
  className?: string;
}

export function LightboxCloseButton({ onClose, className = "" }: LightboxCloseButtonProps) {
  return (
    <button
      onClick={onClose}
      className={`text-white transition-opacity hover:opacity-80 ${className}`}
      aria-label="Close lightbox"
    >
      <X className="h-6 w-6 stroke-[3] sm:h-7 sm:w-7 md:h-8 md:w-8" />
    </button>
  );
}

