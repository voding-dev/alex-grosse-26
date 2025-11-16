import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./auth";

// Get all brand gallery images
export const list = query({
  handler: async (ctx) => {
    const images = await ctx.db
      .query("graphicDesignerBrandGallery")
      .withIndex("by_sort_order")
      .collect();

    return images.sort((a, b) => a.sortOrder - b.sortOrder);
  },
});

// Add a new brand gallery image
export const add = mutation({
  args: {
    imageStorageId: v.string(),
    alt: v.optional(v.string()),
    width: v.optional(v.number()),
    height: v.optional(v.number()),
    email: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { email: adminEmail, ...data } = args;

    if (adminEmail) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_email", (q: any) => q.eq("email", adminEmail))
        .first();

      if (!user || user.role !== "admin") {
        throw new Error("Unauthorized - admin access required");
      }
    } else {
      await requireAdmin(ctx);
    }

    const existing = await ctx.db
      .query("graphicDesignerBrandGallery")
      .withIndex("by_sort_order")
      .collect();

    const maxSortOrder = existing.length > 0 
      ? Math.max(...existing.map((img) => img.sortOrder))
      : -1;

    const now = Date.now();
    return await ctx.db.insert("graphicDesignerBrandGallery", {
      imageStorageId: data.imageStorageId,
      sortOrder: maxSortOrder + 1,
      alt: data.alt,
      width: data.width,
      height: data.height,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Remove brand gallery image
export const remove = mutation({
  args: {
    id: v.id("graphicDesignerBrandGallery"),
    email: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { email: adminEmail } = args;

    if (adminEmail) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_email", (q: any) => q.eq("email", adminEmail))
        .first();

      if (!user || user.role !== "admin") {
        throw new Error("Unauthorized - admin access required");
      }
    } else {
      await requireAdmin(ctx);
    }

    await ctx.db.delete(args.id);
  },
});

// Reorder brand gallery images
export const reorder = mutation({
  args: {
    ids: v.array(v.id("graphicDesignerBrandGallery")),
    email: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { email: adminEmail, ids } = args;

    if (adminEmail) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_email", (q: any) => q.eq("email", adminEmail))
        .first();

      if (!user || user.role !== "admin") {
        throw new Error("Unauthorized - admin access required");
      }
    } else {
      await requireAdmin(ctx);
    }

    for (let i = 0; i < ids.length; i++) {
      await ctx.db.patch(ids[i], {
        sortOrder: i,
        updatedAt: Date.now(),
      });
    }
  },
});
















