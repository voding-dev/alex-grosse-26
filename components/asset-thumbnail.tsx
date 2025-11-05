"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Video, FileText, ImageIcon } from "lucide-react";
import { getVideoThumbnailUrl } from "@/lib/video-utils";

interface AssetThumbnailProps {
  asset: {
    _id: Id<"assets">;
    storageKey: string;
    videoUrl?: string;
    type: "image" | "video" | "pdf" | "other";
    filename: string;
  };
  className?: string;
}

export function AssetThumbnail({ asset, className = "" }: AssetThumbnailProps) {
  const imageUrl = useQuery(
    api.storageQueries.getUrl,
    asset.storageKey && asset.storageKey.trim() !== "" ? { storageId: asset.storageKey } : "skip"
  );

  if (asset.type === "image" && imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={asset.filename}
        className={className}
      />
    );
  }

  if (asset.type === "video") {
    // If it's an external video (YouTube/Vimeo), show thumbnail
    if (asset.videoUrl) {
      const thumbnailUrl = getVideoThumbnailUrl(asset.videoUrl);
      if (thumbnailUrl) {
        return (
          <div className={`relative ${className}`}>
            <img
              src={thumbnailUrl}
              alt={asset.filename}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <Video className="h-8 w-8 text-white" />
            </div>
          </div>
        );
      }
    }
    
    // Local video or no thumbnail available
    return (
      <div className={`bg-black flex items-center justify-center ${className}`}>
        <Video className="h-12 w-12 text-white/60" />
      </div>
    );
  }

  return (
    <div className={`bg-black flex items-center justify-center ${className}`}>
      <FileText className="h-12 w-12 text-white/60" />
    </div>
  );
}

