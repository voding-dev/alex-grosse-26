import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./auth";

// Get design page content
export const get = query({
  handler: async (ctx) => {
    // Get the single design record (there should only be one)
    const design = await ctx.db
      .query("design")
      .order("desc")
      .first();
    
    return design || null;
  },
});

// Update design page content
export const update = mutation({
  args: {
    heroText: v.optional(v.string()), // Text displayed under name SVG in hero section
    bookingToken: v.optional(v.string()), // Token for public booking invite
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

    // Get existing design record or create new one
    const existing = await ctx.db
      .query("design")
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
      return await ctx.db.insert("design", {
        ...updates,
        updatedAt: now,
      });
    }
  },
});

// Delete all design page data (design record, hero carousel, gallery)
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

    // Delete all design hero carousel images
    const heroImages = await ctx.db
      .query("designHeroCarousel")
      .collect();

    for (const image of heroImages) {
      await ctx.db.delete(image._id);
    }

    // Delete all design gallery images
    const galleryImages = await ctx.db
      .query("designGallery")
      .collect();

    for (const image of galleryImages) {
      await ctx.db.delete(image._id);
    }

    // Delete all design records
    const designRecords = await ctx.db
      .query("design")
      .collect();

    for (const record of designRecords) {
      await ctx.db.delete(record._id);
    }

    return { deletedCount: designRecords.length };
  },
});

