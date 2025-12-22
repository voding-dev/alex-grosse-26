import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./auth";

// List sections for a blog post
export const listByPost = query({
  args: { blogPostId: v.id("blogPosts") },
  handler: async (ctx, args) => {
    const sections = await ctx.db
      .query("blogPostSections")
      .withIndex("by_blog_post_and_sort_order", (q) =>
        q.eq("blogPostId", args.blogPostId)
      )
      .order("asc")
      .collect();

    return sections;
  },
});

// Create new section
export const create = mutation({
  args: {
    blogPostId: v.id("blogPosts"),
    type: v.union(
      v.literal("text"),
      v.literal("image"),
      v.literal("gallery"),
      v.literal("cta_booking"),
      v.literal("cta_stripe")
    ),
    sortOrder: v.number(),
    textContent: v.optional(v.string()),
    imageStorageId: v.optional(v.string()),
    imageAlt: v.optional(v.string()),
    imageCaption: v.optional(v.string()),
    imageWidth: v.optional(v.number()),
    imageHeight: v.optional(v.number()),
    galleryImages: v.optional(v.array(v.object({
      storageId: v.string(),
      alt: v.optional(v.string()),
      caption: v.optional(v.string()),
    }))),
    ctaHeading: v.optional(v.string()),
    ctaDescription: v.optional(v.string()),
    bookingToken: v.optional(v.string()),
    stripeUrl: v.optional(v.string()),
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

    const now = Date.now();
    const sectionId = await ctx.db.insert("blogPostSections", {
      ...data,
      createdAt: now,
      updatedAt: now,
    });

    return sectionId;
  },
});

// Update section
export const update = mutation({
  args: {
    id: v.id("blogPostSections"),
    type: v.optional(v.union(
      v.literal("text"),
      v.literal("image"),
      v.literal("gallery"),
      v.literal("cta_booking"),
      v.literal("cta_stripe")
    )),
    sortOrder: v.optional(v.number()),
    textContent: v.optional(v.string()),
    imageStorageId: v.optional(v.string()),
    imageAlt: v.optional(v.string()),
    imageCaption: v.optional(v.string()),
    imageWidth: v.optional(v.number()),
    imageHeight: v.optional(v.number()),
    galleryImages: v.optional(v.array(v.object({
      storageId: v.string(),
      alt: v.optional(v.string()),
      caption: v.optional(v.string()),
    }))),
    ctaHeading: v.optional(v.string()),
    ctaDescription: v.optional(v.string()),
    bookingToken: v.optional(v.string()),
    stripeUrl: v.optional(v.string()),
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

// Delete section
export const remove = mutation({
  args: {
    id: v.id("blogPostSections"),
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

// Reorder sections
export const reorder = mutation({
  args: {
    blogPostId: v.id("blogPosts"),
    sectionIds: v.array(v.id("blogPostSections")),
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

    // Update sortOrder for each section
    for (let i = 0; i < args.sectionIds.length; i++) {
      await ctx.db.patch(args.sectionIds[i], {
        sortOrder: i,
        updatedAt: Date.now(),
      });
    }
  },
});







