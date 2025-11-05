"use client";

interface LightboxFooterProps {
  currentIndex: number;
  totalImages: number;
  onPrev: () => void;
  onNext: () => void;
}

export function LightboxFooter({ currentIndex, totalImages, onPrev, onNext }: LightboxFooterProps) {
  return (
    <footer className="flex flex-col items-center justify-between gap-3 bg-accent px-4 py-3 text-xs text-white sm:flex-row sm:gap-0 sm:px-6 sm:py-4 sm:text-sm">
      <div className="order-2 sm:order-1">{currentIndex + 1} / {totalImages}</div>
      <div className="order-1 flex gap-2 sm:order-2">
        <button onClick={onPrev} className="transition-opacity hover:opacity-80">Prev</button>
        <span> / </span>
        <button onClick={onNext} className="transition-opacity hover:opacity-80">Next</button>
      </div>
      <button className="order-3 uppercase tracking-wide transition-opacity hover:opacity-80">
        Share
      </button>
    </footer>
  );
}

