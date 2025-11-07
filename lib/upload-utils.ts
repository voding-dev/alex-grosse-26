/**
 * Centralized image upload utility
 * Handles compression, duplicate detection, media library creation, and display location linking
 */

import { compressImage, generateFileHash, type CompressionOptions } from "./image-compression";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

export interface UploadImageOptions {
  file: File;
  sessionToken?: string;
  displayLocation?: {
    type: "portfolio" | "project" | "delivery" | "gallery" | "hero_carousel" | "about" | "cover" | "pitch_deck" | "quote_builder";
    entityId?: string;
    entityName?: string;
    subType?: string; // e.g., "portraits", "design", "graphic_designer", "landing_page"
  };
  tags?: string[];
  folder?: string;
  alt?: string;
  description?: string;
  compressionOptions?: CompressionOptions;
  generateUploadUrl: () => Promise<string>;
  checkDuplicateMutation: (args: { sessionToken?: string; fileHash: string }) => Promise<Id<"mediaLibrary"> | null>;
  getMedia?: (args: { id: Id<"mediaLibrary"> }) => Promise<{ storageKey: string; width?: number; height?: number; size: number } | null>;
  addDisplayLocation?: (args: {
    sessionToken?: string;
    id: Id<"mediaLibrary">;
    locationType: "portfolio" | "project" | "delivery" | "pitch_deck" | "quote_builder" | "gallery" | "hero_carousel" | "about" | "cover";
    entityId: string;
    entityName?: string;
  }) => Promise<void>;
  createMedia: (args: {
    sessionToken?: string;
    filename: string;
    storageKey: string;
    type: "image" | "video";
    width?: number;
    height?: number;
    size: number;
    tags?: string[];
    folder?: string;
    alt?: string;
    description?: string;
    displayLocations?: Array<{
      type: "portfolio" | "project" | "delivery" | "pitch_deck" | "quote_builder" | "gallery" | "hero_carousel" | "about" | "cover";
      entityId: string;
      entityName?: string;
    }>;
    originalSize?: number;
    compressedSize?: number;
    compressionRatio?: number;
    fileHash?: string;
  }) => Promise<Id<"mediaLibrary">>;
}

export interface UploadImageResult {
  mediaLibraryId: Id<"mediaLibrary">;
  storageKey: string;
  width?: number;
  height?: number;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  isDuplicate: boolean;
  duplicateId?: Id<"mediaLibrary">;
}

/**
 * Upload image with compression and media library integration
 */
