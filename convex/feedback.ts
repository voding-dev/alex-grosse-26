import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Query to get unread feedback for admin notifications
export const getUnreadFeedbackCount = query({
  args: { email: v.optional(v.string()) },
  handler: async (ctx, args) => {
    // Get all deliveries (admin only)
    // For dev mode, check by email
    if (args.email) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_email", (q: any) => q.eq("email", args.email!))
        .first();
      
      if (!user || user.role !== "admin") {
        return 0;
      }
    }

    // Get all feedback from last 7 days (or mark as read/unread via events)
    const recentFeedback = await ctx.db
      .query("feedback")
      .order("desc")
      .take(100); // Get recent feedback

    // Count feedback from last 24 hours (unread)
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const unreadCount = recentFeedback.filter(
      (f) => f.createdAt > oneDayAgo
    ).length;

    return unreadCount;
  },
});

// Query to get recent feedback for admin dashboard
export const getRecentFeedback = query({
  args: { email: v.optional(v.string()), limit: v.optional(v.number()), includeArchived: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    // Admin check
    if (args.email) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_email", (q: any) => q.eq("email", args.email!))
        .first();
      
      if (!user || user.role !== "admin") {
        return [];
      }
    }

    const limit = args.limit || 10;
    const includeArchived = args.includeArchived ?? false;
    
    let feedback = await ctx.db
      .query("feedback")
      .order("desc")
      .take(limit * 2); // Get more to filter

    // Filter out archived if not including them
    if (!includeArchived) {
      feedback = feedback.filter((f) => !f.archived);
    }

    // Take only the limit after filtering
    feedback = feedback.slice(0, limit);

    // Enrich with delivery info (no longer need project info)
    const enrichedFeedback = await Promise.all(
      feedback.map(async (f) => {
        const delivery = await ctx.db.get(f.deliveryId);
        return {
          ...f,
          delivery,
        };
      })
    );

    return enrichedFeedback;
  },
});

// Query to get feedback for a specific delivery
export const listByDelivery = query({
  args: { deliveryId: v.id("deliveries") },
  handler: async (ctx, args) => {
    const feedback = await ctx.db
      .query("feedback")
      .withIndex("by_delivery", (q) => q.eq("deliveryId", args.deliveryId))
      .order("desc")
      .collect();

    return feedback;
  },
});

// Mutation to create feedback
export const create = mutation({
  args: {
    deliveryId: v.id("deliveries"),
    assetId: v.optional(v.id("assets")),
    body: v.string(),
    decision: v.optional(v.union(v.literal("approve"), v.literal("reject"), v.literal("changes"))),
  },
  handler: async (ctx, args) => {
    const delivery = await ctx.db.get(args.deliveryId);
    if (!delivery) {
      throw new Error("Delivery not found");
    }
    
    // Try to find project by client name
    let projectId: any = undefined;
    let contactId: any = undefined;
    
    if (delivery.clientName) {
      // Find project by client name
      const projects = await ctx.db
        .query("clientProjects")
        .withIndex("by_client", (q: any) => q.eq("clientName", delivery.clientName))
        .collect();
      
      // Get the most recent active project for this client
      const activeProject = projects
        .filter((p: any) => p.status !== "completed" && p.status !== "cancelled")
        .sort((a: any, b: any) => b.createdAt - a.createdAt)[0];
      
      if (activeProject) {
        projectId = activeProject._id;
        contactId = activeProject.contactId;
      } else if (projects.length > 0) {
        // Use most recent project even if completed
        const recentProject = projects.sort((a: any, b: any) => b.createdAt - a.createdAt)[0];
        projectId = recentProject._id;
        contactId = recentProject.contactId;
      } else {
        // Try to find contact by business name
        const contacts = await ctx.db.query("contacts").collect();
        const matchingContact = contacts.find(
          (c: any) => c.businessName?.toLowerCase() === delivery.clientName.toLowerCase()
        );
        if (matchingContact) {
          contactId = matchingContact._id;
        }
      }
    }
    
    const now = Date.now();
    const feedbackId = await ctx.db.insert("feedback", {
      ...args,
      author: "client", // Required by schema
      projectId: projectId,
      contactId: contactId,
      createdAt: now,
    });
    
    // Auto-notify via email if enabled (schedule for async processing)
    // This would be handled by a scheduled function or webhook
    
    return feedbackId;
  },
});

// Mutation to mark feedback as complete
export const markComplete = mutation({
  args: {
    id: v.id("feedback"),
    email: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Admin check
    if (args.email) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_email", (q: any) => q.eq("email", args.email!))
        .first();
      
      if (!user || user.role !== "admin") {
        throw new Error("Unauthorized");
      }
    }

    const feedback = await ctx.db.get(args.id);
    if (!feedback) {
      throw new Error("Feedback not found");
    }

    await ctx.db.patch(args.id, {
      completedAt: Date.now(),
    });

    return { success: true };
  },
});

// Mutation to archive feedback
export const archive = mutation({
  args: {
    id: v.id("feedback"),
    email: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Admin check
    if (args.email) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_email", (q: any) => q.eq("email", args.email!))
        .first();
      
      if (!user || user.role !== "admin") {
        throw new Error("Unauthorized");
      }
    }

    const feedback = await ctx.db.get(args.id);
    if (!feedback) {
      throw new Error("Feedback not found");
    }

    await ctx.db.patch(args.id, {
      archived: true,
    });

    return { success: true };
  },
});

// Mutation to unarchive feedback
export const unarchive = mutation({
  args: {
    id: v.id("feedback"),
    email: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Admin check
    if (args.email) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_email", (q: any) => q.eq("email", args.email!))
        .first();
      
      if (!user || user.role !== "admin") {
        throw new Error("Unauthorized");
      }
    }

    const feedback = await ctx.db.get(args.id);
    if (!feedback) {
      throw new Error("Feedback not found");
    }

    await ctx.db.patch(args.id, {
      archived: false,
    });

    return { success: true };
  },
});

// Mutation to delete feedback
export const remove = mutation({
  args: {
    id: v.id("feedback"),
    email: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Admin check
    if (args.email) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_email", (q: any) => q.eq("email", args.email!))
        .first();
      
      if (!user || user.role !== "admin") {
        throw new Error("Unauthorized");
      }
    }

    const feedback = await ctx.db.get(args.id);
    if (!feedback) {
      throw new Error("Feedback not found");
    }

    await ctx.db.delete(args.id);

    return { success: true };
  },
});
