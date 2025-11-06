import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Resend } from "resend";

import { requireAdmin } from "./adminAuth";

// Initialize Resend (get API key from settings)
async function getResendClient(ctx: any) {
  const apiKeySetting = await ctx.db
    .query("settings")
    .withIndex("by_key", (q: any) => q.eq("key", "resendApiKey"))
    .first();
  
  if (!apiKeySetting) {
    throw new Error("RESEND API key not configured. Please set it in settings.");
  }
  
  return new Resend(apiKeySetting.value);
}

// Contacts
export const listContacts = query({
  args: {
    email: v.optional(v.string()),
    status: v.optional(v.union(
      v.literal("subscribed"),
      v.literal("unsubscribed"),
      v.literal("bounced"),
      v.literal("spam")
    )),
    tags: v.optional(v.array(v.string())),
  },
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
    
    let contacts;
    
    if (args.status) {
      contacts = await ctx.db
        .query("emailContacts")
        .withIndex("by_status", (q: any) => q.eq("status", args.status))
        .collect();
    } else {
      // Get all contacts if no filter
      contacts = await ctx.db.query("emailContacts").collect();
    }
    
    // Filter by tags if provided
    if (args.tags && args.tags.length > 0) {
      contacts = contacts.filter(contact => 
        args.tags!.some(tag => contact.tags.includes(tag))
      );
    }
    
    return contacts;
  },
});

export const getContact = query({
  args: { 
    id: v.id("emailContacts"),
    email: v.optional(v.string()),
  },
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
    return await ctx.db.get(args.id);
  },
});

export const createContact = mutation({
  args: {
    adminEmail: v.optional(v.string()),
    email: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    source: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    // Development mode: check admin by email
    if (args.adminEmail) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_email", (q: any) => q.eq("email", args.adminEmail!))
        .first();
      
      if (!user || user.role !== "admin") {
        throw new Error("Unauthorized - admin access required");
      }
    } else {
      // Production mode: use requireAdmin
      await requireAdmin(ctx);
    }
    
    // Check if contact already exists
    const existing = await ctx.db
      .query("emailContacts")
      .withIndex("by_email", (q: any) => q.eq("email", args.email))
      .first();
    
    if (existing) {
      throw new Error("Contact with this email already exists");
    }
    
    const now = Date.now();
    return await ctx.db.insert("emailContacts", {
      email: args.email,
      firstName: args.firstName,
      lastName: args.lastName,
      tags: args.tags || [],
      status: "subscribed",
      source: args.source,
      metadata: args.metadata,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateContact = mutation({
  args: {
    id: v.id("emailContacts"),
    adminEmail: v.optional(v.string()),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    status: v.optional(v.union(
      v.literal("subscribed"),
      v.literal("unsubscribed"),
      v.literal("bounced"),
      v.literal("spam")
    )),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    // Development mode: check admin by email
    if (args.adminEmail) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_email", (q: any) => q.eq("email", args.adminEmail!))
        .first();
      
      if (!user || user.role !== "admin") {
        throw new Error("Unauthorized - admin access required");
      }
    } else {
      // Production mode: use requireAdmin
      await requireAdmin(ctx);
    }
    
    const { id, adminEmail, ...updates } = args;
    
    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });
    return id;
  },
});

export const deleteContact = mutation({
  args: {
    id: v.id("emailContacts"),
    adminEmail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Development mode: check admin by email
    if (args.adminEmail) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_email", (q: any) => q.eq("email", args.adminEmail!))
        .first();
      
      if (!user || user.role !== "admin") {
        throw new Error("Unauthorized - admin access required");
      }
    } else {
      // Production mode: use requireAdmin
      await requireAdmin(ctx);
    }
    
    await ctx.db.delete(args.id);
    return args.id;
  },
});

// Campaigns
export const listCampaigns = query({
  args: {
    email: v.optional(v.string()),
    status: v.optional(v.union(
      v.literal("draft"),
      v.literal("scheduled"),
      v.literal("sending"),
      v.literal("sent"),
      v.literal("cancelled")
    )),
  },
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
    
    if (args.status) {
      return await ctx.db
        .query("emailCampaigns")
        .withIndex("by_status", (q: any) => q.eq("status", args.status))
        .collect();
    }
    
    return await ctx.db.query("emailCampaigns").collect();
  },
});

