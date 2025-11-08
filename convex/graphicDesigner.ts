import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./auth";

// Get graphic designer page content
export const get = query({
  handler: async (ctx) => {
    // Get the single graphic designer record (there should only be one)
    const graphicDesigner = await ctx.db
      .query("graphicDesigner")
      .order("desc")
      .first();
    
    return graphicDesigner || null;
  },
});

// Update graphic designer page content
export const update = mutation({
  args: {
    email: v.optional(v.string()),
    heroTitle: v.optional(v.string()),
    heroSubtitle: v.optional(v.string()),
    heroText: v.optional(v.string()),
    contactEmail: v.optional(v.string()),
    contactPhone: v.optional(v.string()),
    bookingToken: v.optional(v.string()), // Token for public booking invite
    stripeUrl: v.optional(v.string()), // Stripe payment link
    // Value Proposition Section (sub-footer)
    valuePropositionTitle: v.optional(v.string()), // Title for value proposition section
    valuePropositionDescription: v.optional(v.string()), // Description paragraph for value proposition section
    valuePropositionFeatures: v.optional(v.array(v.object({
      title: v.string(),
      description: v.string(),
    }))), // Array of feature blocks (title + description)
    ctaTitle: v.optional(v.string()), // CTA title (e.g., "READY TO STAND OUT?")
    categories: v.optional(v.array(v.object({
      id: v.string(),
      name: v.string(),
      items: v.array(v.object({
        name: v.string(),
        description: v.string(),
        price: v.string(),
      })),
    }))),
    menuItems: v.optional(v.object({
      window: v.array(v.object({
        name: v.string(),
        description: v.string(),
        price: v.string(),
      })),
      brand: v.array(v.object({
        name: v.string(),
        description: v.string(),
        price: v.string(),
      })),
      graphic: v.array(v.object({
        name: v.string(),
        description: v.string(),
        price: v.string(),
      })),
    })),
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

    // Get existing graphic designer record or create new one
    const existing = await ctx.db
      .query("graphicDesigner")
      .order("desc")
      .first();

    const now = Date.now();

    if (existing) {
      // Check if calUrl exists (legacy field from cal.com integration)
      if ("calUrl" in existing) {
        // Remove calUrl field by replacing the entire document
        const { calUrl, _id, _creationTime, ...cleanExisting } = existing as any;
        await ctx.db.replace(existing._id, {
          ...cleanExisting,
          ...updates,
          updatedAt: now,
        });
      } else {
        // Update existing record normally
        await ctx.db.patch(existing._id, {
          ...updates,
          updatedAt: now,
        });
      }
      return existing._id;
    } else {
      // Create new record
      return await ctx.db.insert("graphicDesigner", {
        ...updates,
        updatedAt: now,
      });
    }
  },
});

// Delete all graphic designer page data
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

    // Delete all graphic designer hero carousel images
    const heroImages = await ctx.db
      .query("graphicDesignerHeroCarousel")
      .collect();

    for (const image of heroImages) {
      await ctx.db.delete(image._id);
    }

    // Delete all graphic designer records
    const graphicDesignerRecords = await ctx.db
      .query("graphicDesigner")
      .collect();

    for (const record of graphicDesignerRecords) {
      await ctx.db.delete(record._id);
    }

    return { deletedCount: graphicDesignerRecords.length };
  },
});

