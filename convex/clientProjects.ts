import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./auth";
import { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";

// List all client projects
export const list = query({
  args: {
    email: v.optional(v.string()), // Dev mode: email for admin check
  },
  handler: async (ctx, args) => {
    // Development mode: check admin by email
    if (args.email) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_email", (q: any) => q.eq("email", args.email))
        .first();
      
      if (!user || user.role !== "admin") {
        throw new Error("Unauthorized - admin access required");
      }
    } else {
      // Production mode: use requireAdmin
      await requireAdmin(ctx);
    }

    const projects = await ctx.db
      .query("clientProjects")
      .withIndex("by_created_at")
      .order("desc")
      .collect();
    
    // Populate contact and lead info
    const projectsWithInfo = await Promise.all(
      projects.map(async (project) => {
        const contact = project.contactId ? await ctx.db.get(project.contactId) : null;
        const lead = project.leadId ? await ctx.db.get(project.leadId) : null;
        
        return {
          ...project,
          contact,
          lead,
        };
      })
    );
    
    return projectsWithInfo;
  },
});

// Get client project by ID
export const get = query({
  args: { 
    id: v.id("clientProjects"),
    email: v.optional(v.string()), // Dev mode: email for admin check
  },
  handler: async (ctx, args) => {
    // Development mode: check admin by email
    if (args.email) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_email", (q: any) => q.eq("email", args.email))
        .first();
      
      if (!user || user.role !== "admin") {
        throw new Error("Unauthorized - admin access required");
      }
    } else {
      // Production mode: use requireAdmin
      await requireAdmin(ctx);
    }

    const project = await ctx.db.get(args.id);
    if (!project) return null;
    
    // Populate contact and lead info
    const contact = project.contactId ? await ctx.db.get(project.contactId) : null;
    const lead = project.leadId ? await ctx.db.get(project.leadId) : null;
    
    return {
      ...project,
      contact,
      lead,
    };
  },
});

// Get client projects by client name
export const getByClient = query({
  args: { 
    clientName: v.string(),
    email: v.optional(v.string()), // Dev mode: email for admin check
  },
  handler: async (ctx, args) => {
    // Development mode: check admin by email
    if (args.email) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_email", (q: any) => q.eq("email", args.email))
        .first();
      
      if (!user || user.role !== "admin") {
        throw new Error("Unauthorized - admin access required");
      }
    } else {
      // Production mode: use requireAdmin
      await requireAdmin(ctx);
    }

    return await ctx.db
      .query("clientProjects")
      .withIndex("by_client", (q) => q.eq("clientName", args.clientName))
      .order("desc")
      .collect();
  },
});

