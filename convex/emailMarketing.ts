import { mutation, query, internalMutation, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
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
    
    // Get all contacts from unified contacts database
    let contacts = await ctx.db.query("contacts").collect();
    
    // Filter by tags if provided
    if (args.tags && args.tags.length > 0) {
      contacts = contacts.filter(contact => 
        args.tags!.some(tag => contact.tags.includes(tag))
      );
    }
    
    // Populate email marketing status
    const contactsWithStatus = await Promise.all(
      contacts.map(async (contact) => {
        let emailMarketing = null;
        if (contact.emailMarketingId) {
          emailMarketing = await ctx.db.get(contact.emailMarketingId);
        } else {
          // Try to find by email
          emailMarketing = await ctx.db
            .query("emailContacts")
            .withIndex("by_email", (q: any) => q.eq("email", contact.email))
            .first();
        }
        
        return {
          ...contact,
          emailMarketingStatus: emailMarketing?.status || "subscribed",
          emailMarketingId: emailMarketing?._id || contact.emailMarketingId,
        };
      })
    );
    
    // Filter by status if provided
    if (args.status) {
      return contactsWithStatus.filter(contact => contact.emailMarketingStatus === args.status);
    }
    
    return contactsWithStatus;
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
    
    // Check if contact already exists in unified contacts database
    const existingContact = await ctx.db
      .query("contacts")
      .withIndex("by_email", (q: any) => q.eq("email", args.email))
      .first();
    
    let contactId: Id<"contacts">;
    
    if (!existingContact) {
      // Create in unified contacts database first
      const now = Date.now();
      contactId = await ctx.db.insert("contacts", {
        email: args.email,
        firstName: args.firstName,
        lastName: args.lastName,
        tags: args.tags || [],
        source: args.source || "email_marketing",
        metadata: args.metadata,
        createdAt: now,
        updatedAt: now,
      });
    } else {
      contactId = existingContact._id;
      // Update unified contact
      await ctx.db.patch(contactId, {
        firstName: args.firstName !== undefined ? args.firstName : existingContact.firstName,
        lastName: args.lastName !== undefined ? args.lastName : existingContact.lastName,
        tags: args.tags !== undefined ? args.tags : existingContact.tags,
        source: args.source !== undefined ? args.source : existingContact.source || "email_marketing",
        metadata: args.metadata !== undefined ? args.metadata : existingContact.metadata,
        updatedAt: Date.now(),
      });
    }
    
    // Check if email marketing contact already exists
    const existing = await ctx.db
      .query("emailContacts")
      .withIndex("by_email", (q: any) => q.eq("email", args.email))
      .first();
    
    if (existing) {
      // Update existing email marketing contact
      await ctx.db.patch(existing._id, {
        contactId: contactId,
        firstName: args.firstName,
        lastName: args.lastName,
        tags: args.tags || [],
        source: args.source,
        metadata: args.metadata,
        updatedAt: Date.now(),
      });
      return existing._id;
    }
    
    const now = Date.now();
    const emailContactId = await ctx.db.insert("emailContacts", {
      email: args.email,
      firstName: args.firstName,
      lastName: args.lastName,
      tags: args.tags || [],
      status: "subscribed",
      source: args.source,
      metadata: args.metadata,
      contactId: contactId,
      createdAt: now,
      updatedAt: now,
    });
    
    // Update unified contact with email marketing ID
    await ctx.db.patch(contactId, {
      emailMarketingId: emailContactId,
      updatedAt: now,
    });
    
    return emailContactId;
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
    
    const emailContact = await ctx.db.get(args.id);
    if (!emailContact) {
      throw new Error("Email contact not found");
    }
    
    const { id, adminEmail, ...updates } = args;
    
    // Update email marketing contact
    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });
    
    // Sync to unified contacts database
    if (emailContact.contactId) {
      const unifiedContact = await ctx.db.get(emailContact.contactId);
      if (unifiedContact) {
        await ctx.db.patch(emailContact.contactId, {
          firstName: args.firstName !== undefined ? args.firstName : unifiedContact.firstName,
          lastName: args.lastName !== undefined ? args.lastName : unifiedContact.lastName,
          tags: args.tags !== undefined ? args.tags : unifiedContact.tags,
          metadata: args.metadata !== undefined ? args.metadata : unifiedContact.metadata,
          updatedAt: Date.now(),
        });
      }
    }
    
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
        
        // Wrap all links with tracking URLs (except unsubscribe and mailto/tel links)
        const linkRegex = /<a\s+([^>]*href=["']([^"']+)["'][^>]*)>/gi;
        personalizedHtml = personalizedHtml.replace(linkRegex, (match, attrs, href) => {
          // Skip tracking for unsubscribe, mailto, tel, and anchor links
          if (href.includes('/api/email/unsubscribe') || 
              href.startsWith('mailto:') || 
              href.startsWith('tel:') || 
              href.startsWith('#')) {
            return match;
          }
          
          // Create tracking URL
          const trackingUrl = `${baseUrl}/api/email/track?sendId=${sendId}&url=${encodeURIComponent(href)}`;
          // Replace the href in the attributes
          const newAttrs = attrs.replace(/href=["'][^"']+["']/i, `href="${trackingUrl}"`);
          return `<a ${newAttrs}>`;
        });
        
        // Add tracking pixel for open tracking (Resend also handles this, but we add our own for redundancy)
        const trackingPixelUrl = `${baseUrl}/api/email/track/open?sendId=${sendId}`;
        // Add pixel before closing body tag, or at the end if no body tag
        if (personalizedHtml.includes('</body>')) {
          personalizedHtml = personalizedHtml.replace('</body>', `<img src="${trackingPixelUrl}" width="1" height="1" style="display:none;" alt="" /></body>`);
        } else {
          personalizedHtml += `<img src="${trackingPixelUrl}" width="1" height="1" style="display:none;" alt="" />`;
        }
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

