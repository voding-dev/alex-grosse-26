import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAdminWithSession } from "./adminAuth";
import { Id } from "./_generated/dataModel";

// List all folders with hierarchy
export const list = query({
  args: {
    parentFolderId: v.optional(v.id("folders")),
    sessionToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdminWithSession(ctx, args.sessionToken);
    
    let folders = await ctx.db.query("folders").collect();
    
    // Filter by parent if specified
    if (args.parentFolderId !== undefined) {
      folders = folders.filter((f) => f.parentFolderId === args.parentFolderId);
    } else {
      // If no parent specified, return all folders
      folders = folders;
    }
    
    // Sort by name
    folders.sort((a, b) => a.name.localeCompare(b.name));
    
    return folders;
  },
});

// Get folder by ID
export const get = query({
  args: {
    id: v.id("folders"),
    sessionToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdminWithSession(ctx, args.sessionToken);
    return await ctx.db.get(args.id);
  },
});

// Get folder hierarchy (all folders with their children)
export const getHierarchy = query({
  args: {
    sessionToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdminWithSession(ctx, args.sessionToken);
    
    const allFolders = await ctx.db.query("folders").collect();
    
    // Build hierarchy
    const rootFolders = allFolders.filter((f) => !f.parentFolderId);
    const folderMap = new Map<Id<"folders">, typeof allFolders[0] & { children: any[] }>();
    
    // Initialize map
    allFolders.forEach((f) => {
      folderMap.set(f._id, { ...f, children: [] });
    });
    
    // Build tree
    allFolders.forEach((f) => {
      if (f.parentFolderId) {
        const parent = folderMap.get(f.parentFolderId);
        if (parent) {
          parent.children.push(folderMap.get(f._id)!);
        }
      }
    });
    
    return rootFolders.map((f) => folderMap.get(f._id)!);
  },
});

// Create folder
export const create = mutation({
  args: {
    name: v.string(),
    parentFolderId: v.optional(v.id("folders")),
    color: v.optional(v.string()),
    sessionToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdminWithSession(ctx, args.sessionToken);
    
    const now = Date.now();
    
    return await ctx.db.insert("folders", {
      name: args.name,
      parentFolderId: args.parentFolderId,
      color: args.color,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Update folder
export const update = mutation({
  args: {
    id: v.id("folders"),
    name: v.optional(v.string()),
    parentFolderId: v.optional(v.id("folders")),
    color: v.optional(v.string()),
    sessionToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdminWithSession(ctx, args.sessionToken);
    
    const { id, sessionToken, ...updates } = args;
    const updateData: any = {
      updatedAt: Date.now(),
    };
    
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.parentFolderId !== undefined) updateData.parentFolderId = updates.parentFolderId;
    if (updates.color !== undefined) updateData.color = updates.color;
    
    await ctx.db.patch(id, updateData);
    return await ctx.db.get(id);
  },
});

// Delete folder
export const deleteFolder = mutation({
  args: {
    id: v.id("folders"),
    sessionToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdminWithSession(ctx, args.sessionToken);
    
    // Check if folder has children
    const children = await ctx.db
      .query("folders")
      .withIndex("by_parent", (q) => q.eq("parentFolderId", args.id))
      .collect();
    
    if (children.length > 0) {
      throw new Error("Cannot delete folder with children. Please delete or move children first.");
    }
    
    // Check if folder has tasks
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_folder", (q) => q.eq("folderId", args.id))
      .collect();
    
    if (tasks.length > 0) {
      throw new Error("Cannot delete folder with tasks. Please move or delete tasks first.");
    }
    
    await ctx.db.delete(args.id);
  },
});

