"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { LightboxHeader } from "./lightbox-header";
import { LightboxFooter } from "./lightbox-footer";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { getVideoEmbedUrl } from "@/lib/video-utils";
import { useToast } from "@/components/ui/use-toast";

interface LightboxProps {
  images: Array<{ id: string; src?: string; storageId?: string; videoUrl?: string; alt?: string; type: "image" | "video" | "pdf" }>;
  currentIndex: number;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
  onFeedbackClick?: (assetId: string) => void;
}

export function Lightbox({ images, currentIndex, onClose, onNext, onPrev, onFeedbackClick }: LightboxProps) {
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const currentImage = images[currentIndex];
  
  // Get URL for current image if it has storageId
  const currentImageUrl = useQuery(
    api.storageQueries.getUrl,
    currentImage?.storageId ? { storageId: currentImage.storageId } : "skip"
  );
  
  // Use URL from storageId or fall back to src
  const imageUrl = currentImageUrl || currentImage?.src;

  // Share handler
  const handleShare = async () => {
    const currentUrl = typeof window !== "undefined" ? window.location.href : "";
    
    // Try Web Share API first (mobile devices)
    if (navigator.share) {
      try {
        await navigator.share({
          title: currentImage?.alt || `Image ${currentIndex + 1}`,
          text: `Check out this image: ${currentImage?.alt || `Image ${currentIndex + 1}`}`,
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

  return (
    <div
      className="fixed inset-0 z-50 flex h-screen flex-col overflow-hidden bg-white"
    >
      <LightboxHeader onClose={onClose} />

      {/* Main Content Area */}
      <div className="relative flex min-h-0 flex-1 items-center justify-center bg-white">
        {/* Navigation Arrows */}
        {images.length > 1 && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPrev();
              }}
              className="absolute left-4 z-10 flex h-16 w-16 items-center justify-center rounded-full bg-white/10 backdrop-blur-sm text-black transition-opacity hover:bg-white/20 cursor-pointer"
              style={{
                transform: 'scale(1)',
                transition: 'opacity 200ms ease-out, transform 200ms ease-out',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
              }}
              onMouseDown={(e) => {
                e.currentTarget.style.transform = 'scale(0.95)';
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.transform = 'scale(1.1)';
              }}
              aria-label="Previous image"
            >
              <ChevronLeft className="h-8 w-8" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onNext();
              }}
              className="absolute right-4 z-10 flex h-16 w-16 items-center justify-center rounded-full bg-white/10 backdrop-blur-sm text-black transition-opacity hover:bg-white/20 cursor-pointer"
              style={{
                transform: 'scale(1)',
                transition: 'opacity 200ms ease-out, transform 200ms ease-out',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
              }}
              onMouseDown={(e) => {
                e.currentTarget.style.transform = 'scale(0.95)';
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.transform = 'scale(1.1)';
              }}
              aria-label="Next image"
            >
              <ChevronRight className="h-8 w-8" />
            </button>
          </>
        )}

        {/* Content */}
        <div className="flex h-full w-full min-h-0 items-center justify-center p-4 sm:p-8 md:p-12 lg:p-16 xl:p-20">
          {currentImage.type === "image" && imageUrl && (
            <img
              src={imageUrl}
              alt={currentImage.alt || `Image ${currentIndex + 1}`}
              className="max-h-full max-w-full object-contain"
              onLoad={() => setIsLoading(false)}
            />
          )}
          {currentImage.type === "video" && (
            <>
              {currentImage.videoUrl ? (
                // External video (YouTube/Vimeo) - use iframe embed
                <div className="w-full max-w-[95vw] aspect-video" style={{ maxHeight: '85vh', height: 'min(calc(95vw * 9/16), 85vh)' }}>
                  {(() => {
                    const embedUrl = getVideoEmbedUrl(currentImage.videoUrl);
                    return embedUrl ? (
                      <iframe
                        src={embedUrl}
                        className="h-full w-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        onLoad={() => setIsLoading(false)}
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-black/10">
                        <p className="text-foreground/60">Invalid video URL</p>
                      </div>
                    );
                  })()}
                </div>
              ) : (
                // Local video file
                imageUrl && (
                  <div className="w-full max-w-[95vw] aspect-video" style={{ maxHeight: '85vh', height: 'min(calc(95vw * 9/16), 85vh)' }}>
                    <video
                      src={imageUrl}
                      controls
                      className="h-full w-full object-contain"
                      autoPlay
                      onLoadedData={() => setIsLoading(false)}
                    />
                  </div>
                )
              )}
            </>
          )}
          {currentImage.type === "pdf" && (
            <div className="flex h-full w-full max-w-full items-center justify-center bg-white">
              <p className="text-foreground/60">PDF preview coming soon</p>
            </div>
          )}
        </div>
      </div>

      <LightboxFooter 
        currentIndex={currentIndex} 
        totalImages={images.length} 
        onPrev={onPrev} 
        onNext={onNext}
        onFeedbackClick={onFeedbackClick && currentImage ? () => onFeedbackClick(currentImage.id) : undefined}
        onShareClick={handleShare}
      />
    </div>
  );
}


