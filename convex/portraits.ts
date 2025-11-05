import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./auth";

// Get portraits page content
export const get = query({
  handler: async (ctx) => {
    // Get the single portraits record (there should only be one)
    const portraits = await ctx.db
      .query("portraits")
      .order("desc")
      .first();
    
    return portraits || null;
  },
});

// Update portraits page content
export const update = mutation({
  args: {
    heroText: v.optional(v.string()), // Text displayed under name SVG in hero section
    calUrl: v.optional(v.string()), // Cal.com booking link
    stripeUrl: v.optional(v.string()), // Stripe payment link
    howItWorksTitle: v.optional(v.string()), // Title for "How It Works" section
    howItWorksSteps: v.optional(v.array(v.object({
      title: v.string(),
      description: v.string(),
    }))), // Array of steps with title and description
    services: v.optional(v.array(v.object({
      title: v.string(),
      description: v.string(),
    }))), // Array of services with title and description
    email: v.optional(v.string()), // Dev mode: email for admin check
  },
  handler: async (ctx, args) => {
    const { email: adminEmail, ...updates } = args;
    
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

    // Get existing portraits record or create new one
    const existing = await ctx.db
      .query("portraits")
      .order("desc")
      .first();

    const now = Date.now();

    if (existing) {
      // Update existing record
      await ctx.db.patch(existing._id, {
        ...updates,
        updatedAt: now,
      });
      return existing._id;
    } else {
      // Create new record
      return await ctx.db.insert("portraits", {
        ...updates,
        updatedAt: now,
      });
    }
  },
});

// Delete all portraits page data (portraits record, hero carousel, gallery)
export const deleteAll = mutation({
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

    // Delete all portraits hero carousel images
    const heroImages = await ctx.db
      .query("portraitsHeroCarousel")
      .collect();

    for (const image of heroImages) {
      await ctx.db.delete(image._id);
    }

    // Delete all portraits gallery images
    const galleryImages = await ctx.db
      .query("portraitsGallery")
      .collect();

    for (const image of galleryImages) {
      await ctx.db.delete(image._id);
    }

    // Delete all portraits records
    const portraitsRecords = await ctx.db
      .query("portraits")
      .collect();

    for (const record of portraitsRecords) {
      await ctx.db.delete(record._id);
    }

    return { deletedCount: portraitsRecords.length };
  },
});

