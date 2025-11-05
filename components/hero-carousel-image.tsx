"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState, useEffect } from "react";

interface HeroCarouselImageProps {
  storageId: string;
  alt?: string;
  className?: string;
}

export function HeroCarouselImage({ storageId, alt, className = "" }: HeroCarouselImageProps) {
  const imageUrl = useQuery(
    api.storageQueries.getUrl,
    storageId ? { storageId } : "skip"
  );

  if (!storageId || !imageUrl) {
    return null;
  }

  return (
    <img
      src={imageUrl}
      alt={alt || "Hero carousel"}
      className={`h-full w-full object-cover ${className}`}
    />
  );
}




