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

