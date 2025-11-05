"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Video } from "lucide-react";

interface MediaThumbnailProps {
  media: {
    _id: Id<"mediaLibrary"> | string; // Can be prefixed with "asset_" for assets
    storageKey: string;
    type: "image" | "video";
    filename: string;
    alt?: string;
  };
  className?: string;
}

export function MediaThumbnail({ media, className = "" }: MediaThumbnailProps) {
  // Skip invalid storage keys (seed data, mock data, etc.)
  const isValidStorageKey = media.storageKey && 
    !media.storageKey.startsWith("seed-") && 
    !media.storageKey.startsWith("mock-") &&
    !media.storageKey.includes("seed-storage") &&
    media.storageKey.length > 0;

  const imageUrl = useQuery(
    api.storageQueries.getUrl,
    isValidStorageKey ? { storageId: media.storageKey } : "skip"
  );

  if (media.type === "image" && imageUrl) {
    return (
      <div className={`aspect-square relative bg-black/5 overflow-hidden ${className}`}>
        <img
          src={imageUrl}
          alt={media.alt || media.filename}
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  // Video placeholder
  return (
    <div className={`aspect-square bg-black/5 flex items-center justify-center ${className}`}>
      <Video className="h-12 w-12 text-foreground/40" />
    </div>
  );
}

