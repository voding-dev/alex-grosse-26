import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./auth";

// Get all gallery images for a landing page
export const list = query({
  args: { landingPageId: v.id("landingPages") },
  handler: async (ctx, args) => {
    const images = await ctx.db
      .query("landingPageGallery")
      .withIndex("by_landing_page", (q) => q.eq("landingPageId", args.landingPageId))
      .collect();

    return images.sort((a, b) => a.sortOrder - b.sortOrder);
  },
});

// Add a new gallery image
export const add = mutation({
  args: {
    landingPageId: v.id("landingPages"),
    imageStorageId: v.string(),
    alt: v.optional(v.string()),
    width: v.optional(v.number()),
    height: v.optional(v.number()),
    email: v.optional(v.string()), // Dev mode: email for admin check
  },
  handler: async (ctx, args) => {
    const { email: adminEmail, ...data } = args;

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

    // Get the highest sort order for this landing page
    const existing = await ctx.db
      .query("landingPageGallery")
      .withIndex("by_landing_page", (q) => q.eq("landingPageId", data.landingPageId))
      .collect();

    const maxSortOrder = existing.length > 0 
      ? Math.max(...existing.map((img) => img.sortOrder))
      : -1;

    const now = Date.now();
    return await ctx.db.insert("landingPageGallery", {
      ...data,
      sortOrder: maxSortOrder + 1,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Delete gallery image
export const remove = mutation({
  args: {
    id: v.id("landingPageGallery"),
    email: v.optional(v.string()), // Dev mode: email for admin check
  },
  handler: async (ctx, args) => {
    const { email: adminEmail } = args;

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

    await ctx.db.delete(args.id);
  },
});

// Reorder gallery images
export const reorder = mutation({
  args: {
    ids: v.array(v.id("landingPageGallery")),
    email: v.optional(v.string()), // Dev mode: email for admin check
  },
  handler: async (ctx, args) => {
    const { email: adminEmail, ids } = args;

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

    // Update sort order for each image
    for (let i = 0; i < ids.length; i++) {
      await ctx.db.patch(ids[i], {
        sortOrder: i,
        updatedAt: Date.now(),
      });
    }
  },
});

