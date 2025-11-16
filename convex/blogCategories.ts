import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./auth";

// List all categories
export const list = query({
  handler: async (ctx) => {
    const categories = await ctx.db
      .query("blogCategories")
      .order("asc")
      .collect();

    // Sort by sortOrder if available
    return categories.sort((a, b) => {
      const aOrder = a.sortOrder ?? 999;
      const bOrder = b.sortOrder ?? 999;
      return aOrder - bOrder;
    });
  },
});

// Get single category by ID
export const get = query({
  args: { id: v.id("blogCategories") },
  handler: async (ctx, args) => {
    const category = await ctx.db.get(args.id);
    return category || null;
  },
});

// Get category by slug
export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const category = await ctx.db
      .query("blogCategories")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();

    return category || null;
  },
});

// Create new category
export const create = mutation({
  args: {
    name: v.string(),
    slug: v.string(),
    description: v.optional(v.string()),
    color: v.optional(v.string()),
    sortOrder: v.optional(v.number()),
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

    // Check if slug already exists
    const existing = await ctx.db
      .query("blogCategories")
      .withIndex("by_slug", (q) => q.eq("slug", data.slug))
      .first();

    if (existing) {
      throw new Error("A category with this slug already exists");
    }

    const now = Date.now();
    const categoryId = await ctx.db.insert("blogCategories", {
      ...data,
      createdAt: now,
      updatedAt: now,
    });

    return categoryId;
  },
});

// Update category
export const update = mutation({
  args: {
    id: v.id("blogCategories"),
    name: v.optional(v.string()),
    slug: v.optional(v.string()),
    description: v.optional(v.string()),
    color: v.optional(v.string()),
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

    const category = await ctx.db.get(id);
    if (!category) {
      throw new Error("Category not found");
    }

    // If slug is being updated, check if it conflicts
    if (updates.slug && updates.slug !== category.slug) {
      const existing = await ctx.db
        .query("blogCategories")
        .withIndex("by_slug", (q) => q.eq("slug", updates.slug as string))
        .first();

      if (existing && existing._id !== id) {
        throw new Error("A category with this slug already exists");
      }
    }

    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });
  },
});

// Delete category
export const remove = mutation({
  args: {
    id: v.id("blogCategories"),
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

    // Check if any posts use this category
    const posts = await ctx.db.query("blogPosts").collect();
    const postsUsingCategory = posts.filter((post) =>
      post.categoryIds?.includes(args.id)
    );

    if (postsUsingCategory.length > 0) {
      throw new Error(
        `Cannot delete category: ${postsUsingCategory.length} post(s) are using it`
      );
    }

    await ctx.db.delete(args.id);
  },
});

// Reorder categories
export const reorder = mutation({
  args: {
    categoryIds: v.array(v.id("blogCategories")),
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

    // Update sortOrder for each category
    for (let i = 0; i < args.categoryIds.length; i++) {
      await ctx.db.patch(args.categoryIds[i], {
        sortOrder: i,
        updatedAt: Date.now(),
      });
    }
  },
});

