"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { getVideoThumbnailUrl } from "@/lib/video-utils";

interface CarouselItemProps {
  item: {
    _id: string;
    type: "image" | "video" | "pdf" | "other";
    videoUrl?: string;
    previewKey?: string;
    storageKey: string;
  };
  isActive: boolean;
}

function CarouselItem({ item, isActive }: CarouselItemProps) {
  const storageId = item.videoUrl ? undefined : (item.previewKey || item.storageKey);
  // Fetch URL even when not active for smoother transitions (preloading)
  const imageUrl = useQuery(
    api.storageQueries.getUrl,
    storageId ? { storageId } : "skip"
  );

  let itemUrl: string | null = null;
  
  if (item.type === "video" && item.videoUrl) {
    itemUrl = getVideoThumbnailUrl(item.videoUrl);
  } else if (item.type === "image" && imageUrl) {
    itemUrl = imageUrl;
  }

  if (!itemUrl) return null;

  return (
    <div
      className={`absolute inset-0 transition-opacity duration-1000 ${
        isActive ? "opacity-100" : "opacity-0"
      }`}
    >
      <img
        src={itemUrl}
        alt="Media carousel"
        className="h-full w-full object-cover"
      />
    </div>
  );
}

interface ProjectCardCarouselProps {
  projectId: string;
  isPortfolio?: boolean;
  className?: string;
  isHovering?: boolean;
}

export function ProjectCardCarousel({ projectId, isPortfolio = false, className = "", isHovering: externalIsHovering }: ProjectCardCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [internalIsHovering, setInternalIsHovering] = useState(false);
  
  // Use external hover state if provided, otherwise use internal
  const isHovering = externalIsHovering !== undefined ? externalIsHovering : internalIsHovering;

  // Fetch all assets for this project/portfolio
  const assets = useQuery(
    isPortfolio 
      ? api.assets.listPortfolio 
      : api.assets.listProject,
    projectId 
      ? (isPortfolio ? { portfolioId: projectId as Id<"portfolio"> } : { projectId: projectId as Id<"projects"> })
      : "skip"
  );

  // Filter to only images and videos (for carousel)
  const mediaItems = useMemo(() => {
    return (assets || []).filter(asset => 
      asset.type === "image" || (asset.type === "video" && asset.videoUrl)
    );
  }, [assets]);

  // Fast carousel when hovering (changes every 1500ms for smooth fade)
  useEffect(() => {
    if (!isHovering || mediaItems.length === 0 || mediaItems.length === 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % mediaItems.length);
    }, 1500); // Fast but allows smooth 1000ms fade transition

    return () => clearInterval(interval);
  }, [isHovering, mediaItems.length]);

  // Reset to first image when hover ends
  useEffect(() => {
    if (!isHovering) {
      setCurrentIndex(0);
    }
  }, [isHovering]);

  const handleMouseEnter = () => {
    setInternalIsHovering(true);
  };

  const handleMouseLeave = () => {
    setInternalIsHovering(false);
    setCurrentIndex(0);
  };

  if (mediaItems.length === 0) {
    return null;
  }

  return (
    <div
      className={`absolute inset-0 ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {mediaItems.map((item, idx) => (
        <CarouselItem
          key={item._id}
          item={item}
          isActive={idx === currentIndex}
        />
      ))}
    </div>
  );
}

