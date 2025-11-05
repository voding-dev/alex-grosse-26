"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Eye } from "lucide-react";

interface PortraitsGalleryImageProps {
  storageId: string;
  alt?: string;
  aspectRatio?: number;
  onClick: () => void;
}

export function PortraitsGalleryImage({ storageId, alt, aspectRatio, onClick }: PortraitsGalleryImageProps) {
  const imageUrl = useQuery(
    api.storageQueries.getUrl,
    storageId ? { storageId } : "skip"
  );

  if (!storageId || !imageUrl) {
    return null;
  }

  return (
    <div
      className="group relative cursor-pointer overflow-hidden bg-black w-full h-full"
      onClick={onClick}
    >
      <img
        src={imageUrl}
        alt={alt || "Portrait gallery image"}
        className="w-full h-full object-cover transition-all duration-300 group-hover:scale-105 group-hover:brightness-50 group-hover:blur-[1px]"
        style={{
          ...(aspectRatio && { aspectRatio }),
        }}
      />
      <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/40" />
      {/* Eye icon overlay - appears on hover */}
      <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100 pointer-events-none">
        <Eye className="h-8 w-8 text-white sm:h-10 sm:w-10" />
      </div>
    </div>
  );
}