// Create new client project
export const create = mutation({
  args: {
    title: v.string(),
    clientName: v.string(),
    description: v.optional(v.string()),
    status: v.optional(v.union(
      v.literal("planning"),
      v.literal("in_progress"),
      v.literal("review"),
      v.literal("completed"),
      v.literal("on_hold"),
      v.literal("cancelled")
    )),
    scope: v.optional(v.string()),
    notes: v.optional(v.string()),
    contactId: v.optional(v.id("contacts")), // Optional: link to existing contact
    leadId: v.optional(v.id("leads")), // Optional: link to lead if created from won lead
    email: v.optional(v.string()), // Dev mode: email for admin check
  },
  handler: async (ctx, args) => {
    const { email, contactId, leadId, ...projectData } = args;
    
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
    let finalContactId: Id<"contacts"> | undefined = contactId;
    
    // Auto-create or link contact if not provided
    if (!finalContactId) {
      // Try to find contact by client name (business name) or email
      // First, try to find by business name
      const contacts = await ctx.db.query("contacts").collect();
      const matchingContact = contacts.find(
        (c) => c.businessName?.toLowerCase() === args.clientName.toLowerCase()
      );
      
      if (matchingContact) {
        finalContactId = matchingContact._id;
      } else {
        // Create new contact from client name
        // Use client name as business name, try to extract email from lead if available
        let contactEmail = "";
        if (leadId) {
          const lead = await ctx.db.get(leadId);
          if (lead) {
            contactEmail = lead.contactEmail || (lead.emails.length > 0 ? lead.emails[0] : "");
            // If lead has contact, use that
            if (lead.contactId) {
              finalContactId = lead.contactId;
            }
          }
        }
        
        // If still no contact, create one
        if (!finalContactId && contactEmail) {
          // Check if contact exists with this email
          const existingContact = await ctx.db
            .query("contacts")
            .withIndex("by_email", (q: any) => q.eq("email", contactEmail))
            .first();
          
          if (existingContact) {
            finalContactId = existingContact._id;
          } else {
            // Create new contact
            finalContactId = await ctx.db.insert("contacts", {
              email: contactEmail,
              businessName: args.clientName,
              source: leadId ? "lead" : "manual",
              leadId: leadId,
              tags: [],
              createdAt: now,
              updatedAt: now,
            });
          }
        }
      }
    }
    
    const projectId = await ctx.db.insert("clientProjects", {
      ...projectData,
      status: projectData.status || "planning",
      keyMoments: [],
      signOffs: [],
      linkedDeliveryIds: [],
      modificationHistory: [],
      createdBy: email,
      modifiedBy: email,
      contactId: finalContactId,
      leadId: leadId,
      createdAt: now,
      updatedAt: now,
    });
    
    return projectId;
  },
});

// Update client project
export const update = mutation({
  args: {
    id: v.id("clientProjects"),
    title: v.optional(v.string()),
    clientName: v.optional(v.string()),
    description: v.optional(v.string()),
    status: v.optional(v.union(
      v.literal("planning"),
      v.literal("in_progress"),
      v.literal("review"),
      v.literal("completed"),
      v.literal("on_hold"),
      v.literal("cancelled")
    )),
    scope: v.optional(v.string()),
    notes: v.optional(v.string()),
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
    if (!project) throw new Error("Client project not found");
    
    const now = Date.now();
    const modificationHistory = [...(project.modificationHistory || [])];
    
    // Track changes to fields
    Object.keys(updates).forEach((field) => {
      if (updates[field as keyof typeof updates] !== undefined) {
        const oldValue = project[field as keyof typeof project];
        const newValue = updates[field as keyof typeof updates];
        
        if (oldValue !== newValue) {
          modificationHistory.push({
            field,
            oldValue: oldValue !== undefined ? oldValue : null,
            newValue: newValue !== undefined ? newValue : null,
            modifiedBy: email,
            modifiedAt: now,
          });
        }
      }
    });
    
    // Sync client name changes to contact
    if (updates.clientName && project.contactId) {
      const contact = await ctx.db.get(project.contactId);
      if (contact && contact.businessName !== updates.clientName) {
        await ctx.db.patch(project.contactId, {
          businessName: updates.clientName,
          updatedAt: now,
        });
      }
    }
    
    await ctx.db.patch(id, {
      ...updates,
      modifiedBy: email,
      modificationHistory,
      updatedAt: now,
    });
    
    return id;
  },
});

// Add key moment to project
export const addKeyMoment = mutation({
  args: {
    id: v.id("clientProjects"),
    title: v.string(),
    description: v.optional(v.string()),
    date: v.number(),
    email: v.optional(v.string()), // Dev mode: email for admin check
  },
  handler: async (ctx, args) => {
    const { email, id, ...momentData } = args;
    
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
    if (!project) throw new Error("Client project not found");
    
    const now = Date.now();
    const keyMoments = [...(project.keyMoments || []), {
      ...momentData,
      createdAt: now,
    }];
    
    await ctx.db.patch(id, {
      keyMoments,
      modifiedBy: email,
      updatedAt: now,
    });
    
    return id;
  },
});

