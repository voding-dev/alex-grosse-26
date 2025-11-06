"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { MessageSquare, Download } from "lucide-react";
import { StorageImage } from "@/components/storage-image";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface DeliveryGridItem {
  id: string;
  storageId: string;
  filename?: string;
  type?: string;
}

interface DeliveryGridProps {
  items: DeliveryGridItem[];
  selectable?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
  onItemClick?: (index: number) => void;
  onFeedbackClick?: (assetId: string) => void;
  onDownloadClick?: (assetId: string) => void;
}

export function DeliveryGrid({
  items,
  selectable = false,
  selectedIds,
  onToggleSelect,
  onItemClick,
  onFeedbackClick,
  onDownloadClick,
}: DeliveryGridProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

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

        return (
          <Card
            key={item.id}
            className={`group relative overflow-hidden cursor-pointer rounded-xl border bg-background shadow-sm hover:shadow-md transition-all ${
              isSelected ? "ring-2 ring-blue-500 border-blue-500" : "border-foreground/20"
            }`}
            onMouseEnter={() => setHoveredId(item.id)}
            onMouseLeave={() => setHoveredId(null)}
            onClick={(e) => handleItemClick(index, e)}
          >
            <div className="aspect-square relative bg-foreground/5">
              <StorageImage
                storageId={item.storageId}
                alt={item.filename || `Asset ${index + 1}`}
                className="w-full h-full object-cover"
              />
              
              {/* Overlay on hover */}
              {isHovered && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center gap-2 transition-opacity">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          data-feedback-button
                          variant="secondary"
                          size="sm"
                          className="h-9 w-9 p-0 rounded-full bg-white/90 hover:bg-white"
                          onClick={(e) => {
                            e.stopPropagation();
                            onFeedbackClick?.(item.id);
                          }}
                        >
                          <MessageSquare className="h-4 w-4 text-foreground" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Leave feedback</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          data-download-button
                          variant="secondary"
                          size="sm"
                          className="h-9 w-9 p-0 rounded-full bg-white/90 hover:bg-white"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDownloadClick?.(item.id);
                          }}
                        >
                          <Download className="h-4 w-4 text-foreground" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Download</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
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
                    className="bg-white/90 border-foreground/20"
                  />
                </div>
              )}

              {/* Feedback icon overlay (always visible, subtle) */}
              {!isHovered && (
                <div className="absolute top-2 right-2 z-10">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          data-feedback-button
                          className="h-8 w-8 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-sm flex items-center justify-center transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            onFeedbackClick?.(item.id);
                          }}
                        >
                          <MessageSquare className="h-4 w-4 text-white" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Leave feedback</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
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
