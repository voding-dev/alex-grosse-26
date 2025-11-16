import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./auth";

// List all tags
export const list = query({
  handler: async (ctx) => {
    const tags = await ctx.db
      .query("blogTags")
      .order("asc")
      .collect();

    return tags;
  },
});

// Get popular tags (sorted by use count)
export const getPopular = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const tags = await ctx.db
      .query("blogTags")
      .withIndex("by_use_count")
      .order("desc")
      .collect();

    if (args.limit) {
      return tags.slice(0, args.limit);
    }

    return tags;
  },
});

// Get single tag by ID
export const get = query({
  args: { id: v.id("blogTags") },
  handler: async (ctx, args) => {
    const tag = await ctx.db.get(args.id);
    return tag || null;
  },
});

// Get tag by slug
export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const tag = await ctx.db
      .query("blogTags")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();

    return tag || null;
  },
});

// Get or create tag (helper for when adding tags to posts)
export const getOrCreate = mutation({
  args: {
    name: v.string(),
    email: v.optional(v.string()), // Dev mode: email for admin check
  },
  handler: async (ctx, args) => {
    const { email: adminEmail, name } = args;

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

    // Create slug from name
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

    // Check if tag already exists
    const existing = await ctx.db
      .query("blogTags")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();

    if (existing) {
      return existing._id;
    }

    // Create new tag
    const now = Date.now();
    const tagId = await ctx.db.insert("blogTags", {
      name,
      slug,
      useCount: 0,
      createdAt: now,
      updatedAt: now,
    });

    return tagId;
  },
});

// Create new tag
export const create = mutation({
  args: {
    name: v.string(),
    slug: v.string(),
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
      .query("blogTags")
      .withIndex("by_slug", (q) => q.eq("slug", data.slug))
      .first();

    if (existing) {
      throw new Error("A tag with this slug already exists");
    }

    const now = Date.now();
    const tagId = await ctx.db.insert("blogTags", {
      ...data,
      useCount: 0,
      createdAt: now,
      updatedAt: now,
    });

    return tagId;
  },
});

// Update tag
export const update = mutation({
  args: {
    id: v.id("blogTags"),
    name: v.optional(v.string()),
    slug: v.optional(v.string()),
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

    const tag = await ctx.db.get(id);
    if (!tag) {
      throw new Error("Tag not found");
    }

    // If slug is being updated, check if it conflicts
    if (updates.slug && updates.slug !== tag.slug) {
      const existing = await ctx.db
        .query("blogTags")
        .withIndex("by_slug", (q) => q.eq("slug", updates.slug as string))
        .first();

      if (existing && existing._id !== id) {
        throw new Error("A tag with this slug already exists");
      }
    }

    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });
  },
});

// Delete tag
export const remove = mutation({
  args: {
    id: v.id("blogTags"),
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

// Update tag use counts (called when posts are updated)
export const updateUseCounts = mutation({
  args: {
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

    const tags = await ctx.db.query("blogTags").collect();
    const posts = await ctx.db.query("blogPosts").collect();

    // Count usage for each tag
    for (const tag of tags) {
      const useCount = posts.filter((post) =>
        post.tags?.includes(tag.name)
      ).length;

      await ctx.db.patch(tag._id, {
        useCount,
        updatedAt: Date.now(),
      });
    }
  },
});

// Bulk delete unused tags
export const removeUnused = mutation({
  args: {
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

    const tags = await ctx.db.query("blogTags").collect();
    const unusedTags = tags.filter((tag) => (tag.useCount || 0) === 0);

    for (const tag of unusedTags) {
      await ctx.db.delete(tag._id);
    }

    return unusedTags.length;
  },
});

