import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAdminWithSession } from "./adminAuth";

export const list = query({
  args: {
    sessionToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdminWithSession(ctx, args.sessionToken);
    const items = await ctx.db.query("pitchDecks").order("desc").collect();
    return items;
  },
});

export const get = query({
  args: { id: v.id("pitchDecks") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const create = mutation({
  args: {
    sessionToken: v.optional(v.string()),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAdminWithSession(ctx, args.sessionToken);
    const now = Date.now();
    return await ctx.db.insert("pitchDecks", {
      title: args.title,
      coverDescription: "",
      preparedFor: "",
      preparedDate: "",
      coverMediaUrls: [],
      scopeOfWork: "",
      preProduction: "",
      production: "",
      postProduction: "",
      imageryMediaUrls: [],
      estimate: "",
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    sessionToken: v.optional(v.string()),
    id: v.id("pitchDecks"),
    title: v.optional(v.string()),
    coverDescription: v.optional(v.string()),
    preparedFor: v.optional(v.string()),
    preparedDate: v.optional(v.string()),
    coverMediaUrls: v.optional(v.array(v.string())),
    scopeOfWork: v.optional(v.string()),
    preProduction: v.optional(v.string()),
    production: v.optional(v.string()),
    postProduction: v.optional(v.string()),
    imageryMediaUrls: v.optional(v.array(v.string())),
    estimate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdminWithSession(ctx, args.sessionToken);
    const { id, sessionToken, ...updates } = args;
    const existing = await ctx.db.get(id);
    if (!existing) throw new Error("Not found");
    await ctx.db.patch(id, { ...updates, updatedAt: Date.now() });
  },
});

export const remove = mutation({
  args: { sessionToken: v.optional(v.string()), id: v.id("pitchDecks") },
  handler: async (ctx, args) => {
    await requireAdminWithSession(ctx, args.sessionToken);
    await ctx.db.delete(args.id);
  },
});