// Send booking confirmation email (internal - called from scheduling)
export const sendBookingConfirmationEmail = internalMutation({
  args: {
    bookingEmail: v.string(),
    bookingName: v.string(),
    slotStart: v.number(),
    slotEnd: v.number(),
    requestTitle: v.string(),
    requestDescription: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    try {
      const resend = await getResendClient(ctx);
      
      const domainSetting = await ctx.db
        .query("settings")
        .withIndex("by_key", (q: any) => q.eq("key", "emailDomain"))
        .first();
      
      const domain = domainSetting?.value || "onboarding.resend.dev";
      const fromEmail = `noreply@${domain}`;
      const fromName = "Ian Courtright";
      
      const startDate = new Date(args.slotStart);
      const endDate = new Date(args.slotEnd);
      const dateStr = startDate.toLocaleDateString(undefined, { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
      const timeStr = `${startDate.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })} - ${endDate.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`;
      
      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #FFA617; font-size: 24px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.05em;">Booking Confirmed</h1>
            <p>Hi ${args.bookingName},</p>
            <p>Your booking has been confirmed!</p>
            <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h2 style="margin-top: 0; font-size: 18px; font-weight: 900; text-transform: uppercase;">${args.requestTitle}</h2>
              ${args.requestDescription ? `<p>${args.requestDescription}</p>` : ''}
              <p><strong>Date:</strong> ${dateStr}</p>
              <p><strong>Time:</strong> ${timeStr}</p>
            </div>
            <p>We look forward to meeting with you!</p>
            <p>Best regards,<br>Ian Courtright</p>
          </body>
        </html>
      `;
      
      await resend.emails.send({
        from: `${fromName} <${fromEmail}>`,
        to: args.bookingEmail,
        subject: `Booking Confirmed: ${args.requestTitle}`,
        html: htmlContent,
      });
    } catch (error) {
      console.error("Failed to send booking confirmation email:", error);
      // Don't throw - booking should still succeed even if email fails
    }
  },
});

// Send booking reminder email (internal - called from scheduler)
export const sendBookingReminderEmail = internalMutation({
  args: {
    bookingEmail: v.string(),
    bookingName: v.string(),
    slotStart: v.number(),
    slotEnd: v.number(),
    requestTitle: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      const resend = await getResendClient(ctx);
      
      const domainSetting = await ctx.db
        .query("settings")
        .withIndex("by_key", (q: any) => q.eq("key", "emailDomain"))
        .first();
      
      const domain = domainSetting?.value || "onboarding.resend.dev";
      const fromEmail = `noreply@${domain}`;
      const fromName = "Ian Courtright";
      
      const startDate = new Date(args.slotStart);
      const endDate = new Date(args.slotEnd);
      const dateStr = startDate.toLocaleDateString(undefined, { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
      const timeStr = `${startDate.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })} - ${endDate.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`;
      
      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #FFA617; font-size: 24px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.05em;">Booking Reminder</h1>
            <p>Hi ${args.bookingName},</p>
            <p>This is a reminder about your upcoming booking:</p>
            <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h2 style="margin-top: 0; font-size: 18px; font-weight: 900; text-transform: uppercase;">${args.requestTitle}</h2>
              <p><strong>Date:</strong> ${dateStr}</p>
              <p><strong>Time:</strong> ${timeStr}</p>
            </div>
            <p>We look forward to meeting with you!</p>
            <p>Best regards,<br>Ian Courtright</p>
          </body>
        </html>
      `;
      
      await resend.emails.send({
        from: `${fromName} <${fromEmail}>`,
        to: args.bookingEmail,
        subject: `Reminder: ${args.requestTitle}`,
        html: htmlContent,
      });
    } catch (error) {
      console.error("Failed to send booking reminder email:", error);
      // Don't throw - reminder should fail silently
    }
  },
});

// Get booking trigger settings
export const getBookingTriggers = query({
  args: { email: v.optional(v.string()), sessionToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    // Development mode: check admin by email
    if (args.email) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_email", (q: any) => q.eq("email", args.email))
        .first();
      if (!user || user.role !== "admin") throw new Error("Unauthorized - admin access required");
    } else if (args.sessionToken) {
      await requireAdmin(ctx);
    } else {
      await requireAdmin(ctx);
    }

    const bookingCreatedTrigger = await ctx.db
      .query("settings")
      .withIndex("by_key", (q: any) => q.eq("key", "bookingCreatedTrigger"))
      .first();

    const bookingConfirmedTrigger = await ctx.db
      .query("settings")
      .withIndex("by_key", (q: any) => q.eq("key", "bookingConfirmedTrigger"))
      .first();

    return {
      bookingCreated: bookingCreatedTrigger?.value || null,
      bookingConfirmed: bookingConfirmedTrigger?.value || null,
    };
  },
});

