import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./auth";

// List all QR codes
export const list = query({
  handler: async (ctx) => {
    return await ctx.db
      .query("qr_codes")
      .withIndex("by_created_at")
      .order("desc")
      .collect();
  },
});

// Get QR code by ID
export const get = query({
  args: { id: v.id("qr_codes") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Create QR code (returns ID)
export const create = mutation({
  args: {
    label: v.string(),
    type: v.union(v.literal("static"), v.literal("dynamic")),
    content: v.optional(v.string()),
    destination_url: v.optional(v.string()),
    svg_data: v.string(),
    email: v.optional(v.string()), // Dev mode: email for admin check
  },
  handler: async (ctx, args) => {
    const { email, ...qrCodeData } = args;
    
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
    return await ctx.db.insert("qr_codes", {
      ...qrCodeData,
      scan_count: 0,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Update QR code (used for updating SVG or destination URL)
export const update = mutation({
  args: {
    id: v.id("qr_codes"),
    label: v.optional(v.string()),
    destination_url: v.optional(v.string()),
    svg_data: v.optional(v.string()),
    email: v.optional(v.string()), // Dev mode: email for admin check
  },
  handler: async (ctx, args) => {
    const { id, email, ...updates } = args;
    
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
    
    const qrCode = await ctx.db.get(id);
    if (!qrCode) throw new Error("QR code not found");

    // If destination_url is being changed, log it to history
    if (updates.destination_url !== undefined && qrCode.type === "dynamic") {
      const oldUrl = qrCode.destination_url;
      const newUrl = updates.destination_url;
      
      // Only log if URL actually changed
      if (oldUrl !== newUrl) {
        await ctx.db.insert("qr_url_history", {
          qr_code_id: id,
          old_url: oldUrl || undefined,
          new_url: newUrl || "",
          changed_at: Date.now(),
        });
      }
    }

    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });
    return id;
  },
});

// Delete QR code
export const remove = mutation({
  args: { 
    id: v.id("qr_codes"),
    email: v.optional(v.string()), // Dev mode: email for admin check
  },
  handler: async (ctx, args) => {
    const { id, email } = args;
    
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
    
    await ctx.db.delete(id);
  },
});

// Increment scan count and log scan (used by redirect API)
export const logScan = mutation({
  args: {
    qr_code_id: v.id("qr_codes"),
    user_agent: v.optional(v.string()),
    ip_address: v.optional(v.string()),
    referer: v.optional(v.string()),
    country: v.optional(v.string()),
    city: v.optional(v.string()),
    device_type: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { qr_code_id, ...scanData } = args;
    
    // Increment scan count
    const qrCode = await ctx.db.get(qr_code_id);
    if (!qrCode) throw new Error("QR code not found");
    
    await ctx.db.patch(qr_code_id, {
      scan_count: qrCode.scan_count + 1,
    });

    // Log scan analytics
    await ctx.db.insert("qr_scans", {
      qr_code_id,
      scanned_at: Date.now(),
      ...scanData,
    });
  },
});

// Get URL history for a QR code
export const getUrlHistory = query({
  args: { qr_code_id: v.id("qr_codes") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("qr_url_history")
      .withIndex("by_qr_code_id", (q) => q.eq("qr_code_id", args.qr_code_id))
      .order("desc")
      .collect();
  },
});

// Get scans for a QR code
export const getScans = query({
  args: { 
    qr_code_id: v.id("qr_codes"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const scans = await ctx.db
      .query("qr_scans")
      .withIndex("by_qr_code_id", (q) => q.eq("qr_code_id", args.qr_code_id))
      .order("desc")
      .collect();
    
    // Limit results if specified
    if (args.limit) {
      return scans.slice(0, args.limit);
    }
    return scans;
  },
});

