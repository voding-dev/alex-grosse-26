import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./auth";

export const list = query({
  handler: async (ctx) => {
    return await ctx.db
      .query("projects")
      .withIndex("by_status")
      .order("desc")
      .collect();
  },
});

export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("projects")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
  },
});

// Public query: only approved/delivered projects
export const listPublic = query({
  handler: async (ctx) => {
    const allProjects = await ctx.db
      .query("projects")
      .order("desc")
      .collect();
    
    // Only return approved or delivered projects for public display
    return allProjects.filter(
      (p) => p.status === "approved" || p.status === "delivered"
    );
  },
});

export const getByCategory = query({
  args: { category: v.union(v.literal("photo"), v.literal("video"), v.literal("design"), v.literal("mixed")) },
  handler: async (ctx, args) => {
    const allProjects = await ctx.db
      .query("projects")
      .order("desc")
      .collect();
    
    // Filter projects that contain the category AND are public (approved/delivered)
    return allProjects.filter(
      (project) => 
        project.categories.includes(args.category) &&
        (project.status === "approved" || project.status === "delivered")
    );
  },
});

export const get = query({
  args: { id: v.id("projects") },
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
    const { email, ...projectData } = args;
    
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
    return await ctx.db.insert("projects", {
      ...projectData,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("projects"),
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
    
    const project = await ctx.db.get(id);
    if (!project) throw new Error("Project not found");
    
    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });
    return id;
  },
});

export const remove = mutation({
  args: { 
    id: v.id("projects"),
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
      .withIndex("by_project", (q) => q.eq("projectId", id))
      .collect();
    
    for (const asset of assets) {
      await ctx.db.delete(asset._id);
    }
    
    // Delete the project
    await ctx.db.delete(id);
  },
});

// Delete all projects and their assets (for website editor cleanup)
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
    
    // Get all projects
    const allProjects = await ctx.db
      .query("projects")
      .collect();
    
    let deletedCount = 0;
    
    // Delete all projects and their assets
    for (const project of allProjects) {
      // Delete all associated assets first
      const assets = await ctx.db
        .query("assets")
        .withIndex("by_project", (q) => q.eq("projectId", project._id))
        .collect();
      
      for (const asset of assets) {
        await ctx.db.delete(asset._id);
      }
      
      // Delete the project
      await ctx.db.delete(project._id);
      deletedCount++;
    }
    
    // Clear homepage project references
    const existingHomepage = await ctx.db
      .query("homepage")
      .order("desc")
      .first();
    
    if (existingHomepage) {
      await ctx.db.patch(existingHomepage._id, {
        portfolioProjectIds: [],
        projectsProjectIds: [],
        updatedAt: Date.now(),
      });
    }
    
    return { deletedCount };
  },
});

