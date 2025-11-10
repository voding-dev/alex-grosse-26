import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// ============ Leads ============

export const leadsList = query({
  args: {
    status: v.optional(v.union(
      v.literal("new"),
      v.literal("contacted"),
      v.literal("qualified"),
      v.literal("proposal"),
      v.literal("closed")
    )),
    searchQuery: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    sortBy: v.optional(v.union(
      v.literal("name"),
      v.literal("status"),
      v.literal("createdAt"),
      v.literal("updatedAt")
    )),
    sortOrder: v.optional(v.union(v.literal("asc"), v.literal("desc"))),
  },
  handler: async (ctx, args) => {
    let leads = await ctx.db
      .query("leads")
      .withIndex("by_created_at")
      .order("desc")
      .collect();

    // Filter by status
    if (args.status) {
      leads = leads.filter((lead) => lead.status === args.status);
    }

    // Filter by tags
    if (args.tags && args.tags.length > 0) {
      leads = leads.filter((lead) =>
        args.tags!.some((tag) => lead.tags.includes(tag))
      );
    }

    // Filter by search query
    if (args.searchQuery) {
      const query = args.searchQuery.toLowerCase();
      leads = leads.filter(
        (lead) =>
          lead.name.toLowerCase().includes(query) ||
          lead.address.toLowerCase().includes(query) ||
          (lead.contactName && lead.contactName.toLowerCase().includes(query)) ||
          (lead.contactEmail && lead.contactEmail.toLowerCase().includes(query)) ||
          lead.emails.some((email) => email.toLowerCase().includes(query))
      );
    }

    // Populate prospect and contact info
    const leadsWithInfo = await Promise.all(
      leads.map(async (lead) => {
        const prospect = await ctx.db.get(lead.prospectId);
        const contact = lead.contactId ? await ctx.db.get(lead.contactId) : null;

        return {
          ...lead,
          prospectName: prospect?.name,
          contactName: contact?.contactName || lead.contactName,
        };
      })
    );

    // Sort
    if (args.sortBy) {
      const order = args.sortOrder || "desc";
      leadsWithInfo.sort((a, b) => {
        let aVal: any;
        let bVal: any;

        switch (args.sortBy) {
          case "name":
            aVal = a.name.toLowerCase();
            bVal = b.name.toLowerCase();
            break;
          case "status":
            aVal = a.status;
            bVal = b.status;
            break;
          case "createdAt":
            aVal = a.createdAt;
            bVal = b.createdAt;
            break;
          case "updatedAt":
            aVal = a.updatedAt;
            bVal = b.updatedAt;
            break;
          default:
            return 0;
        }

        if (aVal < bVal) return order === "asc" ? -1 : 1;
        if (aVal > bVal) return order === "asc" ? 1 : -1;
        return 0;
      });
    }

    return leadsWithInfo;
  },
});

export const leadsGet = query({
  args: { id: v.id("leads") },
  handler: async (ctx, args) => {
    const lead = await ctx.db.get(args.id);
    if (!lead) return null;

    const prospect = await ctx.db.get(lead.prospectId);
    const contact = lead.contactId ? await ctx.db.get(lead.contactId) : null;

    return {
      ...lead,
      prospect,
      contact,
    };
  },
});

