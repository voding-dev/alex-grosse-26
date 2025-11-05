import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./auth";

// Get all gallery images for a category
export const listByCategory = query({
  args: {
    categoryId: v.string(),
  },
  handler: async (ctx, args) => {
    const images = await ctx.db
      .query("graphicDesignerCategoryGallery")
      .withIndex("by_category", (q) => q.eq("categoryId", args.categoryId))
      .collect();

    return images.sort((a, b) => a.sortOrder - b.sortOrder);
  },
});

// Get all gallery images (for admin view)
export const list = query({
  handler: async (ctx) => {
    const images = await ctx.db
      .query("graphicDesignerCategoryGallery")
      .collect();

    return images.sort((a, b) => {
      if (a.categoryId !== b.categoryId) {
        return a.categoryId.localeCompare(b.categoryId);
      }
      return a.sortOrder - b.sortOrder;
    });
  },
});

// Add a new gallery image
export const add = mutation({
  args: {
    categoryId: v.string(),
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
      .query("graphicDesignerCategoryGallery")
      .withIndex("by_category", (q) => q.eq("categoryId", data.categoryId))
      .collect();

    const maxSortOrder = existing.length > 0 
      ? Math.max(...existing.map((img) => img.sortOrder))
      : -1;

    const now = Date.now();
    return await ctx.db.insert("graphicDesignerCategoryGallery", {
      categoryId: data.categoryId,
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

// Remove gallery image
export const remove = mutation({
  args: {
    id: v.id("graphicDesignerCategoryGallery"),
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

// Reorder gallery images
export const reorder = mutation({
  args: {
    categoryId: v.string(),
    ids: v.array(v.id("graphicDesignerCategoryGallery")),
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

