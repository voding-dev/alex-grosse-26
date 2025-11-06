/**
 * Helper functions for media library operations
 */

import { DatabaseWriter } from "./_generated/server";

/**
 * Create or update a media library entry for a storage key
 * Used when uploading images/videos to hero carousels, galleries, etc.
 */
export async function createOrUpdateMediaLibraryEntry(
  ctx: { db: DatabaseWriter },
  params: {
    storageKey: string;
    filename: string;
    type: "image" | "video";
    width?: number;
    height?: number;
    duration?: number;
    size: number;
    alt?: string;
    displayLocation?: {
      type: "portfolio" | "project" | "delivery" | "pitch_deck" | "quote_builder";
      entityId: string;
      entityName?: string;
    };
    originalSize?: number;
    compressedSize?: number;
    compressionRatio?: number;
    fileHash?: string;
  }
): Promise<void> {
  try {
    // Check if already exists in media library (by storage key)
    // This prevents duplicates when selecting from media library
    const existing = await ctx.db
      .query("mediaLibrary")
      .filter((q) => q.eq(q.field("storageKey"), params.storageKey))
      .first();

    const now = Date.now();

    if (!existing) {
      // Only create new media library entry if it doesn't already exist
      // This happens when uploading a new file directly
      await ctx.db.insert("mediaLibrary", {
        filename: params.filename,
        storageKey: params.storageKey,
        type: params.type,
        width: params.width,
        height: params.height,
        duration: params.duration,
        size: params.size,
        canonicalUrl: undefined,
        tags: [],
        folder: undefined,
        alt: params.alt,
        description: undefined,
        sourceAssetId: undefined,
        sourceType: "upload",
        displayLocations: params.displayLocation
          ? [params.displayLocation]
          : [],
        originalSize: params.originalSize,
        compressedSize: params.compressedSize,
        compressionRatio: params.compressionRatio,
        fileHash: params.fileHash,
        createdAt: now,
        updatedAt: now,
      });
    } else {
      // Media library entry already exists - just update display locations
      // This happens when selecting from media library - no duplicate created
      if (params.displayLocation) {
        const locationExists = existing.displayLocations.some(
          (loc) =>
            loc.type === params.displayLocation!.type &&
            loc.entityId === params.displayLocation!.entityId
        );
        if (!locationExists) {
          const updatedLocations = [
            ...existing.displayLocations,
            params.displayLocation,
          ];
          await ctx.db.patch(existing._id, {
            displayLocations: updatedLocations,
            updatedAt: now,
          });
        }
      }
    }
  } catch (error) {
    // Log error but don't fail the operation
    console.error("Failed to create/update media library entry:", error);
  }
}

