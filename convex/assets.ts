import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./auth";
import { requireAdminWithSession } from "./adminAuth";

export const list = query({
  args: { 
    projectId: v.optional(v.id("projects")),
    deliveryId: v.optional(v.id("deliveries")),
    uploadType: v.optional(v.union(v.literal("portfolio"), v.literal("project"), v.literal("delivery"))), // Filter by upload type
  },
  handler: async (ctx, args) => {
    if (args.deliveryId) {
      // If both deliveryId and uploadType are provided, use the compound index
      if (args.uploadType) {
        return await ctx.db
          .query("assets")
          .withIndex("by_delivery_and_upload_type", (q) => 
            q.eq("deliveryId", args.deliveryId!).eq("uploadType", args.uploadType!)
          )
          .order("asc")
          .collect();
      }
      // If only deliveryId is provided, get all assets for that delivery
      return await ctx.db
        .query("assets")
        .withIndex("by_delivery", (q) => q.eq("deliveryId", args.deliveryId!))
        .order("asc")
        .collect();
    }
    
    if (args.projectId) {
      // If both projectId and uploadType are provided, use the compound index
      if (args.uploadType) {
        return await ctx.db
          .query("assets")
          .withIndex("by_project_and_upload_type", (q) => 
            q.eq("projectId", args.projectId!).eq("uploadType", args.uploadType!)
          )
          .order("asc")
          .collect();
      }
      // If only projectId is provided, get all assets for that project
      return await ctx.db
        .query("assets")
        .withIndex("by_project", (q) => q.eq("projectId", args.projectId!))
        .order("asc")
        .collect();
    }
    
    // If only uploadType is provided (no projectId/deliveryId), filter by uploadType
    if (args.uploadType) {
      return await ctx.db
        .query("assets")
        .withIndex("by_upload_type", (q) => q.eq("uploadType", args.uploadType!))
        .order("desc")
        .collect();
    }
    
    // No filters - return all assets
    return await ctx.db.query("assets").order("desc").collect();
  },
});

// Separate query for portfolio assets
export const listPortfolio = query({
  args: { portfolioId: v.optional(v.id("portfolio")) },
  handler: async (ctx, args) => {
    if (args.portfolioId) {
      const assets = await ctx.db
        .query("assets")
        .withIndex("by_portfolio", (q) => q.eq("portfolioId", args.portfolioId!))
        .collect();
      // Sort by sortOrder ascending
      return assets.sort((a, b) => a.sortOrder - b.sortOrder);
    }
    const assets = await ctx.db
      .query("assets")
      .withIndex("by_upload_type", (q) => q.eq("uploadType", "portfolio"))
      .collect();
    // Sort by sortOrder ascending
    return assets.sort((a, b) => a.sortOrder - b.sortOrder);
  },
});

// Separate query for project assets
export const listProject = query({
  args: { projectId: v.optional(v.id("projects")) },
  handler: async (ctx, args) => {
    if (args.projectId) {
      const assets = await ctx.db
        .query("assets")
        .withIndex("by_project_and_upload_type", (q) => 
          q.eq("projectId", args.projectId!).eq("uploadType", "project")
        )
        .collect();
      // Sort by sortOrder ascending
      return assets.sort((a, b) => a.sortOrder - b.sortOrder);
    }
    const assets = await ctx.db
      .query("assets")
      .withIndex("by_upload_type", (q) => q.eq("uploadType", "project"))
      .collect();
    // Sort by sortOrder ascending
    return assets.sort((a, b) => a.sortOrder - b.sortOrder);
  },
});

