import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./auth";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const bcrypt = require("bcryptjs");

export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("deliveries")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();
  },
});

export const get = query({
  args: { id: v.id("deliveries") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Removed listByProject - deliveries are now standalone and don't need project grouping

export const list = query({
  args: { email: v.optional(v.string()) },
  handler: async (ctx, args) => {
    // Development mode: check admin by email
    if (args.email) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_email", (q: any) => q.eq("email", args.email!))
        .first();
      
      if (!user || user.role !== "admin") {
        throw new Error("Unauthorized - admin access required");
      }
    } else {
      // Production mode: use requireAdmin
      await requireAdmin(ctx);
    }
    
    return await ctx.db
      .query("deliveries")
      .order("desc")
      .collect();
  },
});

export const listAll = query({
  args: { email: v.optional(v.string()) },
  handler: async (ctx, args) => {
    // Development mode: check admin by email
    if (args.email) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_email", (q: any) => q.eq("email", args.email!))
        .first();
      
      if (!user || user.role !== "admin") {
        throw new Error("Unauthorized - admin access required");
      }
    } else {
      // Production mode: use requireAdmin
      await requireAdmin(ctx);
    }
    
    return await ctx.db
      .query("deliveries")
      .order("desc")
      .collect();
  },
});

export const verifyPin = mutation({
  args: {
    slug: v.string(),
    pin: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const delivery = await ctx.db
      .query("deliveries")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();

    if (!delivery) {
      throw new Error("Delivery not found");
    }

    // Check both free expiration and paid storage expiration
    const now = Date.now();
    const isFreeExpired = delivery.expiresAt && delivery.expiresAt < now;
    const isPaidStorageActive = delivery.storageSubscriptionStatus === "active" && 
                                 delivery.storageSubscriptionExpiresAt && 
                                 delivery.storageSubscriptionExpiresAt > now;
    
    // If free storage expired AND no active paid storage, deny access
    if (isFreeExpired && !isPaidStorageActive) {
      throw new Error("Delivery has expired. Please contact admin or subscribe to monthly storage.");
    }

    // If no PIN is set for this delivery, allow access
    if (!delivery.pinHash) {
      await ctx.db.insert("events", {
        deliveryId: delivery._id,
        type: "view",
        meta: { success: true, pinRequired: false },
        createdAt: Date.now(),
      });
      return { success: true, deliveryId: delivery._id };
    }

    const isValid = args.pin ? bcrypt.compareSync(args.pin, delivery.pinHash) : false;
    
    if (!isValid) {
      // Log failed attempt
      await ctx.db.insert("events", {
        deliveryId: delivery._id,
        type: "pin_attempt",
        meta: { success: false },
        createdAt: Date.now(),
      });
      throw new Error("Invalid PIN");
    }

    // Log successful access
    await ctx.db.insert("events", {
      deliveryId: delivery._id,
      type: "view",
      meta: { success: true },
      createdAt: Date.now(),
    });

    return { success: true, deliveryId: delivery._id };
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    clientName: v.string(),
    slug: v.string(),
    pin: v.optional(v.string()),
    expiresAt: v.optional(v.number()),
    watermark: v.boolean(),
    allowZip: v.boolean(),
    allowedAssetIds: v.optional(v.array(v.id("assets"))),
    notesPublic: v.optional(v.string()),
    email: v.optional(v.string()), // Dev mode: email for admin check
  },
  handler: async (ctx, args) => {
    const { email, ...deliveryData } = args;
    
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
    
    const pinHash = deliveryData.pin ? bcrypt.hashSync(deliveryData.pin, 10) : undefined;
    const now = Date.now();
    
    // Default expiration: 30 days from now if not specified
    const defaultExpiration = deliveryData.expiresAt || (now + 30 * 24 * 60 * 60 * 1000);
    
    return await ctx.db.insert("deliveries", {
      title: deliveryData.title,
      clientName: deliveryData.clientName,
      slug: deliveryData.slug,
      pinHash,
      pinPlaintext: deliveryData.pin, // Store plaintext for admin viewing
      expiresAt: defaultExpiration,
      originalDeliveryDate: now,
      watermark: deliveryData.watermark,
      allowZip: deliveryData.allowZip,
      allowedAssetIds: deliveryData.allowedAssetIds || [],
      notesPublic: deliveryData.notesPublic,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("deliveries"),
    title: v.optional(v.string()),
    clientName: v.optional(v.string()),
    slug: v.optional(v.string()),
    pin: v.optional(v.string()),
    expiresAt: v.optional(v.number()),
    watermark: v.optional(v.boolean()),
    allowZip: v.optional(v.boolean()),
    allowedAssetIds: v.optional(v.array(v.id("assets"))),
    notesPublic: v.optional(v.string()),
    email: v.optional(v.string()), // Dev mode: email for admin check
  },
  handler: async (ctx, args) => {
    const { email, id, pin, ...updates } = args;
    
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
    
    const updateData: any = {
      ...updates,
      updatedAt: Date.now(),
    };

    if (pin) {
      updateData.pinHash = bcrypt.hashSync(pin, 10);
      updateData.pinPlaintext = pin; // Store plaintext for admin viewing
    }

    await ctx.db.patch(id, updateData);
    return id;
  },
});

// Reset PIN to a new random PIN
export const resetPin = mutation({
  args: {
    id: v.id("deliveries"),
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

    // Generate a random 4-digit PIN
    const newPin = Math.floor(1000 + Math.random() * 9000).toString();
    const pinHash = bcrypt.hashSync(newPin, 10);

    await ctx.db.patch(id, {
      pinHash,
      pinPlaintext: newPin,
      updatedAt: Date.now(),
    });

    return { pin: newPin };
  },
});

export const expire = mutation({
  args: { id: v.id("deliveries") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.patch(args.id, {
      expiresAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

