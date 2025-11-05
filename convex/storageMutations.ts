import { mutation } from "./_generated/server";

// Generate upload URL for Convex storage
// This is in a separate file because mutations can't be in "use node" files
export const generateUploadUrl = mutation({
  handler: async (ctx) => {
    // Generate upload URL using Convex's built-in storage
    return await ctx.storage.generateUploadUrl();
  },
});