export const get = query({
  args: { id: v.id("assets") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const create = mutation({
  args: {
    projectId: v.optional(v.id("projects")),
    portfolioId: v.optional(v.id("portfolio")), // Portfolio assets - separate from projects
    deliveryId: v.optional(v.id("deliveries")), // Delivery assets - separate from projects
    uploadType: v.optional(v.union(v.literal("portfolio"), v.literal("project"), v.literal("delivery"))), // Separates portfolio uploads, project uploads, and delivery uploads
    type: v.union(v.literal("image"), v.literal("video"), v.literal("pdf"), v.literal("other")),
    filename: v.string(),
    storageKey: v.string(), // Can be empty string for external videos
    previewKey: v.optional(v.string()),
    videoUrl: v.optional(v.string()), // YouTube/Vimeo URL for embedded videos
    width: v.optional(v.number()),
    height: v.optional(v.number()),
    duration: v.optional(v.number()),
    size: v.number(), // Can be 0 for external videos
    sortOrder: v.optional(v.number()),
    email: v.optional(v.string()), // Dev mode: email for admin check
  },
  handler: async (ctx, args) => {
    const { email, ...assetData } = args;
    
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
    
    // Auto-assign sort order if not provided
    let sortOrder = assetData.sortOrder;
    if (sortOrder === undefined) {
      if (assetData.portfolioId) {
        // Get existing assets for this portfolio to calculate sort order
        const existingAssets = await ctx.db
          .query("assets")
          .withIndex("by_portfolio", (q) => q.eq("portfolioId", assetData.portfolioId!))
          .collect();
        sortOrder = existingAssets.length;
      } else if (assetData.deliveryId) {
        // Get existing assets for this delivery and uploadType to calculate sort order
        let existingAssets;
        if (assetData.uploadType) {
          // Use compound index if both deliveryId and uploadType are specified
          existingAssets = await ctx.db
            .query("assets")
            .withIndex("by_delivery_and_upload_type", (q) => 
              q.eq("deliveryId", assetData.deliveryId!).eq("uploadType", assetData.uploadType)
            )
            .collect();
        } else {
          // If no uploadType specified, count all assets for this delivery
          existingAssets = await ctx.db
            .query("assets")
            .withIndex("by_delivery", (q) => q.eq("deliveryId", assetData.deliveryId!))
            .collect();
        }
        sortOrder = existingAssets.length;
      } else if (assetData.projectId) {
        // Get existing assets for this project and uploadType to calculate sort order
        let existingAssets;
        if (assetData.uploadType) {
          // Use compound index if both projectId and uploadType are specified
          existingAssets = await ctx.db
            .query("assets")
            .withIndex("by_project_and_upload_type", (q) => 
              q.eq("projectId", assetData.projectId!).eq("uploadType", assetData.uploadType)
            )
            .collect();
        } else {
          // If no uploadType specified, count all assets for this project
          existingAssets = await ctx.db
            .query("assets")
            .withIndex("by_project", (q) => q.eq("projectId", assetData.projectId!))
            .collect();
        }
        sortOrder = existingAssets.length;
      } else {
        sortOrder = 0;
      }
    }
    
    const assetId = await ctx.db.insert("assets", {
      ...assetData,
      sortOrder,
      approved: false,
      createdAt: Date.now(),
    });

    // Automatically create media library entry for images and videos from portfolios/projects
    // Skip for delivery items and external videos
    if (
      (assetData.type === "image" || assetData.type === "video") &&
      assetData.storageKey && // Only for actual uploaded files, not external videos
      (assetData.portfolioId || assetData.projectId) &&
      assetData.uploadType !== "delivery" // Skip delivery items
    ) {
      try {
        // Get portfolio or project name for display location
        let entityName: string | undefined;
        let entityId: string;
        let locationType: "portfolio" | "project";

        if (assetData.portfolioId) {
          const portfolio = await ctx.db.get(assetData.portfolioId);
          entityName = portfolio?.title;
          entityId = assetData.portfolioId;
          locationType = "portfolio";
        } else if (assetData.projectId) {
          const project = await ctx.db.get(assetData.projectId);
          entityName = project?.title;
          entityId = assetData.projectId;
          locationType = "project";
        } else {
          return assetId; // Shouldn't happen, but safety check
        }

        // Check if already exists in media library (by storage key)
        const existing = await ctx.db
          .query("mediaLibrary")
          .filter((q) => q.eq(q.field("storageKey"), assetData.storageKey))
          .first();

        if (!existing) {
          // Create media library entry
          const now = Date.now();
          await ctx.db.insert("mediaLibrary", {
            filename: assetData.filename,
            storageKey: assetData.storageKey,
            type: assetData.type === "image" ? "image" : "video",
            width: assetData.width,
            height: assetData.height,
            duration: assetData.duration,
            size: assetData.size,
            canonicalUrl: undefined,
            tags: [],
            folder: undefined,
            alt: undefined,
            description: undefined,
            sourceAssetId: assetId,
            sourceType: "asset",
            displayLocations: [
              {
                type: locationType,
                entityId: entityId,
                entityName: entityName,
              },
            ],
            createdAt: now,
            updatedAt: now,
          });
        } else {
          // Update existing entry to add display location if not already present
          const locationExists = existing.displayLocations.some(
            (loc) => loc.type === locationType && loc.entityId === entityId
          );
          if (!locationExists) {
            const updatedLocations = [
              ...existing.displayLocations,
              {
                type: locationType,
                entityId: entityId,
                entityName: entityName,
              },
            ];
            const now = Date.now();
            await ctx.db.patch(existing._id, {
              displayLocations: updatedLocations,
              updatedAt: now,
            });
          }
        }
      } catch (error) {
        // Log error but don't fail the asset creation
        console.error("Failed to create media library entry:", error);
      }
    }

    return assetId;
  },
});

export const update = mutation({
  args: {
    id: v.id("assets"),
    projectId: v.optional(v.id("projects")),
    uploadType: v.optional(v.union(v.literal("portfolio"), v.literal("project"))),
    filename: v.optional(v.string()),
    previewKey: v.optional(v.string()),
    videoUrl: v.optional(v.string()), // YouTube/Vimeo URL for embedded videos
    approved: v.optional(v.boolean()),
    sortOrder: v.optional(v.number()),
    email: v.optional(v.string()), // Dev mode: email for admin check
  },
  handler: async (ctx, args) => {
    const { email, ...updates } = args;
    
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
    
    const { id, ...updateData } = updates;
    await ctx.db.patch(id, updateData);
    return id;
  },
});

export const remove = mutation({
  args: { 
    id: v.id("assets"),
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
    await ctx.db.delete(args.id);
  },
});

export const reorder = mutation({
  args: {
    assetIds: v.array(v.id("assets")),
    email: v.optional(v.string()), // Dev mode: email for admin check
  },
  handler: async (ctx, args) => {
    const { email, assetIds } = args;
    
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
    for (let i = 0; i < args.assetIds.length; i++) {
      await ctx.db.patch(args.assetIds[i], { sortOrder: i });
    }
  },
});

