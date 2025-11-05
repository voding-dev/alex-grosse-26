"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";

// Get download URL for a Convex storage ID
export const getSignedDownloadUrl = action({
  args: {
    storageKey: v.string(),
  },
  handler: async (ctx, args) => {
    // storageKey is a Convex storage ID, get its URL
    return await ctx.storage.getUrl(args.storageKey);
  },
});

// Get download URLs for multiple Convex storage IDs
export const getSignedDownloadUrls = action({
  args: {
    storageKeys: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    // Filter out invalid storage keys before processing - extremely strict
    const validKeys = args.storageKeys.filter((storageId) => {
      if (!storageId || typeof storageId !== "string") return false;
      
      // Check for Windows drive letters (case insensitive)
      const lowerId = storageId.toLowerCase();
      
      // Reject any drive letter pattern (c:, d:, etc.)
      if (/[a-z]:/.test(lowerId)) {
        console.warn(`Rejected storage key with drive letter: ${storageId}`);
        return false;
      }
      
      // Reject drive letter with path separator
      if (/[a-z]:[\\/]/.test(lowerId)) {
        console.warn(`Rejected storage key with drive path: ${storageId}`);
        return false;
      }
      
      // Reject backslashes (Windows path separator)
      if (storageId.includes("\\")) {
        console.warn(`Rejected storage key with backslash: ${storageId}`);
        return false;
      }
      
      // Reject colons except in http/https URLs
      if (storageId.includes(":")) {
        if (!storageId.startsWith("http://") && !storageId.startsWith("https://")) {
          console.warn(`Rejected storage key with colon: ${storageId}`);
          return false;
        }
      }
      
      // Filter out seed/mock data
      if (storageId.startsWith("seed-") || storageId.startsWith("mock-")) return false;
      if (storageId.includes("seed-storage")) return false;
      
      // Must be at least 10 characters (valid storage IDs are longer)
      if (storageId.length < 10) return false;
      
      return true;
    });
    
    // Log what we're filtering
    const rejectedKeys = args.storageKeys.filter((k) => !validKeys.includes(k));
    if (rejectedKeys.length > 0) {
      console.warn(`Rejected ${rejectedKeys.length} invalid storage keys:`, rejectedKeys);
    }
    
    if (validKeys.length === 0) {
      console.warn("No valid storage keys to process");
      return [];
    }
    
    // Get URLs for all valid storage IDs, handle errors gracefully
    // Process one at a time to avoid any issues with concurrent processing
    const urls: Array<{ key: string; url: string | null }> = [];
    
    for (const storageId of validKeys) {
      try {
        // Final check before calling getUrl
        if (storageId.includes("\\") || /[a-zA-Z]:/.test(storageId)) {
          console.warn(`Skipping invalid storage ID: ${storageId}`);
          urls.push({ key: storageId, url: null });
          continue;
        }
        
        const url = await ctx.storage.getUrl(storageId);
        urls.push({
          key: storageId,
          url: url || null,
        });
      } catch (error: any) {
        // If storage ID is invalid, return null instead of throwing
        console.warn(`Error getting URL for storage ID: ${storageId}`, error?.message || error);
        urls.push({
          key: storageId,
          url: null,
        });
      }
    }
    
    return urls;
  },
});
