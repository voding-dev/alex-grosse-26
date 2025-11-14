"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

interface MasonryImageProps {
  storageId?: string;
  alt?: string;
  className?: string;
}

export function MasonryImage({ storageId, alt, className = "" }: MasonryImageProps) {
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
      alt={alt || "Image"}
      className={className}
    />
  );
}













