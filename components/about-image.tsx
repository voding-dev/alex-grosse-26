"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

interface AboutImageProps {
  storageId?: string;
  className?: string;
}

export function AboutImage({ storageId, className = "" }: AboutImageProps) {
  const imageUrl = useQuery(
    api.storageQueries.getUrl,
    storageId ? { storageId } : "skip"
  );

  if (!storageId || !imageUrl) {
    return <div className={`bg-foreground/10 ${className}`} />;
  }

  return (
    <img
      src={imageUrl}
      alt="About"
      className={`h-full w-full object-cover ${className}`}
    />
  );
}