// Update key moment
export const updateKeyMoment = mutation({
  args: {
    id: v.id("clientProjects"),
    momentIndex: v.number(),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    date: v.optional(v.number()),
    email: v.optional(v.string()), // Dev mode: email for admin check
  },
  handler: async (ctx, args) => {
    const { email, id, momentIndex, ...momentUpdates } = args;
    
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
    if (!project) throw new Error("Client project not found");
    
    const keyMoments = [...(project.keyMoments || [])];
    if (momentIndex < 0 || momentIndex >= keyMoments.length) {
      throw new Error("Invalid moment index");
    }
    
    keyMoments[momentIndex] = {
      ...keyMoments[momentIndex],
      ...momentUpdates,
    };
    
    await ctx.db.patch(id, {
      keyMoments,
      modifiedBy: email,
      updatedAt: Date.now(),
    });
    
    return id;
  },
});

// Remove key moment
export const removeKeyMoment = mutation({
  args: {
    id: v.id("clientProjects"),
    momentIndex: v.number(),
    email: v.optional(v.string()), // Dev mode: email for admin check
  },
  handler: async (ctx, args) => {
    const { email, id, momentIndex } = args;
    
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
    if (!project) throw new Error("Client project not found");
    
    const keyMoments = [...(project.keyMoments || [])];
    if (momentIndex < 0 || momentIndex >= keyMoments.length) {
      throw new Error("Invalid moment index");
    }
    
    keyMoments.splice(momentIndex, 1);
    
    await ctx.db.patch(id, {
      keyMoments,
      modifiedBy: email,
      updatedAt: Date.now(),
    });
    
    return id;
  },
});