export const getCampaign = query({
  args: { 
    id: v.id("emailCampaigns"),
    email: v.optional(v.string()),
  },
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
    return await ctx.db.get(args.id);
  },
});

export const createCampaign = mutation({
  args: {
    adminEmail: v.optional(v.string()),
    name: v.string(),
    subject: v.string(),
    fromEmail: v.optional(v.string()),
    fromName: v.optional(v.string()),
    htmlContent: v.optional(v.string()),
    textContent: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    // Development mode: check admin by email
    if (args.adminEmail) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_email", (q: any) => q.eq("email", args.adminEmail!))
        .first();
      
      if (!user || user.role !== "admin") {
        throw new Error("Unauthorized - admin access required");
      }
    } else {
      // Production mode: use requireAdmin
      await requireAdmin(ctx);
    }
    
    // Validate that at least one content type is provided
    if (!args.htmlContent && !args.textContent) {
      throw new Error("Either HTML content or plain text content is required");
    }
    
    const now = Date.now();
    const { adminEmail, ...campaignData } = args;
    return await ctx.db.insert("emailCampaigns", {
      ...campaignData,
      htmlContent: args.htmlContent || "",
      status: "draft",
      tags: args.tags || [],
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateCampaign = mutation({
  args: {
    id: v.id("emailCampaigns"),
    adminEmail: v.optional(v.string()),
    name: v.optional(v.string()),
    subject: v.optional(v.string()),
    fromEmail: v.optional(v.string()),
    fromName: v.optional(v.string()),
    htmlContent: v.optional(v.string()),
    textContent: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    // Development mode: check admin by email
    if (args.adminEmail) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_email", (q: any) => q.eq("email", args.adminEmail!))
        .first();
      
      if (!user || user.role !== "admin") {
        throw new Error("Unauthorized - admin access required");
      }
    } else {
      // Production mode: use requireAdmin
      await requireAdmin(ctx);
    }
    
    const { id, adminEmail, ...updates } = args;
    
    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });
    return id;
  },
});

export const sendCampaign = mutation({
  args: {
    campaignId: v.id("emailCampaigns"),
    adminEmail: v.optional(v.string()),
    contactIds: v.optional(v.array(v.id("emailContacts"))),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    // Development mode: check admin by email
    if (args.adminEmail) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_email", (q: any) => q.eq("email", args.adminEmail!))
        .first();
      
      if (!user || user.role !== "admin") {
        throw new Error("Unauthorized - admin access required");
      }
    } else {
      // Production mode: use requireAdmin
      await requireAdmin(ctx);
    }
    
    const { campaignId, contactIds, tags } = args;
    
    const campaign = await ctx.db.get(campaignId);
    if (!campaign) {
      throw new Error("Campaign not found");
    }
    
    if (campaign.status !== "draft") {
      throw new Error("Campaign must be in draft status to send");
    }
    
    // Get contacts to send to
    let contacts: any[] = [];
    if (contactIds && contactIds.length > 0) {
      const fetchedContacts = await Promise.all(
        contactIds.map(id => ctx.db.get(id))
      );
      contacts = fetchedContacts.filter(contact => contact && contact.status === "subscribed");
    } else if (tags && tags.length > 0) {
      const allContacts = await ctx.db
        .query("emailContacts")
        .collect();
      contacts = allContacts.filter(contact => 
        contact && contact.status === "subscribed" && 
        tags.some(tag => contact.tags.includes(tag))
      );
    } else {
      // Send to all subscribed contacts
      contacts = await ctx.db
        .query("emailContacts")
        .withIndex("by_status", (q: any) => q.eq("status", "subscribed"))
        .collect();
    }
    
    if (contacts.length === 0) {
      throw new Error("No subscribed contacts to send to");
    }
    
    // Get Resend client
    const resend = await getResendClient(ctx);
    
    // Update campaign status
    await ctx.db.patch(campaignId, {
      status: "sending",
      updatedAt: Date.now(),
    });
    
    // Get domain from settings
    const domainSetting = await ctx.db
      .query("settings")
      .withIndex("by_key", (q: any) => q.eq("key", "emailDomain"))
      .first();
    
    const domain = domainSetting?.value || "onboarding.resend.dev";
    const fromEmail = campaign.fromEmail || `noreply@${domain}`;
    const fromName = campaign.fromName || "Ian Courtright";
    
    // Create send records and send emails
    const sendIds = [];
    const now = Date.now();
    
    for (const contact of contacts) {
      if (!contact) continue;
      
      // Create tracking URLs
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
      const sendId = await ctx.db.insert("emailSends", {
        campaignId,
        contactId: contact._id,
        status: "pending",
        opened: false,
        openedCount: 0,
        clicked: false,
        clickedCount: 0,
        unsubscribed: false,
        markedAsSpam: false,
        bounced: false,
        createdAt: now,
        updatedAt: now,
      });
      
      sendIds.push(sendId);
      
      // Process content with short codes replacement
      const unsubscribeUrl = `${baseUrl}/api/email/unsubscribe?token=${sendId}`;
      
      // Replace short codes in HTML content (if it exists)
      let personalizedHtml = "";
      if (campaign.htmlContent) {
        personalizedHtml = campaign.htmlContent;
        personalizedHtml = personalizedHtml.replace(/{{\s*unsubscribe_url\s*}}/g, unsubscribeUrl);
        personalizedHtml = personalizedHtml.replace(/{{\s*first_name\s*}}/g, contact.firstName || "");
        personalizedHtml = personalizedHtml.replace(/{{\s*last_name\s*}}/g, contact.lastName || "");
        personalizedHtml = personalizedHtml.replace(/{{\s*email\s*}}/g, contact.email);
        personalizedHtml = personalizedHtml.replace(/{{\s*full_name\s*}}/g, 
          contact.firstName || contact.lastName 
            ? `${contact.firstName || ""} ${contact.lastName || ""}`.trim()
            : contact.email
        );
      }
      
      // Replace short codes in subject line
      let personalizedSubject = campaign.subject || "";
      personalizedSubject = personalizedSubject.replace(/{{\s*first_name\s*}}/g, contact.firstName || "");
      personalizedSubject = personalizedSubject.replace(/{{\s*last_name\s*}}/g, contact.lastName || "");
      personalizedSubject = personalizedSubject.replace(/{{\s*email\s*}}/g, contact.email);
      personalizedSubject = personalizedSubject.replace(/{{\s*full_name\s*}}/g,
        contact.firstName || contact.lastName 
          ? `${contact.firstName || ""} ${contact.lastName || ""}`.trim()
          : contact.email
      );
      
      // Replace short codes in plain text content
      let personalizedText = campaign.textContent || "";
      if (personalizedText) {
        personalizedText = personalizedText.replace(/{{\s*unsubscribe_url\s*}}/g, unsubscribeUrl);
        personalizedText = personalizedText.replace(/{{\s*first_name\s*}}/g, contact.firstName || "");
        personalizedText = personalizedText.replace(/{{\s*last_name\s*}}/g, contact.lastName || "");
        personalizedText = personalizedText.replace(/{{\s*email\s*}}/g, contact.email);
        personalizedText = personalizedText.replace(/{{\s*full_name\s*}}/g,
          contact.firstName || contact.lastName 
            ? `${contact.firstName || ""} ${contact.lastName || ""}`.trim()
            : contact.email
        );
      }
      
      // Send email via Resend
      try {
        const emailData: any = {
          from: `${fromName} <${fromEmail}>`,
          to: contact.email,
          subject: personalizedSubject,
        };
        
        // Only include html if it exists and is not empty
        if (personalizedHtml && personalizedHtml.trim()) {
          emailData.html = personalizedHtml;
        }
        
        // Only include text if it exists and is not empty
        if (personalizedText && personalizedText.trim()) {
          emailData.text = personalizedText;
        }
        
        // At least one content type must be provided
        if (!emailData.html && !emailData.text) {
          throw new Error("Campaign must have either HTML or plain text content");
        }
        
        const result = await resend.emails.send(emailData);
        
        // Update send record with Resend email ID
        const resendEmailId = (result.data && 'id' in result.data) ? result.data.id : null;
        await ctx.db.patch(sendId, {
          resendEmailId: resendEmailId || undefined,
          status: "sent",
          sentAt: now,
          updatedAt: Date.now(),
        });
        
        // Create event
        await ctx.db.insert("emailEvents", {
          sendId,
          type: "sent",
          createdAt: now,
        });
      } catch (error: any) {
        // Error sending email - log to error tracking service in production
        // Continue with next contact even if one fails
        await ctx.db.patch(sendId, {
          status: "failed",
          updatedAt: Date.now(),
        });
      }
    }
    
    // Update campaign status
    await ctx.db.patch(campaignId, {
      status: "sent",
      sentAt: now,
      updatedAt: Date.now(),
    });
    
    return { success: true, sendsCount: sendIds.length };
  },
});