export const leadsCreate = mutation({
  args: {
    prospectId: v.id("prospects"),
    contactName: v.optional(v.string()),
    contactTitle: v.optional(v.string()),
    contactPhone: v.optional(v.string()),
    contactEmail: v.optional(v.string()),
    notes: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    // Get the prospect
    const prospect = await ctx.db.get(args.prospectId);
    if (!prospect) {
      throw new Error("Prospect not found");
    }

    // Check if prospect is already converted
    if (prospect.convertedToLeadId) {
      throw new Error("Prospect has already been converted to a lead");
    }

    const now = Date.now();

    // Create the lead with all prospect data
    const leadId = await ctx.db.insert("leads", {
      prospectId: args.prospectId,
      name: prospect.name,
      address: prospect.address,
      website: prospect.website,
      phone: prospect.phone,
      instagram: prospect.instagram,
      facebook: prospect.facebook,
      youtube: prospect.youtube,
      twitter: prospect.twitter,
      linkedin: prospect.linkedin,
      emails: prospect.emails,
      googleBusinessLink: prospect.googleBusinessLink,
      contactName: args.contactName,
      contactTitle: args.contactTitle,
      contactPhone: args.contactPhone,
      contactEmail: args.contactEmail,
      status: "new",
      notes: args.notes,
      tags: args.tags || [],
      createdAt: now,
      updatedAt: now,
    });

    // Mark prospect as converted
    await ctx.db.patch(args.prospectId, {
      convertedToLeadId: leadId,
      convertedAt: now,
    });

    // Auto-create contact from lead
    // Use the contactEmail if provided, otherwise use first email from prospect
    const primaryEmail = args.contactEmail || (prospect.emails.length > 0 ? prospect.emails[0] : null);
    
    if (primaryEmail) {
      // Check if contact already exists with this email
      const existingContact = await ctx.db
        .query("contacts")
        .withIndex("by_email", (q) => q.eq("email", primaryEmail))
        .first();

      let contactId: Id<"contacts">;

      if (existingContact) {
        // Update existing contact with lead info
        contactId = existingContact._id;
        await ctx.db.patch(contactId, {
          leadId: leadId,
          prospectId: args.prospectId,
          source: "lead",
          businessName: prospect.name,
          address: prospect.address,
          website: prospect.website,
          phone: prospect.phone,
          instagram: prospect.instagram,
          facebook: prospect.facebook,
          youtube: prospect.youtube,
          twitter: prospect.twitter,
          linkedin: prospect.linkedin,
          googleBusinessLink: prospect.googleBusinessLink,
          contactName: args.contactName,
          contactTitle: args.contactTitle,
          contactPhone: args.contactPhone,
          updatedAt: now,
        });
      } else {
        // Create new contact
        contactId = await ctx.db.insert("contacts", {
          email: primaryEmail,
          firstName: args.contactName?.split(" ")[0],
          lastName: args.contactName?.split(" ").slice(1).join(" ") || undefined,
          businessName: prospect.name,
          address: prospect.address,
          website: prospect.website,
          phone: prospect.phone,
          instagram: prospect.instagram,
          facebook: prospect.facebook,
          youtube: prospect.youtube,
          twitter: prospect.twitter,
          linkedin: prospect.linkedin,
          googleBusinessLink: prospect.googleBusinessLink,
          contactName: args.contactName,
          contactTitle: args.contactTitle,
          contactPhone: args.contactPhone,
          source: "lead",
          leadId: leadId,
          prospectId: args.prospectId,
          tags: args.tags || [],
          notes: args.notes,
          createdAt: now,
          updatedAt: now,
        });
      }

      // Update lead with contact ID
      await ctx.db.patch(leadId, {
        contactId: contactId,
      });

      // Sync to email marketing (create email marketing contact)
      const contact = await ctx.db.get(contactId);
      if (contact) {
        // Check if email contact exists with this email
        const existing = await ctx.db
          .query("emailContacts")
          .withIndex("by_email", (q) => q.eq("email", contact.email))
          .first();

        let emailMarketingId: Id<"emailContacts">;

        if (existing) {
          // Link to existing
          emailMarketingId = existing._id;
          await ctx.db.patch(emailMarketingId, {
            contactId: contactId,
            firstName: contact.firstName || contact.contactName?.split(" ")[0],
            lastName: contact.lastName || contact.contactName?.split(" ").slice(1).join(" ") || undefined,
            tags: contact.tags,
            source: contact.source,
            metadata: {
              businessName: contact.businessName,
              address: contact.address,
              website: contact.website,
              phone: contact.phone,
              contactName: contact.contactName,
              contactTitle: contact.contactTitle,
              contactPhone: contact.contactPhone,
            },
            updatedAt: now,
          });
        } else {
          // Create new
          emailMarketingId = await ctx.db.insert("emailContacts", {
            email: contact.email,
            firstName: contact.firstName || contact.contactName?.split(" ")[0],
            lastName: contact.lastName || contact.contactName?.split(" ").slice(1).join(" ") || undefined,
            tags: contact.tags,
            status: "subscribed",
            source: contact.source,
            metadata: {
              businessName: contact.businessName,
              address: contact.address,
              website: contact.website,
              phone: contact.phone,
              contactName: contact.contactName,
              contactTitle: contact.contactTitle,
              contactPhone: contact.contactPhone,
            },
            contactId: contactId,
            createdAt: now,
            updatedAt: now,
          });
        }

        // Update contact with email marketing ID
        await ctx.db.patch(contactId, {
          emailMarketingId: emailMarketingId,
          updatedAt: now,
        });
      }
    }

    return leadId;
  },
});

