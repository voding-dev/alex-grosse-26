import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAdminWithSession } from "./adminAuth";

// List all notes with optional filtering
export const list = query({
  args: {
    folder: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    search: v.optional(v.string()), // Search in title and content
    sessionToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdminWithSession(ctx, args.sessionToken);
    
    let notes = await ctx.db.query("notes").order("desc").collect();
    
    // Filter by folder
    if (args.folder && args.folder !== "all") {
      if (args.folder === "uncategorized") {
        notes = notes.filter(n => !n.folder || n.folder === "");
      } else {
        notes = notes.filter(n => n.folder === args.folder);
      }
    }
    
    // Filter by tags
    if (args.tags && args.tags.length > 0) {
      notes = notes.filter(n => {
        return args.tags!.some(tag => n.tags.includes(tag));
      });
    }
    
    // Search in title and content
    if (args.search && args.search.trim().length > 0) {
      const searchLower = args.search.toLowerCase();
      notes = notes.filter(n => 
        n.title.toLowerCase().includes(searchLower) ||
        n.content.toLowerCase().includes(searchLower)
      );
    }
    
    // Sort: pinned first, then by updatedAt
    notes.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return b.updatedAt - a.updatedAt;
    });
    
    return notes;
  },
});

// Get single note by ID
export const get = query({
  args: {
    id: v.id("notes"),
    sessionToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdminWithSession(ctx, args.sessionToken);
    return await ctx.db.get(args.id);
  },
});

// Get all unique tags from notes
export const getAllTags = query({
  args: {
    sessionToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdminWithSession(ctx, args.sessionToken);
    
    const notes = await ctx.db.query("notes").collect();
    const tags = new Set<string>();
    
    notes.forEach(note => {
      note.tags.forEach(tag => tags.add(tag));
    });
    
    return Array.from(tags).sort();
  },
});

// Get all unique folder names
export const getAllFolders = query({
  args: {
    sessionToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdminWithSession(ctx, args.sessionToken);
    
    const notes = await ctx.db.query("notes").collect();
    const folders = new Set<string>();
    
    notes.forEach(note => {
      if (note.folder && note.folder.trim().length > 0) {
        folders.add(note.folder);
      }
    });
    
    return Array.from(folders).sort();
  },
});

// Create new note
export const create = mutation({
  args: {
    title: v.string(),
    content: v.string(),
    tags: v.array(v.string()),
    folder: v.optional(v.string()),
    isPinned: v.optional(v.boolean()),
    sessionToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdminWithSession(ctx, args.sessionToken);
    
    const now = Date.now();
    
    return await ctx.db.insert("notes", {
      title: args.title,
      content: args.content,
      tags: args.tags,
      folder: args.folder || undefined,
      isPinned: args.isPinned || false,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Update existing note
export const update = mutation({
  args: {
    id: v.id("notes"),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    folder: v.optional(v.string()),
    isPinned: v.optional(v.boolean()),
    sessionToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdminWithSession(ctx, args.sessionToken);
    
    const { id, sessionToken, ...updates } = args;
    const updateData: any = {
      updatedAt: Date.now(),
    };
    
    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.content !== undefined) updateData.content = updates.content;
    if (updates.tags !== undefined) updateData.tags = updates.tags;
    if (updates.folder !== undefined) updateData.folder = updates.folder || undefined;
    if (updates.isPinned !== undefined) updateData.isPinned = updates.isPinned;
    
    await ctx.db.patch(id, updateData);
    return await ctx.db.get(id);
  },
});

// Delete note
export const deleteNote = mutation({
  args: {
    id: v.id("notes"),
    sessionToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdminWithSession(ctx, args.sessionToken);
    await ctx.db.delete(args.id);
  },
});

// Pin/unpin note
export const togglePin = mutation({
  args: {
    id: v.id("notes"),
    sessionToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdminWithSession(ctx, args.sessionToken);
    
    const note = await ctx.db.get(args.id);
    if (!note) throw new Error("Note not found");
    
    await ctx.db.patch(args.id, {
      isPinned: !note.isPinned,
      updatedAt: Date.now(),
    });
    
    return await ctx.db.get(args.id);
  },
});
