// Save booking trigger settings
export const saveBookingTriggers = mutation({
  args: {
    bookingCreatedCampaignId: v.optional(v.id("emailCampaigns")),
    bookingConfirmedCampaignId: v.optional(v.id("emailCampaigns")),
    adminEmail: v.optional(v.string()),
    sessionToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Development mode: check admin by email
    if (args.adminEmail) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_email", (q: any) => q.eq("email", args.adminEmail))
        .first();
      if (!user || user.role !== "admin") throw new Error("Unauthorized - admin access required");
    } else if (args.sessionToken) {
      await requireAdmin(ctx);
    } else {
      await requireAdmin(ctx);
    }

    const now = Date.now();

    // Update or create booking created trigger
    if (args.bookingCreatedCampaignId !== undefined) {
      const existing = await ctx.db
        .query("settings")
        .withIndex("by_key", (q: any) => q.eq("key", "bookingCreatedTrigger"))
        .first();
      
      if (existing) {
        await ctx.db.patch(existing._id, {
          value: args.bookingCreatedCampaignId || null,
          updatedAt: now,
        });
      } else if (args.bookingCreatedCampaignId) {
        await ctx.db.insert("settings", {
          key: "bookingCreatedTrigger",
          value: args.bookingCreatedCampaignId,
          updatedAt: now,
        });
      }
    }

    // Update or create booking confirmed trigger
    if (args.bookingConfirmedCampaignId !== undefined) {
      const existing = await ctx.db
        .query("settings")
        .withIndex("by_key", (q: any) => q.eq("key", "bookingConfirmedTrigger"))
        .first();
      
      if (existing) {
        await ctx.db.patch(existing._id, {
          value: args.bookingConfirmedCampaignId || null,
          updatedAt: now,
        });
      } else if (args.bookingConfirmedCampaignId) {
        await ctx.db.insert("settings", {
          key: "bookingConfirmedTrigger",
          value: args.bookingConfirmedCampaignId,
          updatedAt: now,
        });
      }
    }

    return { success: true };
  },
});

