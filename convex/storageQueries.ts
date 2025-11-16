import { query } from "./_generated/server";
import { v } from "convex/values";

// Get URL for a storage ID
export const getUrl = query({
  args: { storageId: v.string() },
  handler: async (ctx, args) => {
    // Validate storage ID format - skip seed/mock data
    if (args.storageId.startsWith("seed-") || args.storageId.startsWith("mock-") || args.storageId.includes("seed-storage")) {
      return null;
    }
    
    try {
      return await ctx.storage.getUrl(args.storageId);
    } catch (error) {
      // Invalid storage ID - return null instead of throwing
      console.warn(`Invalid storage ID: ${args.storageId}`, error);
      return null;
    }
  },
});

// Get URLs for multiple storage IDs
export const getUrls = query({
  args: { storageIds: v.array(v.string()) },
  handler: async (ctx, args) => {
    const urls = await Promise.all(
      args.storageIds.map(async (storageId) => {
        // Validate storage ID format - skip seed/mock data
        if (storageId.startsWith("seed-") || storageId.startsWith("mock-") || storageId.includes("seed-storage")) {
          return null;
        }
        
        try {
          return await ctx.storage.getUrl(storageId);
        } catch (error) {
          // Invalid storage ID - return null instead of throwing
          console.warn(`Invalid storage ID: ${storageId}`, error);
          return null;
        }
      })
    );
    
    return urls;
  },
});

