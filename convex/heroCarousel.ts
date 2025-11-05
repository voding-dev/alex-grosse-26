import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./auth";

// Get all hero carousel images
export const list = query({
  handler: async (ctx) => {
    const images = await ctx.db
      .query("heroCarousel")
      .withIndex("by_sort_order")
      .collect();

    return images.sort((a, b) => a.sortOrder - b.sortOrder);
  },
});

// Add a new hero carousel image
export const add = mutation({
  args: {
    imageStorageId: v.string(),
    alt: v.optional(v.string()),
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

    // Get the highest sort order
    const existing = await ctx.db
      .query("heroCarousel")
      .withIndex("by_sort_order")
      .collect();

    const maxSortOrder = existing.length > 0 
      ? Math.max(...existing.map((img) => img.sortOrder))
      : -1;

    const now = Date.now();
    return await ctx.db.insert("heroCarousel", {
      imageStorageId: data.imageStorageId,
      sortOrder: maxSortOrder + 1,
      alt: data.alt,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Update hero carousel image
export const update = mutation({
  args: {
    id: v.id("heroCarousel"),
    imageStorageId: v.optional(v.string()),
    alt: v.optional(v.string()),
    sortOrder: v.optional(v.number()),
    email: v.optional(v.string()), // Dev mode: email for admin check
  },
  handler: async (ctx, args) => {
    const { id, email: adminEmail, ...updates } = args;

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

    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });
  },
});

// Delete hero carousel image
export const remove = mutation({
  args: {
    id: v.id("heroCarousel"),
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

// Reorder hero carousel images
export const reorder = mutation({
  args: {
    ids: v.array(v.id("heroCarousel")),
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




