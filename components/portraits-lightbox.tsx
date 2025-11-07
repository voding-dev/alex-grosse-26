"use client";

import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { LightboxHeader } from "./lightbox-header";
import { LightboxFooter } from "./lightbox-footer";
import { useToast } from "@/components/ui/use-toast";

interface PortraitsLightboxProps {
  galleryImages: Array<{
    _id: string;
    imageStorageId: string;
    alt?: string;
  }>;
  currentIndex: number;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
}

export function PortraitsLightbox({ galleryImages, currentIndex, onClose, onNext, onPrev }: PortraitsLightboxProps) {
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const currentImage = galleryImages[currentIndex];

  // Handle ESC key and arrow keys globally
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopImmediatePropagation(); // Prevent other ESC handlers from firing
        onClose();
      } else if (e.key === "ArrowLeft") {
        onPrev();
      } else if (e.key === "ArrowRight") {
        onNext();
      }
    };

    // Use capture phase to ensure this handler runs first
    window.addEventListener("keydown", handleKeyDown, true);
    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [onClose, onNext, onPrev]);

  if (!currentImage) return null;

  // Fetch URL for the current image
  const currentImageUrl = useQuery(
    api.storageQueries.getUrl,
    currentImage?.imageStorageId ? { storageId: currentImage.imageStorageId } : "skip"
  );

  // Fetch URLs for adjacent images (for preloading)
  const prevImage = galleryImages[(currentIndex - 1 + galleryImages.length) % galleryImages.length];
  const nextImage = galleryImages[(currentIndex + 1) % galleryImages.length];
  
  const prevImageUrl = useQuery(
    api.storageQueries.getUrl,
    prevImage?.imageStorageId ? { storageId: prevImage.imageStorageId } : "skip"
  );
  
  const nextImageUrl = useQuery(
    api.storageQueries.getUrl,
    nextImage?.imageStorageId ? { storageId: nextImage.imageStorageId } : "skip"
  );

  const imageSrc = currentImageUrl;

  // Share handler
  const handleShare = async () => {
    const currentUrl = typeof window !== "undefined" ? window.location.href : "";
    
    // Try Web Share API first (mobile devices)
    if (navigator.share) {
      try {
        await navigator.share({
          title: currentImage?.alt || `Portrait ${currentIndex + 1}`,
          text: `Check out this portrait: ${currentImage?.alt || `Portrait ${currentIndex + 1}`}`,
          url: currentUrl,
        });
        return;
      } catch (err) {
        // User cancelled or error occurred, fall through to clipboard
        if ((err as Error).name !== "AbortError") {
          console.error("Error sharing:", err);
        }
      }
    }
    
    // Fallback to clipboard
    try {
      await navigator.clipboard.writeText(currentUrl);
      toast({
        title: "Link copied",
        description: "Share link copied to clipboard",
      });
    } catch (err) {
      console.error("Failed to copy to clipboard:", err);
      toast({
        title: "Error",
        description: "Failed to copy link. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex h-screen flex-col overflow-hidden bg-white"
    >
      <LightboxHeader onClose={onClose} />

      {/* Main Content Area */}
      <div className="relative flex min-h-0 flex-1 items-center justify-center bg-white">
        {/* Navigation Arrows */}
        {galleryImages.length > 1 && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPrev();
              }}
              className="absolute left-2 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 backdrop-blur-sm text-black transition-all hover:bg-white/20 hover:scale-110 active:scale-95 cursor-pointer sm:left-4 sm:h-12 sm:w-12 md:h-16 md:w-16"
              aria-label="Previous image"
            >
              <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6 md:h-8 md:w-8" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onNext();
              }}
              className="absolute right-2 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 backdrop-blur-sm text-black transition-all hover:bg-white/20 hover:scale-110 active:scale-95 cursor-pointer sm:right-4 sm:h-12 sm:w-12 md:h-16 md:w-16"
              aria-label="Next image"
            >
              <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6 md:h-8 md:w-8" />
            </button>
          </>
        )}

        {/* Content */}
        <div className="flex h-full w-full min-h-0 items-center justify-center p-4 sm:p-8 md:p-12 lg:p-16 xl:p-20">
          {imageSrc && (
            <img
              src={imageSrc}
              alt={currentImage.alt || `Portrait ${currentIndex + 1}`}
              className="max-h-full max-w-full object-contain"
              onLoad={() => setIsLoading(false)}
            />
          )}
        </div>
      </div>

      <LightboxFooter 
        currentIndex={currentIndex} 
        totalImages={galleryImages.length} 
        onPrev={onPrev} 
        onNext={onNext}
        onShareClick={handleShare}
      />
    </div>
  );
}
