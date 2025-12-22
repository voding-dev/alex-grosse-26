import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./auth";

// Get homepage content
export const get = query({
  handler: async (ctx) => {
    try {
      // Use the index to get the most recent homepage record
      const homepage = await ctx.db
        .query("homepage")
        .withIndex("by_updated")
        .order("desc")
        .first();
      
      if (!homepage) {
        return null;
      }
      
      // Validate and filter out invalid project references
      // This prevents errors when project IDs reference deleted projects
      const validateProjectIds = async (ids: string[] | undefined): Promise<string[]> => {
        if (!ids || ids.length === 0) return [];
        const checks = await Promise.all(
          ids.map(async (id) => {
            try {
              const project = await ctx.db.get(id);
              return project ? id : null;
            } catch {
              return null;
            }
          })
        );
        return checks.filter((id): id is string => id !== null);
      };
      
      const validPortfolioIds = await validateProjectIds(homepage.portfolioProjectIds);
      const validProjectIds = await validateProjectIds(homepage.projectsProjectIds);
      
      // Return the homepage with validated project IDs
      // Always use the validated IDs (even if empty array) to ensure no invalid references
      return {
        ...homepage,
        portfolioProjectIds: validPortfolioIds,
        projectsProjectIds: validProjectIds,
      };
    } catch (error: any) {
      // Log error and return null to prevent client crash
      console.error("homepage.get error:", error);
      return null;
    }
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
      .withIndex("by_updated")
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