// Send campaign to a single contact (for triggers)
export const sendTriggerCampaign = internalMutation({
  args: {
    campaignId: v.id("emailCampaigns"),
    contactId: v.id("emailContacts"),
  },
  handler: async (ctx, args) => {
    try {
      const campaign = await ctx.db.get(args.campaignId);
      const contact = await ctx.db.get(args.contactId);
      
      if (!campaign || !contact || contact.status !== "subscribed") return;

      const resend = await getResendClient(ctx);
      
      const domainSetting = await ctx.db
        .query("settings")
        .withIndex("by_key", (q: any) => q.eq("key", "emailDomain"))
        .first();
      
      const domain = domainSetting?.value || "onboarding.resend.dev";
      const fromEmail = campaign.fromEmail || `noreply@${domain}`;
      const fromName = campaign.fromName || "Ian Courtright";

      // Personalize content
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
      let htmlContent = campaign.htmlContent || "";
      htmlContent = htmlContent.replace(/\{\{firstName\}\}/g, contact.firstName || "");
      htmlContent = htmlContent.replace(/\{\{lastName\}\}/g, contact.lastName || "");
      htmlContent = htmlContent.replace(/\{\{email\}\}/g, contact.email);
      htmlContent = htmlContent.replace(/{{\s*first_name\s*}}/g, contact.firstName || "");
      htmlContent = htmlContent.replace(/{{\s*last_name\s*}}/g, contact.lastName || "");
      htmlContent = htmlContent.replace(/{{\s*email\s*}}/g, contact.email);
      htmlContent = htmlContent.replace(/{{\s*full_name\s*}}/g, 
        contact.firstName || contact.lastName 
          ? `${contact.firstName || ""} ${contact.lastName || ""}`.trim()
          : contact.email
      );
      
      // Create unsubscribe URL (using contactId as token for trigger campaigns)
      const unsubscribeUrl = `${baseUrl}/api/email/unsubscribe?token=${args.contactId}`;
      htmlContent = htmlContent.replace(/{{\s*unsubscribe_url\s*}}/g, unsubscribeUrl);
      
      // Create send record first to get sendId for tracking URLs
      const now = Date.now();
      const sendId = await ctx.db.insert("emailSends", {
        campaignId: args.campaignId,
        contactId: args.contactId,
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
      
      // Wrap all links with tracking URLs (except unsubscribe and mailto/tel links)
      const linkRegex = /<a\s+([^>]*href=["']([^"']+)["'][^>]*)>/gi;
      htmlContent = htmlContent.replace(linkRegex, (match, attrs, href) => {
        // Skip tracking for unsubscribe, mailto, tel, and anchor links
        if (href.includes('/api/email/unsubscribe') || 
            href.startsWith('mailto:') || 
            href.startsWith('tel:') || 
            href.startsWith('#')) {
          return match;
        }
        
        // Create tracking URL
        const trackingUrl = `${baseUrl}/api/email/track?sendId=${sendId}&url=${encodeURIComponent(href)}`;
        const newAttrs = attrs.replace(/href=["'][^"']+["']/i, `href="${trackingUrl}"`);
        return `<a ${newAttrs}>`;
      });
      
      // Add tracking pixel for open tracking
      const trackingPixelUrl = `${baseUrl}/api/email/track/open?sendId=${sendId}`;
      if (htmlContent.includes('</body>')) {
        htmlContent = htmlContent.replace('</body>', `<img src="${trackingPixelUrl}" width="1" height="1" style="display:none;" alt="" /></body>`);
      } else {
        htmlContent += `<img src="${trackingPixelUrl}" width="1" height="1" style="display:none;" alt="" />`;
      }

      const result = await resend.emails.send({
        from: `${fromName} <${fromEmail}>`,
        to: contact.email,
        subject: campaign.subject,
        html: htmlContent,
      });
      
      // Update send record with Resend email ID
      const resendEmailId = (result.data && 'id' in result.data) ? result.data.id : null;
      await ctx.db.patch(sendId, {
        resendEmailId: resendEmailId || undefined,
        status: "sent",
        sentAt: now,
        updatedAt: now,
      });
    } catch (error) {
      console.error("Failed to send trigger campaign:", error);
      // Don't throw - trigger should fail silently
    }
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
      v.literal("booking_created"),
      v.literal("booking_confirmed"),
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

// Get a single journey
export const getJourney = query({
  args: {
    journeyId: v.id("emailJourneys"),
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
    
    return await ctx.db.get(args.journeyId);
  },
});

// Update a journey
export const updateJourney = mutation({
  args: {
    journeyId: v.id("emailJourneys"),
    adminEmail: v.optional(v.string()),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    entryTrigger: v.optional(v.union(
      v.literal("manual"),
      v.literal("tag_added"),
      v.literal("campaign_opened"),
      v.literal("campaign_clicked"),
      v.literal("contact_created"),
      v.literal("booking_created"),
      v.literal("booking_confirmed"),
      v.literal("custom")
    )),
    entryTriggerData: v.optional(v.any()),
    steps: v.optional(v.array(v.object({
      stepNumber: v.number(),
      campaignId: v.id("emailCampaigns"),
      delayDays: v.number(),
      condition: v.optional(v.union(
        v.literal("always"),
        v.literal("if_opened"),
        v.literal("if_clicked"),
        v.literal("if_not_opened")
      )),
    }))),
    status: v.optional(v.union(
      v.literal("draft"),
      v.literal("active"),
      v.literal("paused"),
      v.literal("archived")
    )),
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
    
    const journey = await ctx.db.get(args.journeyId);
    if (!journey) {
      throw new Error("Journey not found");
    }
    
    const now = Date.now();
    const { journeyId, adminEmail, ...updates } = args;
    
    // Only update fields that are provided
    const updateData: any = { updatedAt: now };
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.entryTrigger !== undefined) updateData.entryTrigger = updates.entryTrigger;
    if (updates.entryTriggerData !== undefined) updateData.entryTriggerData = updates.entryTriggerData;
    if (updates.steps !== undefined) updateData.steps = updates.steps;
    if (updates.status !== undefined) updateData.status = updates.status;
    
    await ctx.db.patch(args.journeyId, updateData);
    return { success: true };
  },
});

// Delete a journey (soft delete - archive it)
export const deleteJourney = mutation({
  args: {
    journeyId: v.id("emailJourneys"),
    adminEmail: v.optional(v.string()),
    hardDelete: v.optional(v.boolean()),
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
    
    const journey = await ctx.db.get(args.journeyId);
    if (!journey) {
      throw new Error("Journey not found");
    }
    
    if (args.hardDelete) {
      // Hard delete - remove journey and all participants
      const participants = await ctx.db
        .query("emailJourneyParticipants")
        .withIndex("by_journey", (q: any) => q.eq("journeyId", args.journeyId))
        .collect();
      
      for (const participant of participants) {
        await ctx.db.delete(participant._id);
      }
      
      await ctx.db.delete(args.journeyId);
    } else {
      // Soft delete - archive it
      await ctx.db.patch(args.journeyId, {
        status: "archived",
        updatedAt: Date.now(),
      });
    }
    
    return { success: true };
  },
});

// Activate a journey
export const activateJourney = mutation({
  args: {
    journeyId: v.id("emailJourneys"),
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
    
    const journey = await ctx.db.get(args.journeyId);
    if (!journey) {
      throw new Error("Journey not found");
    }
    
    if (journey.steps.length === 0) {
      throw new Error("Journey must have at least one step to activate");
    }
    
    await ctx.db.patch(args.journeyId, {
      status: "active",
      updatedAt: Date.now(),
    });
    
    return { success: true };
  },
});

// Pause a journey
export const pauseJourney = mutation({
  args: {
    journeyId: v.id("emailJourneys"),
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
    
    const journey = await ctx.db.get(args.journeyId);
    if (!journey) {
      throw new Error("Journey not found");
    }
    
    await ctx.db.patch(args.journeyId, {
      status: "paused",
      updatedAt: Date.now(),
    });
    
    return { success: true };
  },
});

// Journey Participant Management

// Enroll a contact in a journey
export const enrollContactInJourney = mutation({
  args: {
    journeyId: v.id("emailJourneys"),
    contactId: v.id("emailContacts"),
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
    
    const journey = await ctx.db.get(args.journeyId);
    if (!journey) {
      throw new Error("Journey not found");
    }
    
    if (journey.status !== "active") {
      throw new Error("Can only enroll contacts in active journeys");
    }
    
    const contact = await ctx.db.get(args.contactId);
    if (!contact || contact.status !== "subscribed") {
      throw new Error("Contact not found or not subscribed");
    }
    
    // Check if contact is already enrolled
    const existing = await ctx.db
      .query("emailJourneyParticipants")
      .withIndex("by_journey", (q: any) => q.eq("journeyId", args.journeyId))
      .filter((q: any) => q.eq(q.field("contactId"), args.contactId))
      .first();
    
    if (existing) {
      // Reactivate if paused/exited
      if (existing.status !== "active") {
        const now = Date.now();
        const firstStep = journey.steps[0];
        const nextStepAt = firstStep ? now + (firstStep.delayDays * 24 * 60 * 60 * 1000) : undefined;
        
        await ctx.db.patch(existing._id, {
          status: "active",
          currentStep: 0,
          nextStepAt,
          updatedAt: now,
        });
      }
      return { success: true, participantId: existing._id };
    }
    
    // Create new participant
    const now = Date.now();
    const firstStep = journey.steps[0];
    const nextStepAt = firstStep ? now + (firstStep.delayDays * 24 * 60 * 60 * 1000) : undefined;
    
    const participantId = await ctx.db.insert("emailJourneyParticipants", {
      journeyId: args.journeyId,
      contactId: args.contactId,
      currentStep: 0,
      status: "active",
      enteredAt: now,
      nextStepAt,
      updatedAt: now,
    });
    
    // Schedule first step if it exists
    if (firstStep && nextStepAt) {
      await ctx.scheduler.runAt(
        nextStepAt,
        internal.emailMarketing.processJourneyStep,
        { participantId }
      );
    }
    
    return { success: true, participantId };
  },
});

// Get journey participants
export const getJourneyParticipants = query({
  args: {
    journeyId: v.id("emailJourneys"),
    email: v.optional(v.string()),
    status: v.optional(v.union(
      v.literal("active"),
      v.literal("completed"),
      v.literal("paused"),
      v.literal("exited")
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
    
    const participants = await ctx.db
      .query("emailJourneyParticipants")
      .withIndex("by_journey", (q: any) => q.eq("journeyId", args.journeyId))
      .collect();
    
    // Filter by status if provided
    let filtered = participants;
    if (args.status) {
      filtered = participants.filter(p => p.status === args.status);
    }
    
    // Get contact details for each participant
    const participantsWithContacts = await Promise.all(
      filtered.map(async (participant) => {
        const contact = await ctx.db.get(participant.contactId);
        return {
          ...participant,
          contact,
        };
      })
    );
    
    return participantsWithContacts;
  },
});

// Update participant status
export const updateParticipantStatus = mutation({
  args: {
    participantId: v.id("emailJourneyParticipants"),
    status: v.union(
      v.literal("active"),
      v.literal("completed"),
      v.literal("paused"),
      v.literal("exited")
    ),
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
    
    const participant = await ctx.db.get(args.participantId);
    if (!participant) {
      throw new Error("Participant not found");
    }
    
    await ctx.db.patch(args.participantId, {
      status: args.status,
      updatedAt: Date.now(),
      ...(args.status === "completed" ? { completedAt: Date.now() } : {}),
    });
    
    return { success: true };
  },
});

// Get journeys for a contact
export const getContactJourneys = query({
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
    
    const participants = await ctx.db
      .query("emailJourneyParticipants")
      .withIndex("by_contact", (q: any) => q.eq("contactId", args.contactId))
      .collect();
    
    // Get journey details for each participant
    const journeysWithParticipants = await Promise.all(
      participants.map(async (participant) => {
        const journey = await ctx.db.get(participant.journeyId);
        return {
          journey,
          participant,
        };
      })
    );
    
    return journeysWithParticipants;
  },
});

// Journey Execution Engine

// Enroll contact on trigger event (public - for webhooks)
export const enrollOnTrigger = mutation({
  args: {
    journeyId: v.id("emailJourneys"),
    contactId: v.id("emailContacts"),
    triggerData: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    // No auth required - this is called from webhooks
    const journey = await ctx.db.get(args.journeyId);
    if (!journey || journey.status !== "active") {
      return; // Journey not active, skip enrollment
    }
    
    const contact = await ctx.db.get(args.contactId);
    if (!contact || contact.status !== "subscribed") {
      return; // Contact not subscribed, skip enrollment
    }
    
    // Check if contact is already enrolled
    const existing = await ctx.db
      .query("emailJourneyParticipants")
      .withIndex("by_journey", (q: any) => q.eq("journeyId", args.journeyId))
      .filter((q: any) => q.eq(q.field("contactId"), args.contactId))
      .first();
    
    if (existing && existing.status === "active") {
      return; // Already enrolled and active
    }
    
    // Create or reactivate participant
    const now = Date.now();
    const firstStep = journey.steps[0];
    const nextStepAt = firstStep ? now + (firstStep.delayDays * 24 * 60 * 60 * 1000) : undefined;
    
    if (existing) {
      // Reactivate
      await ctx.db.patch(existing._id, {
        status: "active",
        currentStep: 0,
        nextStepAt,
        updatedAt: now,
      });
    } else {
      // Create new
      const participantId = await ctx.db.insert("emailJourneyParticipants", {
        journeyId: args.journeyId,
        contactId: args.contactId,
        currentStep: 0,
        status: "active",
        enteredAt: now,
        nextStepAt,
        updatedAt: now,
      });
      
      // Schedule first step
      if (firstStep && nextStepAt) {
        await ctx.scheduler.runAt(
          nextStepAt,
          internal.emailMarketing.processJourneyStep,
          { participantId }
        );
      }
    }
  },
});

// Enroll contact on trigger event (internal - for internal use)
export const enrollOnTriggerInternal = internalMutation({
  args: {
    journeyId: v.id("emailJourneys"),
    contactId: v.id("emailContacts"),
    triggerData: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const journey = await ctx.db.get(args.journeyId);
    if (!journey || journey.status !== "active") {
      return; // Journey not active, skip enrollment
    }
    
    const contact = await ctx.db.get(args.contactId);
    if (!contact || contact.status !== "subscribed") {
      return; // Contact not subscribed, skip enrollment
    }
    
    // Check if contact is already enrolled
    const existing = await ctx.db
      .query("emailJourneyParticipants")
      .withIndex("by_journey", (q: any) => q.eq("journeyId", args.journeyId))
      .filter((q: any) => q.eq(q.field("contactId"), args.contactId))
      .first();
    
    if (existing && existing.status === "active") {
      return; // Already enrolled and active
    }
    
    // Create or reactivate participant
    const now = Date.now();
    const firstStep = journey.steps[0];
    const nextStepAt = firstStep ? now + (firstStep.delayDays * 24 * 60 * 60 * 1000) : undefined;
    
    if (existing) {
      // Reactivate
      await ctx.db.patch(existing._id, {
        status: "active",
        currentStep: 0,
        nextStepAt,
        updatedAt: now,
      });
    } else {
      // Create new
      const participantId = await ctx.db.insert("emailJourneyParticipants", {
        journeyId: args.journeyId,
        contactId: args.contactId,
        currentStep: 0,
        status: "active",
        enteredAt: now,
        nextStepAt,
        updatedAt: now,
      });
      
      // Schedule first step
      if (firstStep && nextStepAt) {
        await ctx.scheduler.runAt(
          nextStepAt,
          internal.emailMarketing.processJourneyStep,
          { participantId }
        );
      }
    }
  },
});

// Process a journey step (internal)
export const processJourneyStep = internalMutation({
  args: {
    participantId: v.id("emailJourneyParticipants"),
  },
  handler: async (ctx, args) => {
    const participant = await ctx.db.get(args.participantId);
    if (!participant || participant.status !== "active") {
      return; // Participant not active, skip
    }
    
    const journey = await ctx.db.get(participant.journeyId);
    if (!journey || journey.status !== "active") {
      // Journey is no longer active, exit participant
      await ctx.db.patch(args.participantId, {
        status: "exited",
        updatedAt: Date.now(),
      });
      return;
    }
    
    const contact = await ctx.db.get(participant.contactId);
    if (!contact || contact.status !== "subscribed") {
      // Contact unsubscribed, exit participant
      await ctx.db.patch(args.participantId, {
        status: "exited",
        updatedAt: Date.now(),
      });
      return;
    }
    
    // Get current step
    const currentStepIndex = participant.currentStep;
    const currentStep = journey.steps[currentStepIndex];
    
    if (!currentStep) {
      // No more steps, mark as completed
      await ctx.db.patch(args.participantId, {
        status: "completed",
        completedAt: Date.now(),
        updatedAt: Date.now(),
      });
      return;
    }
    
    // Check step condition
    let shouldSend = false;
    
    if (currentStep.condition === "always" || !currentStep.condition) {
      shouldSend = true;
    } else if (currentStep.condition === "if_opened" || currentStep.condition === "if_clicked") {
      // Check if previous step was opened/clicked
      if (currentStepIndex > 0) {
        const previousStep = journey.steps[currentStepIndex - 1];
        const previousSends = await ctx.db
          .query("emailSends")
          .withIndex("by_contact", (q: any) => q.eq("contactId", participant.contactId))
          .filter((q: any) => q.eq(q.field("campaignId"), previousStep.campaignId))
          .collect();
        
        if (currentStep.condition === "if_opened") {
          shouldSend = previousSends.some(s => s.opened);
        } else if (currentStep.condition === "if_clicked") {
          shouldSend = previousSends.some(s => s.clicked);
        }
      } else {
        // First step, always send
        shouldSend = true;
      }
    } else if (currentStep.condition === "if_not_opened") {
      // Check if previous step was NOT opened
      if (currentStepIndex > 0) {
        const previousStep = journey.steps[currentStepIndex - 1];
        const previousSends = await ctx.db
          .query("emailSends")
          .withIndex("by_contact", (q: any) => q.eq("contactId", participant.contactId))
          .filter((q: any) => q.eq(q.field("campaignId"), previousStep.campaignId))
          .collect();
        
        shouldSend = !previousSends.some(s => s.opened);
      } else {
        // First step, always send
        shouldSend = true;
      }
    }
    
    if (shouldSend) {
      // Send the campaign
      await ctx.scheduler.runAfter(0, internal.emailMarketing.sendTriggerCampaign, {
        campaignId: currentStep.campaignId,
        contactId: participant.contactId,
      });
      
      // Move to next step
      const nextStepIndex = currentStepIndex + 1;
      const nextStep = journey.steps[nextStepIndex];
      
      if (nextStep) {
        // Schedule next step
        const now = Date.now();
        const nextStepAt = now + (nextStep.delayDays * 24 * 60 * 60 * 1000);
        
        await ctx.db.patch(args.participantId, {
          currentStep: nextStepIndex,
          nextStepAt,
          updatedAt: now,
        });
        
        // Schedule next step processing
        await ctx.scheduler.runAt(
          nextStepAt,
          internal.emailMarketing.processJourneyStep,
          { participantId: args.participantId }
        );
      } else {
        // No more steps, mark as completed
        await ctx.db.patch(args.participantId, {
          status: "completed",
          completedAt: Date.now(),
          updatedAt: Date.now(),
        });
      }
    } else {
      // Condition not met, exit journey
      await ctx.db.patch(args.participantId, {
        status: "exited",
        updatedAt: Date.now(),
      });
    }
  },
});

// Get due participants (internal query for scheduled action)
export const getDueParticipants = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const participants = await ctx.db
      .query("emailJourneyParticipants")
      .withIndex("by_next_step_at", (q: any) => q.lte("nextStepAt", now))
      .filter((q: any) => q.eq(q.field("status"), "active"))
      .collect();
    
    return participants;
  },
});

// Check and process journeys (scheduled action - can be called periodically)
export const checkAndProcessJourneys = internalAction({
  args: {},
  handler: async (ctx) => {
    // Find all participants with due steps
    const dueParticipants = await ctx.runMutation(internal.emailMarketing.getDueParticipants, {});
    
    // Process each participant
    for (const participant of dueParticipants) {
      await ctx.scheduler.runAfter(0, internal.emailMarketing.processJourneyStep, {
        participantId: participant._id,
      });
    }
  },
});

// Get journey analytics
export const getJourneyAnalytics = query({
  args: {
    journeyId: v.id("emailJourneys"),
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
    
    const journey = await ctx.db.get(args.journeyId);
    if (!journey) {
      throw new Error("Journey not found");
    }
    
    // Get all participants
    const participants = await ctx.db
      .query("emailJourneyParticipants")
      .withIndex("by_journey", (q: any) => q.eq("journeyId", args.journeyId))
      .collect();
    
    const total = participants.length;
    const active = participants.filter(p => p.status === "active").length;
    const completed = participants.filter(p => p.status === "completed").length;
    const paused = participants.filter(p => p.status === "paused").length;
    const exited = participants.filter(p => p.status === "exited").length;
    
    // Get step analytics
    const stepAnalytics = await Promise.all(
      journey.steps.map(async (step, index) => {
        // Get participants who reached this step
        const reachedStep = participants.filter(p => p.currentStep >= index);
        
        // Get sends for this step
        const sends = await ctx.db
          .query("emailSends")
          .withIndex("by_contact", (q: any) => q.eq("contactId", step.campaignId))
          .collect();
        
        // Filter sends for participants in this journey
        const participantIds = new Set(participants.map(p => p.contactId));
        const stepSends = sends.filter(s => participantIds.has(s.contactId) && s.campaignId === step.campaignId);
        
        const sent = stepSends.length;
        const opened = stepSends.filter(s => s.opened).length;
        const clicked = stepSends.filter(s => s.clicked).length;
        
        return {
          stepNumber: index + 1,
          campaignId: step.campaignId,
          delayDays: step.delayDays,
          condition: step.condition,
          reached: reachedStep.length,
          sent,
          opened,
          clicked,
          openRate: sent > 0 ? (opened / sent) * 100 : 0,
          clickRate: sent > 0 ? (clicked / sent) * 100 : 0,
        };
      })
    );
    
    return {
      total,
      active,
      completed,
      paused,
      exited,
      completionRate: total > 0 ? (completed / total) * 100 : 0,
      stepAnalytics,
    };
  },
});

