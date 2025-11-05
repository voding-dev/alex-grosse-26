import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./auth";

// Get homepage content
export const get = query({
  handler: async (ctx) => {
    // Get the single homepage record (there should only be one)
    const homepage = await ctx.db
      .query("homepage")
      .order("desc")
      .first();
    
    return homepage || null;
  },
});

// Update homepage content
export const update = mutation({
  args: {
    heroText: v.optional(v.string()), // Text displayed under name SVG in hero section
    contactHeading: v.optional(v.string()), // Heading for contact section content area
    contactText: v.optional(v.string()),
    contactEmail: v.optional(v.string()),
    contactPhone: v.optional(v.string()),
    contactInstagramUrl: v.optional(v.string()),
    contactLinkedinUrl: v.optional(v.string()),
    formHeading: v.optional(v.string()),
    portfolioProjectIds: v.optional(v.array(v.id("projects"))), // Selected portfolio project IDs for homepage
    projectsProjectIds: v.optional(v.array(v.id("projects"))), // Selected project IDs for projects section
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

    // Get existing homepage record or create new one
    const existing = await ctx.db
      .query("homepage")
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
      return await ctx.db.insert("homepage", {
        ...updates,
        updatedAt: now,
      });
    }
  },
});

