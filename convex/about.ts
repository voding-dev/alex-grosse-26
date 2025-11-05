import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./auth";

// Get about section content
export const get = query({
  handler: async (ctx) => {
    // Get the single about record (there should only be one)
    const about = await ctx.db
      .query("about")
      .order("desc")
      .first();
    
    return about || null;
  },
});

// Update about section content
export const update = mutation({
  args: {
    heading: v.optional(v.string()),
    imageStorageId: v.optional(v.string()),
    bio: v.optional(v.string()),
    awards: v.optional(v.array(v.string())),
    awardsHeading: v.optional(v.string()),
    littleBits: v.optional(v.string()),
    littleBitsHeading: v.optional(v.string()),
    clientList: v.optional(v.array(v.string())),
    clientListHeading: v.optional(v.string()),
    contactHeading: v.optional(v.string()),
    contactEmail: v.optional(v.string()), // Contact email for display
    phone: v.optional(v.string()),
    instagramUrl: v.optional(v.string()),
    linkedinUrl: v.optional(v.string()),
    email: v.optional(v.string()), // Dev mode: email for admin check
  },
  handler: async (ctx, args) => {
    const { email: adminEmail, contactEmail, ...updates } = args;
    const finalUpdates = { ...updates, email: contactEmail };
    
    // Development mode: check admin by email
    if (adminEmail) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_email", (q: any) => q.eq("email", adminEmail))
        .first();
      
      if (!user || user.role !== "admin") {
        throw new Error("Unauthorized - admin access required");
      }
    } else {
      // Production mode: use requireAdmin
      await requireAdmin(ctx);
    }

    // Get existing about record or create new one
    const existing = await ctx.db
      .query("about")
      .order("desc")
      .first();

    const now = Date.now();

    if (existing) {
      // Update existing
      await ctx.db.patch(existing._id, {
        ...finalUpdates,
        updatedAt: now,
      });
      return existing._id;
    } else {
      // Create new
      return await ctx.db.insert("about", {
        ...finalUpdates,
        awards: finalUpdates.awards || [],
        clientList: finalUpdates.clientList || [],
        updatedAt: now,
      });
    }
  },
});