// Get send by ID
export const getSend = query({
  args: { id: v.id("emailSends") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Get sends for a contact with analytics
export const getContactSends = query({
  args: { 
    contactId: v.id("emailContacts"),
    email: v.optional(v.string()),
  },
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
    
    const sends = await ctx.db
      .query("emailSends")
      .withIndex("by_contact", (q: any) => q.eq("contactId", args.contactId))
      .collect();
    
    // Get campaign details for each send
    const sendsWithCampaigns = await Promise.all(
      sends.map(async (send) => {
        const campaign = await ctx.db.get(send.campaignId);
        return {
          ...send,
          campaign,
        };
      })
    );
    
    return sendsWithCampaigns;
  },
});

// Get sends by Resend email ID (for webhooks)
export const getSendsByResendId = query({
  args: { resendEmailId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("emailSends")
      .withIndex("by_resend_email_id", (q: any) => q.eq("resendEmailId", args.resendEmailId))
      .collect();
  },
});

// Update send record (for webhooks)
export const updateSend = mutation({
  args: {
    id: v.id("emailSends"),
    status: v.optional(v.union(
      v.literal("pending"),
      v.literal("sent"),
      v.literal("delivered"),
      v.literal("bounced"),
      v.literal("failed")
    )),
    sentAt: v.optional(v.number()),
    deliveredAt: v.optional(v.number()),
    opened: v.optional(v.boolean()),
    openedCount: v.optional(v.number()),
    lastOpenedAt: v.optional(v.number()),
    clicked: v.optional(v.boolean()),
    clickedCount: v.optional(v.number()),
    lastClickedAt: v.optional(v.number()),
    unsubscribed: v.optional(v.boolean()),
    unsubscribedAt: v.optional(v.number()),
    markedAsSpam: v.optional(v.boolean()),
    markedAsSpamAt: v.optional(v.number()),
    bounced: v.optional(v.boolean()),
    bouncedAt: v.optional(v.number()),
    bounceReason: v.optional(v.string()),
    updatedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const now = Date.now();
    
    await ctx.db.patch(id, {
      ...updates,
      updatedAt: updates.updatedAt || now,
    });
    return id;
  },
});

// Create event (for webhooks)
export const createEvent = mutation({
  args: {
    sendId: v.id("emailSends"),
    type: v.union(
      v.literal("sent"),
      v.literal("delivered"),
      v.literal("opened"),
      v.literal("clicked"),
      v.literal("bounced"),
      v.literal("complained"),
      v.literal("unsubscribed")
    ),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("emailEvents", {
      sendId: args.sendId,
      type: args.type,
      metadata: args.metadata,
      createdAt: now,
    });
  },
});

// Analytics
export const getCampaignAnalytics = query({
  args: { 
    campaignId: v.id("emailCampaigns"),
    email: v.optional(v.string()),
  },
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
    
    const sends = await ctx.db
      .query("emailSends")
      .withIndex("by_campaign", (q: any) => q.eq("campaignId", args.campaignId))
      .collect();
    
    const total = sends.length;
    const sent = sends.filter(s => s.status === "sent" || s.status === "delivered").length;
    const delivered = sends.filter(s => s.status === "delivered").length;
    const opened = sends.filter(s => s.opened).length;
    const clicked = sends.filter(s => s.clicked).length;
    const bounced = sends.filter(s => s.bounced).length;
    const unsubscribed = sends.filter(s => s.unsubscribed).length;
    const spam = sends.filter(s => s.markedAsSpam).length;
    
    const totalOpens = sends.reduce((sum, s) => sum + s.openedCount, 0);
    const totalClicks = sends.reduce((sum, s) => sum + s.clickedCount, 0);
    
    return {
      total,
      sent,
      delivered,
      opened,
      clicked,
      bounced,
      unsubscribed,
      spam,
      totalOpens,
      totalClicks,
      openRate: total > 0 ? (opened / total) * 100 : 0,
      clickRate: total > 0 ? (clicked / total) * 100 : 0,
      deliveryRate: total > 0 ? (delivered / total) * 100 : 0,
      bounceRate: total > 0 ? (bounced / total) * 100 : 0,
      unsubscribeRate: total > 0 ? (unsubscribed / total) * 100 : 0,
      spamRate: total > 0 ? (spam / total) * 100 : 0,
    };
  },
});

// Get all unique tags from contacts and campaigns
export const getAllTags = query({
  args: {
    email: v.optional(v.string()),
  },
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
    
    // Get all tags from contacts
    const contacts = await ctx.db.query("emailContacts").collect();
    const contactTags = new Set<string>();
    contacts.forEach(contact => {
      contact.tags.forEach(tag => contactTags.add(tag));
    });
    
    // Get all tags from campaigns
    const campaigns = await ctx.db.query("emailCampaigns").collect();
    const campaignTags = new Set<string>();
    campaigns.forEach(campaign => {
      campaign.tags.forEach(tag => campaignTags.add(tag));
    });
    
    // Combine and return sorted unique tags
    const allTags = new Set([...contactTags, ...campaignTags]);
    return Array.from(allTags).sort();
  },
});

