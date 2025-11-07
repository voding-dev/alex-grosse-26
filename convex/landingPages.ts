import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./auth";

// Get all landing pages
export const list = query({
  handler: async (ctx) => {
    const pages = await ctx.db
      .query("landingPages")
      .order("desc")
      .collect();

    return pages;
  },
});

// Get landing page by slug
export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const page = await ctx.db
      .query("landingPages")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();

    return page || null;
  },
});

// Get landing page by ID
export const get = query({
  args: { id: v.id("landingPages") },
  handler: async (ctx, args) => {
    const page = await ctx.db.get(args.id);
    return page || null;
  },
});

// Create new landing page
export const create = mutation({
  args: {
    title: v.string(),
    slug: v.string(),
    heroText: v.optional(v.string()),
    calUrl: v.optional(v.string()),
    bookingToken: v.optional(v.string()),
    stripeUrl: v.optional(v.string()),
    howItWorksTitle: v.optional(v.string()),
    howItWorksSteps: v.optional(v.array(v.object({
      title: v.string(),
      description: v.string(),
    }))),
    services: v.optional(v.array(v.object({
      title: v.string(),
      description: v.string(),
    }))),
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
      .query("landingPages")
      .withIndex("by_slug", (q) => q.eq("slug", data.slug))
      .first();

    if (existing) {
      throw new Error("A page with this slug already exists");
    }

    const now = Date.now();
    return await ctx.db.insert("landingPages", {
      ...data,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Update landing page
export const update = mutation({
  args: {
    id: v.id("landingPages"),
    title: v.optional(v.string()),
    slug: v.optional(v.string()),
    heroText: v.optional(v.string()),
    calUrl: v.optional(v.string()),
    bookingToken: v.optional(v.string()),
    stripeUrl: v.optional(v.string()),
    howItWorksTitle: v.optional(v.string()),
    howItWorksSteps: v.optional(v.array(v.object({
      title: v.string(),
      description: v.string(),
    }))),
    services: v.optional(v.array(v.object({
      title: v.string(),
      description: v.string(),
    }))),
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

    // If slug is being updated, check if it conflicts with another page
    if (updates.slug) {
      const existing = await ctx.db
        .query("landingPages")
        .withIndex("by_slug", (q) => q.eq("slug", updates.slug as string))
        .first();

      if (existing && existing._id !== id) {
        throw new Error("A page with this slug already exists");
      }
    }

    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });
  },
});

// Delete landing page
export const remove = mutation({
  args: {
    id: v.id("landingPages"),
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

    // Delete associated hero carousel images
    const heroImages = await ctx.db
      .query("landingPageHeroCarousel")
      .withIndex("by_landing_page", (q) => q.eq("landingPageId", args.id))
      .collect();

    for (const image of heroImages) {
      await ctx.db.delete(image._id);
    }

    // Delete associated gallery images
    const galleryImages = await ctx.db
      .query("landingPageGallery")
      .withIndex("by_landing_page", (q) => q.eq("landingPageId", args.id))
      .collect();

    for (const image of galleryImages) {
      await ctx.db.delete(image._id);
    }

    // Delete the landing page
    await ctx.db.delete(args.id);
  },
});

