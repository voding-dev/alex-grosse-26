"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { MessageSquare, Download, CheckCircle, Eye } from "lucide-react";
import { StorageImage } from "@/components/storage-image";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";

interface DeliveryGridItem {
  id: string;
  storageId: string;
  filename?: string;
  type?: string;
  hasFeedback?: boolean;
  isApproved?: boolean;
  feedbackCount?: number;
}

interface DeliveryGridProps {
  items: DeliveryGridItem[];
  selectable?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
  onItemClick?: (index: number) => void;
  onFeedbackClick?: (assetId: string) => void;
  onDownloadClick?: (assetId: string) => void;
  showFeedbackStatus?: boolean;
}

export function DeliveryGrid({
  items,
  selectable = false,
  selectedIds,
  onToggleSelect,
  onItemClick,
  onFeedbackClick,
  onDownloadClick,
  showFeedbackStatus = false,
}: DeliveryGridProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [touchedId, setTouchedId] = useState<string | null>(null);

  // Close buttons when clicking outside on mobile
  useEffect(() => {
    if (!touchedId) return;

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement;
      // Don't close if clicking on buttons or within the card
      if (
        target.closest('[data-feedback-button]') || 
        target.closest('[data-download-button]') || 
        target.closest('.group') ||
        target.tagName === 'BUTTON'
      ) {
        return;
      }
      setTouchedId(null);
    };

    // Use a small delay to avoid closing immediately after opening
    const timeout = setTimeout(() => {
      document.addEventListener('click', handleClickOutside, true);
      document.addEventListener('touchstart', handleClickOutside, true);
    }, 100);

    return () => {
      clearTimeout(timeout);
      document.removeEventListener('click', handleClickOutside, true);
      document.removeEventListener('touchstart', handleClickOutside, true);
    };
  }, [touchedId]);

  const handleItemClick = (index: number, e: React.MouseEvent) => {
    // If checkbox clicked, don't open lightbox
    if ((e.target as HTMLElement).closest('input[type="checkbox"]')) {
      return;
    }
    // If feedback button clicked, don't open lightbox
    if ((e.target as HTMLElement).closest('[data-feedback-button]')) {
      return;
    }
    // If download button clicked, don't open lightbox
    if ((e.target as HTMLElement).closest('[data-download-button]')) {
      return;
    }
    onItemClick?.(index);
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-6">
      {items.map((item, index) => {
        const isSelected = selectable && selectedIds?.has(item.id);
        const isHovered = hoveredId === item.id;
        const isTouched = touchedId === item.id;

        return (
          <Card
            key={item.id}
            className={`group relative overflow-hidden cursor-pointer rounded-xl border-2 bg-background shadow-lg hover:shadow-xl transition-all ${
              isSelected ? "ring-2 ring-accent border-accent shadow-accent/20" : "border-foreground/20 hover:border-foreground/40"
            }`}
            onMouseEnter={() => {
              setHoveredId(item.id);
              setTouchedId(null); // Clear touch state on hover
            }}
            onMouseLeave={() => {
              setHoveredId(null);
            }}
            onTouchStart={(e) => {
              // Show buttons on touch (mobile)
              if (touchedId !== item.id) {
                setTouchedId(item.id);
              }
            }}
            onClick={(e) => {
              // If buttons are showing, clicking again opens lightbox
              if (touchedId === item.id) {
                setTouchedId(null);
                handleItemClick(index, e);
              } else if (!isHovered) {
                // On mobile, first tap shows buttons
                setTouchedId(item.id);
                e.stopPropagation();
              } else {
                // On desktop with hover, click opens lightbox
                handleItemClick(index, e);
              }
            }}
          >
            <div className="aspect-square relative bg-foreground/5">
              <StorageImage
                storageId={item.storageId}
                alt={item.filename || `Asset ${index + 1}`}
                className="w-full h-full object-cover"
              />
              
              {/* Status Badges */}
              {showFeedbackStatus && (
                <div className="absolute top-2 right-2 z-10 flex flex-col gap-1.5">
                  {item.isApproved && (
                    <Badge className="bg-green-500/20 text-green-600 border-green-500/30 text-xs font-black uppercase tracking-wider px-2 py-0.5" style={{ fontWeight: '900' }}>
                      <CheckCircle className="h-3 w-3 mr-1" />
                      APPROVED
                    </Badge>
                  )}
                  {item.hasFeedback && !item.isApproved && (
                    <Badge className="bg-accent/20 text-accent border-accent/30 text-xs font-black uppercase tracking-wider px-2 py-0.5" style={{ fontWeight: '900' }}>
                      <MessageSquare className="h-3 w-3 mr-1" />
                      {item.feedbackCount || 1} {item.feedbackCount === 1 ? 'FEEDBACK' : 'FEEDBACK'}
                    </Badge>
                  )}
                </div>
              )}
              
              {/* Overlay on hover (desktop) or tap (mobile) */}
              {(isHovered || isTouched) && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center gap-3 transition-opacity md:group-hover:flex">
                  {showFeedbackStatus && item.hasFeedback ? (
                    <Button
                      data-feedback-button
                      size="sm"
                      className="h-10 px-4 rounded-full bg-accent text-background hover:bg-accent/90 font-black uppercase tracking-wider text-xs shadow-lg transition-all hover:scale-105"
                      style={{ backgroundColor: '#586034', fontWeight: '900' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onFeedbackClick?.(item.id);
                      }}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Feedback
                    </Button>
                  ) : (
                    <>
                      <Button
                        data-feedback-button
                        size="sm"
                        className="h-10 px-4 rounded-full bg-accent text-background hover:bg-accent/90 font-black uppercase tracking-wider text-xs shadow-lg transition-all hover:scale-105"
                        style={{ backgroundColor: '#586034', fontWeight: '900' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onFeedbackClick?.(item.id);
                        }}
                      >
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Feedback
                      </Button>
                      
                      <Button
                        data-download-button
                        size="sm"
                        className="h-10 px-4 rounded-full bg-background text-foreground border-2 border-foreground/30 hover:bg-foreground hover:text-background font-black uppercase tracking-wider text-xs shadow-lg transition-all hover:scale-105"
                        style={{ fontWeight: '900' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onDownloadClick?.(item.id);
                        }}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                    </>
                  )}
                </div>
              )}

              {/* Selection checkbox */}
              {selectable && (
                <div
                  className="absolute top-2 left-2 z-10"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => onToggleSelect?.(item.id)}
                    className="bg-background/95 border-2 border-foreground/40 hover:border-accent data-[state=checked]:bg-accent data-[state=checked]:border-accent shadow-lg"
                  />
                </div>
              )}

            </div>

            {/* Filename */}
            {item.filename && (
              <div className="p-3">
                <p className="text-xs font-medium text-foreground/80 truncate">
                  {item.filename}
                </p>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