// Journey functions
export const listJourneys = query({
  args: {
    email: v.optional(v.string()),
    status: v.optional(v.union(
      v.literal("draft"),
      v.literal("active"),
      v.literal("paused"),
      v.literal("archived")
    )),
  },
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
    
    if (args.status) {
      return await ctx.db
        .query("emailJourneys")
        .withIndex("by_status", (q: any) => q.eq("status", args.status))
        .collect();
    }
    
    return await ctx.db.query("emailJourneys").collect();
  },
});

export const createJourney = mutation({
  args: {
    adminEmail: v.optional(v.string()),
    name: v.string(),
    description: v.optional(v.string()),
    entryTrigger: v.union(
      v.literal("manual"),
      v.literal("tag_added"),
      v.literal("campaign_opened"),
      v.literal("campaign_clicked"),
      v.literal("contact_created"),
      v.literal("custom")
    ),
    entryTriggerData: v.optional(v.any()),
    steps: v.array(v.object({
      stepNumber: v.number(),
      campaignId: v.id("emailCampaigns"),
      delayDays: v.number(),
      condition: v.optional(v.union(
        v.literal("always"),
        v.literal("if_opened"),
        v.literal("if_clicked"),
        v.literal("if_not_opened")
      )),
    })),
  },
  handler: async (ctx, args) => {
    // Development mode: check admin by email
    if (args.adminEmail) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_email", (q: any) => q.eq("email", args.adminEmail!))
        .first();
      
      if (!user || user.role !== "admin") {
        throw new Error("Unauthorized - admin access required");
      }
    } else {
      // Production mode: use requireAdmin
      await requireAdmin(ctx);
    }
    
    const now = Date.now();
    const { adminEmail, ...journeyData } = args;
    return await ctx.db.insert("emailJourneys", {
      ...journeyData,
      status: "draft",
      createdAt: now,
      updatedAt: now,
    });
  },
});

