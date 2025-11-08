"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { getVideoThumbnailUrl } from "@/lib/video-utils";

interface ProjectCoverProps {
  projectId: string;
  coverAssetId?: string;
  className?: string;
  isPortfolio?: boolean; // If true, this is a portfolio item, not a project
}

export function ProjectCover({ projectId, coverAssetId, className = "", isPortfolio = false }: ProjectCoverProps) {
  // If coverAssetId is provided, use it
  const coverAsset = useQuery(
    api.assets.get,
    coverAssetId ? { id: coverAssetId as Id<"assets"> } : "skip"
  );

  // If no coverAssetId, fetch assets and use first image or video
  const assets = useQuery(
    isPortfolio 
      ? api.assets.listPortfolio 
      : api.assets.listProject,
    !coverAssetId && projectId 
      ? (isPortfolio ? { portfolioId: projectId as Id<"portfolio"> } : { projectId: projectId as Id<"projects"> })
      : "skip"
  );

  // Determine which asset to use
  let assetToUse = coverAsset;
  if (!assetToUse && assets && assets.length > 0) {
    // Filter to only images and videos (same as carousel)
    const mediaAssets = assets.filter(asset => 
      asset.type === "image" || (asset.type === "video" && asset.videoUrl)
    );
    // Use the first media asset (maintains sortOrder from gallery)
    assetToUse = mediaAssets.length > 0 ? mediaAssets[0] : assets[0];
  }

  // Get URL for preview or storage key (skip for external videos)
  const storageId = assetToUse?.videoUrl ? undefined : (assetToUse?.previewKey || assetToUse?.storageKey);
  const imageUrl = useQuery(
    api.storageQueries.getUrl,
    storageId ? { storageId } : "skip"
  );

  // Get video thumbnail if it's an external video
  const videoThumbnailUrl = assetToUse?.videoUrl ? getVideoThumbnailUrl(assetToUse.videoUrl) : null;

  if (!assetToUse) {
    return <div className={`h-full w-full bg-black ${className}`} />;
  }

  // If it's a video with a thumbnail, show the thumbnail
  if (assetToUse.type === "video" && videoThumbnailUrl) {
    return (
      <img
        src={videoThumbnailUrl}
        alt="Project cover"
        className={`h-full w-full object-cover ${className}`}
      />
    );
  }

  // If it's an image with a URL, show it
  if (assetToUse.type === "image" && imageUrl) {
    return (
      <img
        src={imageUrl}
        alt="Project cover"
        className={`h-full w-full object-cover ${className}`}
      />
    );
  }

  // Fallback
  return <div className={`h-full w-full bg-black ${className}`} />;
}

