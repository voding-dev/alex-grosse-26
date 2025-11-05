import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./auth";

export const list = query({
  handler: async (ctx) => {
    const allPortfolio = await ctx.db
      .query("portfolio")
      .withIndex("by_status")
      .order("desc")
      .collect();
    // Sort by sortOrder ascending (default to 0 if not set)
    return allPortfolio.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  },
});

export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("portfolio")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
  },
});

// Public query: only approved/delivered portfolio items
export const listPublic = query({
  handler: async (ctx) => {
    const allPortfolio = await ctx.db
      .query("portfolio")
      .order("desc")
      .collect();
    
    // Only return approved or delivered portfolio items for public display
    const filtered = allPortfolio.filter(
      (p) => p.status === "approved" || p.status === "delivered"
    );
    // Sort by sortOrder ascending (default to 0 if not set)
    return filtered.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  },
});

export const getByCategory = query({
  args: { category: v.union(v.literal("photo"), v.literal("video"), v.literal("design"), v.literal("mixed")) },
  handler: async (ctx, args) => {
    const allPortfolio = await ctx.db
      .query("portfolio")
      .order("desc")
      .collect();
    
    // Filter portfolio items that contain the category AND are public (approved/delivered)
    const filtered = allPortfolio.filter(
      (portfolio) => 
        portfolio.categories.includes(args.category) &&
        (portfolio.status === "approved" || portfolio.status === "delivered")
    );
    // Sort by sortOrder ascending (default to 0 if not set)
    return filtered.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  },
});

export const get = query({
  args: { id: v.id("portfolio") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    slug: v.string(),
    clientName: v.string(),
    categories: v.array(v.union(v.literal("photo"), v.literal("video"), v.literal("design"), v.literal("mixed"))),
    status: v.union(
      v.literal("draft"),
      v.literal("review"),
      v.literal("approved"),
      v.literal("delivered"),
      v.literal("archived")
    ),
    notesPublic: v.optional(v.string()),
    notesPrivate: v.optional(v.string()),
    email: v.optional(v.string()), // Dev mode: email for admin check
  },
  handler: async (ctx, args) => {
    const { email, ...portfolioData } = args;
    
    // Development mode: check admin by email
    if (email) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_email", (q: any) => q.eq("email", email))
        .first();
      
      if (!user || user.role !== "admin") {
        throw new Error("Unauthorized - admin access required");
      }
    } else {
      // Production mode: use requireAdmin
      await requireAdmin(ctx);
    }
    
    const now = Date.now();
    // Get existing portfolio items to set sortOrder
    const existingPortfolio = await ctx.db
      .query("portfolio")
      .collect();
    const sortOrder = existingPortfolio.length > 0
      ? Math.max(...existingPortfolio.map((p) => p.sortOrder ?? 0)) + 1
      : 0;
    
    return await ctx.db.insert("portfolio", {
      ...portfolioData,
      sortOrder,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("portfolio"),
    title: v.optional(v.string()),
    slug: v.optional(v.string()),
    clientName: v.optional(v.string()),
    categories: v.optional(
      v.array(v.union(v.literal("photo"), v.literal("video"), v.literal("design"), v.literal("mixed")))
    ),
    status: v.optional(
      v.union(
        v.literal("draft"),
        v.literal("review"),
        v.literal("approved"),
        v.literal("delivered"),
        v.literal("archived")
      )
    ),
    coverAssetId: v.optional(v.id("assets")),
    notesPublic: v.optional(v.string()),
    notesPrivate: v.optional(v.string()),
    email: v.optional(v.string()), // Dev mode: email for admin check
  },
  handler: async (ctx, args) => {
    const { email, id, ...updates } = args;
    
    // Development mode: check admin by email
    if (email) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_email", (q: any) => q.eq("email", email))
        .first();
      
      if (!user || user.role !== "admin") {
        throw new Error("Unauthorized - admin access required");
      }
    } else {
      // Production mode: use requireAdmin
      await requireAdmin(ctx);
    }
    
    const portfolio = await ctx.db.get(id);
    if (!portfolio) throw new Error("Portfolio item not found");
    
    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });
    return id;
  },
});

export const remove = mutation({
  args: { 
    id: v.id("portfolio"),
    email: v.optional(v.string()), // Dev mode: email for admin check
  },
  handler: async (ctx, args) => {
    const { email, id } = args;
    
    // Development mode: check admin by email
    if (email) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_email", (q: any) => q.eq("email", email))
        .first();
      
      if (!user || user.role !== "admin") {
        throw new Error("Unauthorized - admin access required");
      }
    } else {
      // Production mode: use requireAdmin
      await requireAdmin(ctx);
    }
    
    // Delete all associated assets first
    const assets = await ctx.db
      .query("assets")
      .withIndex("by_portfolio", (q) => q.eq("portfolioId", id))
      .collect();
    
    for (const asset of assets) {
      await ctx.db.delete(asset._id);
    }
    
    // Delete the portfolio item
    await ctx.db.delete(id);
  },
});

// Delete all portfolio items and their assets (for cleanup)
export const deleteAll = mutation({
  args: {
    email: v.optional(v.string()), // Dev mode: email for admin check
  },
  handler: async (ctx, args) => {
    const { email } = args;
    
    // Development mode: check admin by email
    if (email) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_email", (q: any) => q.eq("email", email))
        .first();
      
      if (!user || user.role !== "admin") {
        throw new Error("Unauthorized - admin access required");
      }
    } else {
      // Production mode: use requireAdmin
      await requireAdmin(ctx);
    }
    
    // Get all portfolio items
    const allPortfolio = await ctx.db
      .query("portfolio")
      .collect();
    
    let deletedCount = 0;
    
    // Delete all portfolio items and their assets
    for (const portfolio of allPortfolio) {
      // Delete all associated assets first
      const assets = await ctx.db
        .query("assets")
        .withIndex("by_portfolio", (q) => q.eq("portfolioId", portfolio._id))
        .collect();
      
      for (const asset of assets) {
        await ctx.db.delete(asset._id);
      }
      
      // Delete the portfolio item
      await ctx.db.delete(portfolio._id);
      deletedCount++;
    }
    
    return { deletedCount };
  },
});

// Reorder portfolio items
export const reorder = mutation({
  args: {
    ids: v.array(v.id("portfolio")),
    email: v.optional(v.string()), // Dev mode: email for admin check
  },
  handler: async (ctx, args) => {
    const { email: adminEmail, ids } = args;

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

    // Validate input
    if (!ids || ids.length === 0) {
      throw new Error("No portfolio item IDs provided");
    }

    // Validate that all IDs exist and update sort order
    for (let i = 0; i < ids.length; i++) {
      const item = await ctx.db.get(ids[i]);
      if (!item) {
        throw new Error(`Portfolio item with id ${ids[i]} not found`);
      }
      
      // Patch with sortOrder - this will work even if sortOrder doesn't exist yet
      // because it's an optional field in the schema
      try {
        await ctx.db.patch(ids[i], {
          sortOrder: i,
          updatedAt: Date.now(),
        });
      } catch (error: any) {
        throw new Error(`Failed to update portfolio item ${ids[i]}: ${error.message}`);
      }
    }
  },
});