export async function uploadImageToMediaLibrary(
  options: UploadImageOptions
): Promise<UploadImageResult> {
  const {
    file,
    sessionToken,
    displayLocation,
    tags = [],
    folder,
    alt,
    description,
    compressionOptions = {
      quality: 0.7,
      maxWidth: 1920,
      maxHeight: 1920,
      outputFormat: "jpeg",
      enableResize: true,
    },
    generateUploadUrl,
    checkDuplicateMutation,
    getMedia,
    addDisplayLocation,
    createMedia,
  } = options;

  const isImage = file.type.startsWith("image/");
  let fileToUpload: File | Blob = file;
  let originalSize = file.size;
  let compressedSize = file.size;
  let compressionRatio = 0;
  let width: number | undefined;
  let height: number | undefined;
  let fileHash: string | undefined;

  // Generate file hash for duplicate detection (from original file)
  try {
    fileHash = await generateFileHash(file);
  } catch (error) {
    console.warn(`Failed to generate hash for ${file.name}:`, error);
  }

  // Compress images automatically
  if (isImage) {
    try {
      const compressionResult = await compressImage(file, compressionOptions);

      fileToUpload = compressionResult.blob;
      originalSize = compressionResult.originalSize;
      compressedSize = compressionResult.compressedSize;
      compressionRatio = compressionResult.compressionRatio;
      width = compressionResult.width;
      height = compressionResult.height;
    } catch (error) {
      console.warn(`Failed to compress ${file.name}, using original:`, error);
      // Fall back to original file if compression fails
      fileToUpload = file; // Ensure we use the original file
      const img = new Image();
      const url = URL.createObjectURL(file);
      await new Promise((resolve, reject) => {
        img.onload = () => {
          width = img.width;
          height = img.height;
          URL.revokeObjectURL(url);
          resolve(null);
        };
        img.onerror = reject;
        img.src = url;
      });
    }
  } else {
    // For videos, get dimensions if needed
    if (file.type.startsWith("video/")) {
      const video = document.createElement("video");
      const url = URL.createObjectURL(file);
      await new Promise((resolve, reject) => {
        video.onloadedmetadata = () => {
          width = video.videoWidth;
          height = video.videoHeight;
          URL.revokeObjectURL(url);
          resolve(null);
        };
        video.onerror = reject;
        video.src = url;
      });
    }
  }

  // Check for duplicate by file hash
  let duplicateId: Id<"mediaLibrary"> | null = null;
  if (fileHash) {
    try {
      duplicateId = await checkDuplicateMutation({
        sessionToken: sessionToken || undefined,
        fileHash: fileHash,
      });
    } catch (error) {
      console.warn(`Failed to check duplicate for ${file.name}:`, error);
    }
  }

  // If duplicate found, get the existing media library entry and add display location
  if (duplicateId) {
    let existingStorageKey = "";
    let existingWidth: number | undefined;
    let existingHeight: number | undefined;
    let existingSize = compressedSize;

    // Get existing media library entry to retrieve storage key
    if (options.getMedia) {
      try {
        const existingMedia = await options.getMedia({ id: duplicateId });
        if (existingMedia && existingMedia.storageKey) {
          existingStorageKey = existingMedia.storageKey;
          existingWidth = existingMedia.width;
          existingHeight = existingMedia.height;
          existingSize = existingMedia.size;
        } else {
          console.warn(`[upload-utils] Duplicate found (${duplicateId}) but getMedia returned null or missing storageKey`);
        }
      } catch (error) {
        console.warn(`[upload-utils] Failed to get existing media entry:`, error);
      }
    } else {
      console.warn(`[upload-utils] Duplicate found (${duplicateId}) but getMedia function not provided`);
    }

    // Add display location to existing entry if provided
    if (displayLocation && options.addDisplayLocation) {
      try {
        await options.addDisplayLocation({
          sessionToken: sessionToken || undefined,
          id: duplicateId,
          locationType: displayLocation.type,
          entityId: displayLocation.entityId || "",
          entityName: displayLocation.entityName,
        });
      } catch (error) {
        console.warn(`Failed to add display location to duplicate:`, error);
      }
    }

    return {
      mediaLibraryId: duplicateId,
      storageKey: existingStorageKey,
      width: existingWidth || width,
      height: existingHeight || height,
      originalSize,
      compressedSize: existingSize,
      compressionRatio,
      isDuplicate: true,
      duplicateId,
    };
  }

  // Get upload URL
  console.log(`[upload-utils] Getting upload URL for ${file.name}...`);
  let uploadUrl: string;
  try {
    uploadUrl = await generateUploadUrl();
    console.log(`[upload-utils] Got upload URL: ${uploadUrl.substring(0, 50)}...`);
  } catch (error) {
    console.error(`[upload-utils] Failed to get upload URL:`, error);
    throw new Error(`Failed to get upload URL: ${error instanceof Error ? error.message : String(error)}`);
  }

  // Upload file (compressed if image, original if video)
  console.log(`[upload-utils] Uploading ${file.name} (${fileToUpload instanceof Blob ? fileToUpload.size : fileToUpload.size} bytes)...`);
  let result: Response;
  try {
    result = await fetch(uploadUrl, {
      method: "POST",
      headers: { "Content-Type": isImage ? "image/jpeg" : file.type },
      body: fileToUpload,
    });
    console.log(`[upload-utils] Upload response status: ${result.status} ${result.statusText}`);
  } catch (error) {
    console.error(`[upload-utils] Fetch error during upload:`, error);
    throw new Error(`Failed to upload ${file.name}: ${error instanceof Error ? error.message : String(error)}`);
  }

  if (!result.ok) {
    const errorText = await result.text().catch(() => "Unknown error");
    console.error(`[upload-utils] Upload failed with status ${result.status}:`, errorText);
    throw new Error(`Failed to upload ${file.name}: ${result.status} ${result.statusText}`);
  }

  let storageId: string;
  try {
    const responseData = await result.json();
    storageId = responseData.storageId;
    console.log(`[upload-utils] Upload successful, storageId: ${storageId}`);
  } catch (error) {
    console.error(`[upload-utils] Failed to parse upload response:`, error);
    throw new Error(`Failed to parse upload response: ${error instanceof Error ? error.message : String(error)}`);
  }

  // Build display locations array
  const displayLocations: Array<{
    type: "portfolio" | "project" | "delivery" | "pitch_deck" | "quote_builder" | "gallery" | "hero_carousel" | "about" | "cover";
    entityId: string;
    entityName?: string;
  }> = displayLocation
    ? [
        {
          type: displayLocation.type,
          entityId: displayLocation.entityId || "",
          entityName: displayLocation.entityName,
        },
      ]
    : [];

  // Create media library entry
  const mediaLibraryId = await createMedia({
    sessionToken: sessionToken || undefined,
    filename: file.name,
    storageKey: storageId,
    type: isImage ? "image" : "video",
    width,
    height,
    size: compressedSize, // Use compressed size for images
    tags,
    folder,
    alt: alt || file.name,
    description,
    displayLocations,
    originalSize: isImage ? originalSize : undefined,
    compressedSize: isImage ? compressedSize : undefined,
    compressionRatio: isImage ? compressionRatio : undefined,
    fileHash,
  });

  return {
    mediaLibraryId,
    storageKey: storageId,
    width,
    height,
    originalSize,
    compressedSize,
    compressionRatio,
    isDuplicate: false,
  };
}
