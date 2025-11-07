"use client";

import { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { LightboxHeader } from "./lightbox-header";
import { LightboxFooter } from "./lightbox-footer";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { getVideoEmbedUrl } from "@/lib/video-utils";
import { useToast } from "@/components/ui/use-toast";

// Unified image interface that supports both data structures
export type LightboxImage = 
  | { 
      id: string; 
      src?: string; 
      storageId?: string; 
      videoUrl?: string; 
      alt?: string; 
      type?: "image" | "video" | "pdf";
    }
  | { 
      _id: string; 
      imageStorageId: string; 
      alt?: string;
    };

interface LightboxProps {
  images: Array<LightboxImage>;
  currentIndex: number;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
  onFeedbackClick?: (assetId: string) => void;
}

// Helper function to normalize image data
function normalizeImage(image: LightboxImage) {
  // Check if it's the new format (id, storageId)
  if ('id' in image) {
    return {
      id: image.id,
      storageId: image.storageId,
      src: image.src,
      videoUrl: image.videoUrl,
      alt: image.alt,
      type: image.type || 'image' as const,
    };
  }
  // Old format (_id, imageStorageId) - convert to new format
  return {
    id: image._id,
    storageId: image.imageStorageId,
    src: undefined,
    videoUrl: undefined,
    alt: image.alt,
    type: 'image' as const,
  };
}

// Helper component for rendering each slide item
function LightboxSlide({ 
  image, 
  index, 
  isCurrent, 
  onLoad 
}: { 
  image: LightboxImage; 
  index: number; 
  isCurrent: boolean;
  onLoad: () => void;
}) {
  const normalized = normalizeImage(image);
  const imageUrlQuery = useQuery(
    api.storageQueries.getUrl,
    normalized.storageId ? { storageId: normalized.storageId } : "skip"
  );
  const imageUrl = imageUrlQuery || normalized.src;

  return (
    <div className="flex h-full w-full min-w-full items-center justify-center p-4 sm:p-8 md:p-12 lg:p-16 xl:p-20">
      {normalized.type === "image" && imageUrl && (
        <img
          src={imageUrl}
          alt={normalized.alt || `Image ${index + 1}`}
          className="max-h-full max-w-full object-contain select-none"
          draggable={false}
          onLoad={onLoad}
        />
      )}
      {normalized.type === "video" && (
        <>
          {normalized.videoUrl ? (
            // External video (YouTube/Vimeo) - use iframe embed
            <div className="w-full max-w-[95vw] aspect-video" style={{ maxHeight: '85vh', height: 'min(calc(95vw * 9/16), 85vh)' }}>
              {(() => {
                const embedUrl = getVideoEmbedUrl(normalized.videoUrl);
                return embedUrl ? (
                  <iframe
                    src={embedUrl}
                    className="h-full w-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    onLoad={onLoad}
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
                  autoPlay={isCurrent}
                  onLoadedData={onLoad}
                />
              </div>
            )
          )}
        </>
      )}
      {normalized.type === "pdf" && (
        <div className="flex h-full w-full max-w-full items-center justify-center bg-white">
          <p className="text-foreground/60">PDF preview coming soon</p>
        </div>
      )}
    </div>
  );
}

export function Lightbox({ images, currentIndex, onClose, onNext, onPrev, onFeedbackClick }: LightboxProps) {
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const currentImage = images[currentIndex];
  const normalizedCurrent = currentImage ? normalizeImage(currentImage) : null;
  
  // Swipe/drag state
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [visualIndex, setVisualIndex] = useState(currentIndex);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Get URL for current image if it has storageId
  const currentImageUrl = useQuery(
    api.storageQueries.getUrl,
    normalizedCurrent?.storageId ? { storageId: normalizedCurrent.storageId } : "skip"
  );
  
  // Use URL from storageId or fall back to src
  const imageUrl = currentImageUrl || normalizedCurrent?.src;

  // Share handler
  const handleShare = async () => {
    const currentUrl = typeof window !== "undefined" ? window.location.href : "";
    
    // Try Web Share API first (mobile devices)
    if (navigator.share) {
      try {
        await navigator.share({
          title: normalizedCurrent?.alt || `Image ${currentIndex + 1}`,
          text: `Check out this image: ${normalizedCurrent?.alt || `Image ${currentIndex + 1}`}`,
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

  // Initialize visual index on mount
  useEffect(() => {
    setVisualIndex(currentIndex);
  }, []);

  // Sync visual index with current index
  useEffect(() => {
    if (!isDragging) {
      if (visualIndex !== currentIndex) {
        // Animate to new index
        setIsTransitioning(true);
        setVisualIndex(currentIndex);
        setDragOffset(0);
        const timer = setTimeout(() => {
          setIsTransitioning(false);
        }, 400);
        return () => clearTimeout(timer);
      }
    }
  }, [currentIndex, isDragging, visualIndex]);

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

  // Swipe handlers
  const getClientX = (e: TouchEvent | MouseEvent): number => {
    return 'touches' in e ? e.touches[0].clientX : e.clientX;
  };

  const handleStart = (e: React.TouchEvent | React.MouseEvent) => {
    if (images.length <= 1) return;
    const clientX = getClientX(e.nativeEvent);
    setIsDragging(true);
    setDragStartX(clientX);
    setDragOffset(0);
    setIsTransitioning(false);
  };

  const handleMove = (e: TouchEvent | MouseEvent) => {
    if (!isDragging || images.length <= 1) return;
    const clientX = getClientX(e);
    const deltaX = clientX - dragStartX;
    setDragOffset(deltaX);
  };

  const handleEnd = () => {
    if (!isDragging || images.length <= 1) return;
    
    const threshold = 50; // Minimum swipe distance in pixels
    const swipeThreshold = containerRef.current 
      ? containerRef.current.clientWidth * 0.15 
      : 100; // 15% of container width
    
    if (Math.abs(dragOffset) > Math.max(threshold, swipeThreshold)) {
      // Capture dragOffset value before state changes
      const offset = dragOffset;
      
      // Calculate target index
      const targetIndex = offset > 0 
        ? (currentIndex - 1 + images.length) % images.length
        : (currentIndex + 1) % images.length;
      
      // Enable transition and update visual index
      setIsTransitioning(true);
      setIsDragging(false);
      
      // Animate visual index smoothly
      setVisualIndex(targetIndex);
      setDragOffset(0);
      
      // Update actual index after a brief delay to ensure smooth animation
      requestAnimationFrame(() => {
        if (offset > 0) {
          onPrev();
        } else {
          onNext();
        }
      });
    } else {
      // Swipe wasn't far enough, smoothly return to current position
      setIsTransitioning(true);
      setIsDragging(false);
      // Animate dragOffset back to 0 smoothly
      requestAnimationFrame(() => {
        setDragOffset(0);
        setTimeout(() => {
          setIsTransitioning(false);
        }, 400);
      });
    }
  };

  // Global mouse/touch move handlers
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => handleMove(e);
    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault(); // Prevent scrolling
      handleMove(e);
    };
    const handleMouseUp = () => handleEnd();
    const handleTouchEnd = () => handleEnd();

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchend', handleTouchEnd);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging, dragStartX, dragOffset, onNext, onPrev, images.length]);

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

        {/* Content - Swipeable Container */}
        <div 
          ref={containerRef}
          className="relative flex h-full w-full min-h-0 overflow-hidden"
          onMouseDown={handleStart}
          onTouchStart={handleStart}
          style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        >
          <div
            className="flex h-full w-full"
            style={{
              transform: `translateX(calc(-${visualIndex * 100}% + ${dragOffset}px))`,
              transition: isTransitioning && !isDragging ? 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)' : 'none',
            }}
          >
            {images.map((image, index) => {
              const normalized = normalizeImage(image);
              return (
                <LightboxSlide
                  key={normalized.id}
                  image={image}
                  index={index}
                  isCurrent={index === currentIndex}
                  onLoad={() => {
                    if (index === currentIndex) setIsLoading(false);
                  }}
                />
              );
            })}
          </div>
        </div>
      </div>

      <LightboxFooter 
        currentIndex={currentIndex} 
        totalImages={images.length} 
        onPrev={onPrev} 
        onNext={onNext}
        onFeedbackClick={onFeedbackClick && normalizedCurrent ? () => onFeedbackClick(normalizedCurrent.id) : undefined}
        onShareClick={handleShare}
      />
    </div>
  );
}


