"use client";

import { useState, useEffect, useRef, useLayoutEffect, useMemo } from "react";
import { Lightbox } from "./lightbox";
import { Eye, MessageSquare } from "lucide-react";
import { MasonryImage } from "./masonry-image";
import { getVideoThumbnailUrl } from "@/lib/video-utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface MasonryGridProps {
  items: Array<{
    id: string;
    src?: string;
    storageId?: string; // Storage ID instead of URL
    videoUrl?: string; // YouTube/Vimeo URL for embedded videos
    alt?: string;
    type: "image" | "video" | "pdf";
    aspectRatio?: number;
  }>;
  onItemClick?: (index: number) => void;
  selectable?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
  onFeedbackClick?: (assetId: string) => void;
}

export function MasonryGrid({ items, onItemClick, selectable, selectedIds, onToggleSelect, onFeedbackClick }: MasonryGridProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [columnCount, setColumnCount] = useState(3);
  const [itemHeights, setItemHeights] = useState<Map<number, number>>(new Map());
  const gridRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const handleItemClick = (index: number, e?: React.MouseEvent) => {
    // If checkbox clicked, don't open lightbox
    if (e && (e.target as HTMLElement).closest('input[type="checkbox"]')) {
      return;
    }
    
    // Always open lightbox on image click
    setCurrentIndex(index);
    setLightboxOpen(true);
    onItemClick?.(index);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % items.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + items.length) % items.length);
  };

  // Calculate column count based on container width
  useLayoutEffect(() => {
    const updateColumnCount = () => {
      if (!gridRef.current) return;
      const containerWidth = gridRef.current.offsetWidth;
      const padding = 64; // px-8 = 2rem = 32px on each side
      const availableWidth = containerWidth - padding;
      const columnWidth = 600;
      const gap = 32; // gap-8 = 2rem = 32px
      
      // Calculate how many columns fit
      let cols = Math.floor((availableWidth + gap) / (columnWidth + gap));
      cols = Math.max(1, Math.min(cols, 4)); // Between 1 and 4 columns
      setColumnCount(cols);
    };

    updateColumnCount();
    window.addEventListener('resize', updateColumnCount);
    return () => window.removeEventListener('resize', updateColumnCount);
  }, []);

  // Measure item heights after images load
  useEffect(() => {
    const measureHeights = () => {
      const heights = new Map<number, number>();
      itemRefs.current.forEach((element, id) => {
        if (element) {
          const index = items.findIndex(item => item.id === id);
          if (index !== -1) {
            heights.set(index, element.offsetHeight);
          }
        }
      });
      setItemHeights(heights);
    };

    // Wait for images to load
    const images = Array.from(document.querySelectorAll('.masonry-item img'));
    let loadedCount = 0;
    
    if (images.length === 0) {
      measureHeights();
      return;
    }

    const onImageLoad = () => {
      loadedCount++;
      if (loadedCount >= images.length) {
        setTimeout(measureHeights, 100); // Small delay to ensure rendering
      }
    };

    images.forEach((img) => {
      if ((img as HTMLImageElement).complete) {
        loadedCount++;
      } else {
        img.addEventListener('load', onImageLoad, { once: true });
      }
    });

    if (loadedCount >= images.length) {
      setTimeout(measureHeights, 100);
    }

    // Also measure on initial render
    measureHeights();
  }, [items]);

  // Distribute items into balanced columns
  const distributeItems = () => {
    const columns: number[][] = Array.from({ length: columnCount }, () => []);
    const columnHeights = new Array(columnCount).fill(0);

    items.forEach((item, index) => {
      // Find the column with the shortest height
      const shortestColumn = columnHeights.indexOf(Math.min(...columnHeights));
      columns[shortestColumn].push(index);
      
      // Update column height (use actual height if available, otherwise estimate)
      const actualHeight = itemHeights.get(index);
      const itemHeight = actualHeight || (item.aspectRatio ? (600 / item.aspectRatio) : 400);
      columnHeights[shortestColumn] += itemHeight + 24; // Add gap (gap-6 = 1.5rem = 24px)
    });

    return columns;
  };

  // Memoize column distribution to recalculate when heights or column count changes
  const columns = useMemo(() => distributeItems(), [items, columnCount, itemHeights]);

  return (
    <>
      <div 
        ref={gridRef}
        className="masonry-grid w-full px-4 sm:px-6 lg:px-8 flex gap-8"
      >
        {columns.map((columnItems, colIndex) => (
          <div key={colIndex} className="flex flex-col gap-6" style={{ flex: 1, minWidth: 0 }}>
            {columnItems.map((index) => {
              const item = items[index];
              const isSelected = selectable && selectedIds?.has(item.id);
              
              return (
                <div
                  key={item.id}
                  ref={(el) => {
                    if (el) itemRefs.current.set(item.id, el);
                  }}
                  onClick={(e) => handleItemClick(index, e)}
                  className={`group relative cursor-pointer overflow-hidden bg-foreground/5 transition-all masonry-item rounded-lg border border-foreground/10 hover:border-accent/40 shadow-sm ${
                    isSelected ? "ring-2 ring-blue-500" : ""
                  }`}
                  style={{
                    width: '100%',
                  }}
                >
              {/* Floating actions */}
              <div className="absolute right-2 top-2 z-10 flex items-center gap-2">
                {selectable && (
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggleSelect?.(item.id)}
                    onClick={(e) => e.stopPropagation()}
                    className="h-5 w-5 cursor-pointer rounded border-foreground/20 bg-background/80 backdrop-blur"
                  />
                )}
                {onFeedbackClick && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onFeedbackClick(item.id);
                          }}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-background/80 border border-foreground/10 text-foreground shadow-sm hover:bg-accent hover:text-background hover:border-accent transition-colors"
                          aria-label="Give feedback"
                        >
                          <MessageSquare className="h-4 w-4" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>Open feedback for this file</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
              
              
              {item.type === "image" && (item.src || item.storageId) && (
                <>
                  <div className="relative w-full">
                    {item.storageId ? (
                      <MasonryImage
                        storageId={item.storageId}
                        alt={item.alt || `Image ${index + 1}`}
                        className="w-full h-auto block transition-all duration-300 group-hover:brightness-50 group-hover:blur-[1px]"
                      />
                    ) : (
                      <img
                        src={item.src}
                        alt={item.alt || `Image ${index + 1}`}
                        className="w-full h-auto block transition-all duration-300 group-hover:brightness-50 group-hover:blur-[1px]"
                      />
                    )}
                    <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/40 pointer-events-none" />
                    {/* Eye icon overlay - appears on hover */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100 pointer-events-none">
                      <Eye className="h-8 w-8 text-white sm:h-10 sm:w-10" />
                    </div>
                  </div>
                </>
              )}
              {item.type === "video" && (
                <>
                  {item.videoUrl ? (
                    // External video (YouTube/Vimeo) - show thumbnail
                    <>
                      {(() => {
                        const thumbnailUrl = getVideoThumbnailUrl(item.videoUrl);
                        return thumbnailUrl ? (
                          <div className="relative w-full">
                            <img
                              src={thumbnailUrl}
                              alt={item.alt || `Video ${index + 1}`}
                              className="w-full h-auto block transition-all duration-300 group-hover:brightness-50 group-hover:blur-[1px]"
                            />
                            <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/40 pointer-events-none" />
                            {/* Play button overlay - appears on hover */}
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100 pointer-events-none">
                              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                                <span className="text-2xl text-white">▶</span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="w-full aspect-video flex items-center justify-center bg-black/20">
                            <span className="text-white">Video</span>
                          </div>
                        );
                      })()}
                    </>
                  ) : (
                    // Local video file
                    <div className="relative w-full aspect-video flex items-center justify-center bg-black/20">
                      {item.src && (
                        <video
                          src={item.src}
                          className="w-full h-full object-contain opacity-0 transition-opacity group-hover:opacity-100"
                          muted
                        />
                      )}
                      <div className="absolute flex h-16 w-16 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm transition-opacity group-hover:opacity-0">
                        <span className="text-2xl text-white">▶</span>
                      </div>
                    </div>
                  )}
                </>
              )}
              {item.type === "pdf" && (
                <div className="w-full min-h-[200px] flex items-center justify-center bg-foreground/10 p-8">
                  <div className="text-center">
                    <p className="text-lg font-medium text-foreground/60">PDF</p>
                    <p className="text-sm text-foreground/40">{item.alt}</p>
                  </div>
                </div>
              )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {lightboxOpen && (
        <Lightbox
          images={items}
          currentIndex={currentIndex}
          onClose={() => setLightboxOpen(false)}
          onNext={handleNext}
          onPrev={handlePrev}
          onFeedbackClick={onFeedbackClick}
        />
      )}
    </>
  );
}

