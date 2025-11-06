"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

interface StorageImageProps {
  storageId: string;
  alt: string;
  className?: string;
}

export function StorageImage({ storageId, alt, className = "" }: StorageImageProps) {
  const imageUrl = useQuery(
    api.storageQueries.getUrl,
    storageId ? { storageId } : "skip"
  );

  if (!storageId || !imageUrl) {
    return (
      <div className={`w-full h-full bg-foreground/5 flex items-center justify-center ${className}`}>
        <div className="text-xs text-foreground/40">Loading...</div>
      </div>
    );
  }

  return (
    <img
      src={imageUrl}
      alt={alt}
      className={className}
    />
  );
}