export const leadsUpdate = mutation({
  args: {
    id: v.id("leads"),
    name: v.optional(v.string()),
    address: v.optional(v.string()),
    website: v.optional(v.string()),
    phone: v.optional(v.string()),
    instagram: v.optional(v.string()),
    facebook: v.optional(v.string()),
    youtube: v.optional(v.string()),
    twitter: v.optional(v.string()),
    linkedin: v.optional(v.string()),
    emails: v.optional(v.array(v.string())),
    googleBusinessLink: v.optional(v.string()),
    contactName: v.optional(v.string()),
    contactTitle: v.optional(v.string()),
    contactPhone: v.optional(v.string()),
    contactEmail: v.optional(v.string()),
    status: v.optional(v.union(
      v.literal("new"),
      v.literal("contacted"),
      v.literal("qualified"),
      v.literal("proposal"),
      v.literal("closed")
    )),
    closedOutcome: v.optional(v.union(v.literal("won"), v.literal("lost"))),
    notes: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const lead = await ctx.db.get(args.id);
    if (!lead) {
      throw new Error("Lead not found");
    }

    const update: any = { updatedAt: Date.now() };

    if (args.name !== undefined) update.name = args.name;
    if (args.address !== undefined) update.address = args.address;
    if (args.website !== undefined) update.website = args.website;
    if (args.phone !== undefined) update.phone = args.phone;
    if (args.instagram !== undefined) update.instagram = args.instagram;
    if (args.facebook !== undefined) update.facebook = args.facebook;
    if (args.youtube !== undefined) update.youtube = args.youtube;
    if (args.twitter !== undefined) update.twitter = args.twitter;
    if (args.linkedin !== undefined) update.linkedin = args.linkedin;
    if (args.emails !== undefined) update.emails = args.emails;
    if (args.googleBusinessLink !== undefined) update.googleBusinessLink = args.googleBusinessLink;
    if (args.contactName !== undefined) update.contactName = args.contactName;
    if (args.contactTitle !== undefined) update.contactTitle = args.contactTitle;
    if (args.contactPhone !== undefined) update.contactPhone = args.contactPhone;
    if (args.contactEmail !== undefined) update.contactEmail = args.contactEmail;
    if (args.status !== undefined) update.status = args.status;
    if (args.closedOutcome !== undefined) update.closedOutcome = args.closedOutcome;
    if (args.notes !== undefined) update.notes = args.notes;
    if (args.tags !== undefined) update.tags = args.tags;

    await ctx.db.patch(args.id, update);

    // Sync to contact if exists
    if (lead.contactId) {
      const contact = await ctx.db.get(lead.contactId);
      if (contact) {
        const contactUpdate: any = { updatedAt: Date.now() };
        
        if (args.name !== undefined) contactUpdate.businessName = args.name;
        if (args.address !== undefined) contactUpdate.address = args.address;
        if (args.website !== undefined) contactUpdate.website = args.website;
        if (args.phone !== undefined) contactUpdate.phone = args.phone;
        if (args.instagram !== undefined) contactUpdate.instagram = args.instagram;
        if (args.facebook !== undefined) contactUpdate.facebook = args.facebook;
        if (args.youtube !== undefined) contactUpdate.youtube = args.youtube;
        if (args.twitter !== undefined) contactUpdate.twitter = args.twitter;
        if (args.linkedin !== undefined) contactUpdate.linkedin = args.linkedin;
        if (args.googleBusinessLink !== undefined) contactUpdate.googleBusinessLink = args.googleBusinessLink;
        if (args.contactName !== undefined) contactUpdate.contactName = args.contactName;
        if (args.contactTitle !== undefined) contactUpdate.contactTitle = args.contactTitle;
        if (args.contactPhone !== undefined) contactUpdate.contactPhone = args.contactPhone;
        if (args.notes !== undefined) contactUpdate.notes = args.notes;
        if (args.tags !== undefined) contactUpdate.tags = args.tags;

        await ctx.db.patch(lead.contactId, contactUpdate);

        // Sync to email marketing
        // This will be handled by the contact update
      }
    }

    return args.id;
  },
});

export const leadsRemove = mutation({
  args: { id: v.id("leads") },
  handler: async (ctx, args) => {
    const lead = await ctx.db.get(args.id);
    if (!lead) {
      throw new Error("Lead not found");
    }

    // Optionally unmark prospect as converted
    const prospect = await ctx.db.get(lead.prospectId);
    if (prospect && prospect.convertedToLeadId === args.id) {
      await ctx.db.patch(lead.prospectId, {
        convertedToLeadId: undefined,
        convertedAt: undefined,
      });
    }

    // Delete the lead (contact remains)
    await ctx.db.delete(args.id);
  },
});