// Add sign-off
export const addSignOff = mutation({
  args: {
    id: v.id("clientProjects"),
    title: v.string(),
    description: v.optional(v.string()),
    status: v.optional(v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected"))),
    date: v.optional(v.number()),
    email: v.optional(v.string()), // Dev mode: email for admin check
  },
  handler: async (ctx, args) => {
    const { email, id, ...signOffData } = args;
    
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
    if (!project) throw new Error("Client project not found");
    
    const now = Date.now();
    const signOffs = [...(project.signOffs || []), {
      ...signOffData,
      status: signOffData.status || "pending",
      createdAt: now,
    }];
    
    await ctx.db.patch(id, {
      signOffs,
      modifiedBy: email,
      updatedAt: now,
    });
    
    return id;
  },
});

// Update sign-off
export const updateSignOff = mutation({
  args: {
    id: v.id("clientProjects"),
    signOffIndex: v.number(),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    status: v.optional(v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected"))),
    date: v.optional(v.number()),
    email: v.optional(v.string()), // Dev mode: email for admin check
  },
  handler: async (ctx, args) => {
    const { email, id, signOffIndex, ...signOffUpdates } = args;
    
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
    if (!project) throw new Error("Client project not found");
    
    const signOffs = [...(project.signOffs || [])];
    if (signOffIndex < 0 || signOffIndex >= signOffs.length) {
      throw new Error("Invalid sign-off index");
    }
    
    const now = Date.now();
    signOffs[signOffIndex] = {
      ...signOffs[signOffIndex],
      ...signOffUpdates,
      updatedAt: now,
    };
    
    await ctx.db.patch(id, {
      signOffs,
      modifiedBy: email,
      updatedAt: now,
    });
    
    return id;
  },
});

// Remove sign-off
export const removeSignOff = mutation({
  args: {
    id: v.id("clientProjects"),
    signOffIndex: v.number(),
    email: v.optional(v.string()), // Dev mode: email for admin check
  },
  handler: async (ctx, args) => {
    const { email, id, signOffIndex } = args;
    
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
    if (!project) throw new Error("Client project not found");
    
    const signOffs = [...(project.signOffs || [])];
    if (signOffIndex < 0 || signOffIndex >= signOffs.length) {
      throw new Error("Invalid sign-off index");
    }
    
    signOffs.splice(signOffIndex, 1);
    
    await ctx.db.patch(id, {
      signOffs,
      modifiedBy: email,
      updatedAt: Date.now(),
    });
    
    return id;
  },
});

// Upload contract file
export const uploadContract = mutation({
  args: {
    id: v.id("clientProjects"),
    storageId: v.string(),
    filename: v.string(),
    email: v.optional(v.string()), // Dev mode: email for admin check
  },
  handler: async (ctx, args) => {
    const { email, id, storageId, filename } = args;
    
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
    if (!project) throw new Error("Client project not found");
    
    await ctx.db.patch(id, {
      contractStorageId: storageId,
      contractFilename: filename,
      modifiedBy: email,
      updatedAt: Date.now(),
    });
    
    return id;
  },
});

// Link delivery to project
export const linkDelivery = mutation({
  args: {
    id: v.id("clientProjects"),
    deliveryId: v.id("deliveries"),
    email: v.optional(v.string()), // Dev mode: email for admin check
  },
  handler: async (ctx, args) => {
    const { email, id, deliveryId } = args;
    
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
    if (!project) throw new Error("Client project not found");
    
    const linkedDeliveryIds = [...(project.linkedDeliveryIds || [])];
    if (!linkedDeliveryIds.includes(deliveryId)) {
      linkedDeliveryIds.push(deliveryId);
    }
    
    await ctx.db.patch(id, {
      linkedDeliveryIds,
      modifiedBy: email,
      updatedAt: Date.now(),
    });
    
    return id;
  },
});

// Unlink delivery from project
export const unlinkDelivery = mutation({
  args: {
    id: v.id("clientProjects"),
    deliveryId: v.id("deliveries"),
    email: v.optional(v.string()), // Dev mode: email for admin check
  },
  handler: async (ctx, args) => {
    const { email, id, deliveryId } = args;
    
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
    if (!project) throw new Error("Client project not found");
    
    const linkedDeliveryIds = (project.linkedDeliveryIds || []).filter(
      (did) => did !== deliveryId
    );
    
    await ctx.db.patch(id, {
      linkedDeliveryIds,
      modifiedBy: email,
      updatedAt: Date.now(),
    });
    
    return id;
  },
});

// Get feedback for a client project (through linked deliveries and direct project link)
export const getFeedback = query({
  args: { 
    id: v.id("clientProjects"),
    email: v.optional(v.string()), // Dev mode: email for admin check
  },
  handler: async (ctx, args) => {
    // Development mode: check admin by email
    if (args.email) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_email", (q: any) => q.eq("email", args.email))
        .first();
      
      if (!user || user.role !== "admin") {
        throw new Error("Unauthorized - admin access required");
      }
    } else {
      // Production mode: use requireAdmin
      await requireAdmin(ctx);
    }

    const project = await ctx.db.get(args.id);
    if (!project) throw new Error("Client project not found");

    // Get all feedback from linked deliveries
    const allFeedback = [];
    for (const deliveryId of project.linkedDeliveryIds || []) {
      const feedback = await ctx.db
        .query("feedback")
        .withIndex("by_delivery", (q) => q.eq("deliveryId", deliveryId))
        .order("desc")
        .collect();
      
      for (const fb of feedback) {
        const delivery = await ctx.db.get(deliveryId);
        allFeedback.push({
          ...fb,
          delivery,
        });
      }
    }
    
    // Also get feedback directly linked to this project
    const directFeedback = await ctx.db
      .query("feedback")
      .withIndex("by_project", (q: any) => q.eq("projectId", args.id))
      .order("desc")
      .collect();
    
    for (const fb of directFeedback) {
      const delivery = await ctx.db.get(fb.deliveryId);
      allFeedback.push({
        ...fb,
        delivery,
      });
    }

    // Sort by creation date (newest first) and remove duplicates
    const uniqueFeedback = Array.from(
      new Map(allFeedback.map((fb: any) => [fb._id, fb])).values()
    );
    uniqueFeedback.sort((a: any, b: any) => b.createdAt - a.createdAt);

    return uniqueFeedback;
  },
});

// Delete client project
export const remove = mutation({
  args: { 
    id: v.id("clientProjects"),
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
    
    await ctx.db.delete(id);
  },
});

