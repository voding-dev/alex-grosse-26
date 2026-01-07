import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";

// ============ Contacts ============

export const contactsList = query({
  args: {
    source: v.optional(v.string()), // "lead", "email_marketing", "manual"
    searchQuery: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    sortBy: v.optional(v.union(
      v.literal("name"),
      v.literal("email"),
      v.literal("source"),
      v.literal("createdAt"),
      v.literal("updatedAt")
    )),
    sortOrder: v.optional(v.union(v.literal("asc"), v.literal("desc"))),
  },
  handler: async (ctx, args) => {
    let contacts = await ctx.db
      .query("contacts")
      .collect();

    // Filter by source
    if (args.source) {
      contacts = contacts.filter((contact) => contact.source === args.source);
    }

    // Filter by tags
    if (args.tags && args.tags.length > 0) {
      contacts = contacts.filter((contact) =>
        args.tags!.some((tag) => contact.tags.includes(tag))
      );
    }

    // Filter by search query
    if (args.searchQuery) {
      const query = args.searchQuery.toLowerCase();
      contacts = contacts.filter(
        (contact) =>
          contact.email.toLowerCase().includes(query) ||
          (contact.firstName && contact.firstName.toLowerCase().includes(query)) ||
          (contact.lastName && contact.lastName.toLowerCase().includes(query)) ||
          (contact.businessName && contact.businessName.toLowerCase().includes(query)) ||
          (contact.contactName && contact.contactName.toLowerCase().includes(query)) ||
          (contact.address && contact.address.toLowerCase().includes(query))
      );
    }

    // Populate related data
    const contactsWithInfo = await Promise.all(
      contacts.map(async (contact) => {
        const lead = contact.leadId ? await ctx.db.get(contact.leadId) : null;
        const prospect = contact.prospectId ? await ctx.db.get(contact.prospectId) : null;
        const company = contact.companyId ? await ctx.db.get(contact.companyId) : null;
        
        // Get projects for this contact
        const projects = await ctx.db
          .query("clientProjects")
          .withIndex("by_contact", (q: any) => q.eq("contactId", contact._id))
          .collect();
        
        // Get bookings for this contact (through scheduling requests)
        const bookings = await ctx.db
          .query("schedulingRequests")
          .withIndex("by_contact", (q: any) => q.eq("contactId", contact._id))
          .collect();

        return {
          ...contact,
          lead,
          prospect,
          company,
          projects,
          bookings,
        };
      })
    );

    // Sort
    if (args.sortBy) {
      const order = args.sortOrder || "desc";
      contactsWithInfo.sort((a, b) => {
        let aVal: any;
        let bVal: any;

        switch (args.sortBy) {
          case "name":
            aVal = (a.businessName || a.contactName || a.email || "").toLowerCase();
            bVal = (b.businessName || b.contactName || b.email || "").toLowerCase();
            break;
          case "email":
            aVal = a.email.toLowerCase();
            bVal = b.email.toLowerCase();
            break;
          case "source":
            aVal = a.source || "";
            bVal = b.source || "";
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

    return contactsWithInfo;
  },
});

export const contactsGet = query({
  args: { id: v.id("contacts") },
  handler: async (ctx, args) => {
    const contact = await ctx.db.get(args.id);
    if (!contact) return null;

    const lead = contact.leadId ? await ctx.db.get(contact.leadId) : null;
    const prospect = contact.prospectId ? await ctx.db.get(contact.prospectId) : null;
    const company = contact.companyId ? await ctx.db.get(contact.companyId) : null;

    return {
      ...contact,
      lead,
      prospect,
      company,
    };
  },
});

export const contactsCreate = mutation({
  args: {
    email: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    businessName: v.optional(v.string()),
    address: v.optional(v.string()),
    website: v.optional(v.string()),
    phone: v.optional(v.string()),
    instagram: v.optional(v.string()),
    facebook: v.optional(v.string()),
    youtube: v.optional(v.string()),
    twitter: v.optional(v.string()),
    linkedin: v.optional(v.string()),
    googleBusinessLink: v.optional(v.string()),
    contactName: v.optional(v.string()),
    contactTitle: v.optional(v.string()),
    contactPhone: v.optional(v.string()),
    source: v.optional(v.string()),
    companyId: v.optional(v.id("companies")),
    tags: v.optional(v.array(v.string())),
    notes: v.optional(v.string()),
    lastContactedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Check if contact already exists
    const existing = await ctx.db
      .query("contacts")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (existing) {
      throw new Error("Contact with this email already exists");
    }

    const now = Date.now();
    const contactId = await ctx.db.insert("contacts", {
      email: args.email,
      firstName: args.firstName,
      lastName: args.lastName,
      businessName: args.businessName,
      address: args.address,
      website: args.website,
      phone: args.phone,
      instagram: args.instagram,
      facebook: args.facebook,
      youtube: args.youtube,
      twitter: args.twitter,
      linkedin: args.linkedin,
      googleBusinessLink: args.googleBusinessLink,
      contactName: args.contactName,
      contactTitle: args.contactTitle,
      contactPhone: args.contactPhone,
      source: args.source || "manual",
      companyId: args.companyId,
      tags: args.tags || [],
      notes: args.notes,
      lastContactedAt: args.lastContactedAt,
      createdAt: now,
      updatedAt: now,
    });

    return contactId;
  },
});

export const contactsUpdate = mutation({
  args: {
    id: v.id("contacts"),
    email: v.optional(v.string()),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    businessName: v.optional(v.string()),
    address: v.optional(v.string()),
    website: v.optional(v.string()),
    phone: v.optional(v.string()),
    instagram: v.optional(v.string()),
    facebook: v.optional(v.string()),
    youtube: v.optional(v.string()),
    twitter: v.optional(v.string()),
    linkedin: v.optional(v.string()),
    googleBusinessLink: v.optional(v.string()),
    contactName: v.optional(v.string()),
    contactTitle: v.optional(v.string()),
    contactPhone: v.optional(v.string()),
    companyId: v.optional(v.id("companies")),
    tags: v.optional(v.array(v.string())),
    notes: v.optional(v.string()),
    lastContactedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const contact = await ctx.db.get(args.id);
    if (!contact) {
      throw new Error("Contact not found");
    }

    // Check if email is being changed and if new email already exists
        if (args.email && args.email !== contact.email) {
      const existing = await ctx.db
        .query("contacts")
        .withIndex("by_email", (q: any) => q.eq("email", args.email))
        .first();

      if (existing) {
        throw new Error("Contact with this email already exists");
      }
    }

    const update: any = { updatedAt: Date.now() };

    if (args.email !== undefined) update.email = args.email;
    if (args.firstName !== undefined) update.firstName = args.firstName;
    if (args.lastName !== undefined) update.lastName = args.lastName;
    if (args.businessName !== undefined) update.businessName = args.businessName;
    if (args.address !== undefined) update.address = args.address;
    if (args.website !== undefined) update.website = args.website;
    if (args.phone !== undefined) update.phone = args.phone;
    if (args.instagram !== undefined) update.instagram = args.instagram;
    if (args.facebook !== undefined) update.facebook = args.facebook;
    if (args.youtube !== undefined) update.youtube = args.youtube;
    if (args.twitter !== undefined) update.twitter = args.twitter;
    if (args.linkedin !== undefined) update.linkedin = args.linkedin;
    if (args.googleBusinessLink !== undefined) update.googleBusinessLink = args.googleBusinessLink;
    if (args.contactName !== undefined) update.contactName = args.contactName;
    if (args.contactTitle !== undefined) update.contactTitle = args.contactTitle;
    if (args.contactPhone !== undefined) update.contactPhone = args.contactPhone;
    if (args.companyId !== undefined) update.companyId = args.companyId;
    if (args.tags !== undefined) update.tags = args.tags;
    if (args.notes !== undefined) update.notes = args.notes;
    if (args.lastContactedAt !== undefined) update.lastContactedAt = args.lastContactedAt;

    await ctx.db.patch(args.id, update);

    // Sync to lead if exists
    if (contact.leadId) {
      const lead = await ctx.db.get(contact.leadId);
      if (lead) {
        const leadUpdate: any = { updatedAt: Date.now() };
        
        if (args.businessName !== undefined) leadUpdate.name = args.businessName;
        if (args.address !== undefined) leadUpdate.address = args.address;
        if (args.website !== undefined) leadUpdate.website = args.website;
        if (args.phone !== undefined) leadUpdate.phone = args.phone;
        if (args.instagram !== undefined) leadUpdate.instagram = args.instagram;
        if (args.facebook !== undefined) leadUpdate.facebook = args.facebook;
        if (args.youtube !== undefined) leadUpdate.youtube = args.youtube;
        if (args.twitter !== undefined) leadUpdate.twitter = args.twitter;
        if (args.linkedin !== undefined) leadUpdate.linkedin = args.linkedin;
        if (args.googleBusinessLink !== undefined) leadUpdate.googleBusinessLink = args.googleBusinessLink;
        if (args.contactName !== undefined) leadUpdate.contactName = args.contactName;
        if (args.contactTitle !== undefined) leadUpdate.contactTitle = args.contactTitle;
        if (args.contactPhone !== undefined) leadUpdate.contactPhone = args.contactPhone;
        if (args.notes !== undefined) leadUpdate.notes = args.notes;
        if (args.tags !== undefined) leadUpdate.tags = args.tags;

        await ctx.db.patch(contact.leadId, leadUpdate);
      }
    }

    return args.id;
  },
});

export const contactsRemove = mutation({
  args: { id: v.id("contacts") },
  handler: async (ctx, args) => {
    const contact = await ctx.db.get(args.id);
    if (!contact) {
      throw new Error("Contact not found");
    }

    // Delete the contact
    await ctx.db.delete(args.id);
  },
});

// ============ Contact Form Submission ============

export const submitContactForm = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    phone: v.string(),
    message: v.string(),
    honeypot: v.optional(v.string()), // Hidden field to catch bots
  },
  handler: async (ctx, args) => {
    // Honeypot spam protection - if filled, reject silently
    if (args.honeypot && args.honeypot.trim() !== "") {
      // Bot detected - pretend success but don't save
      console.log("Spam detected via honeypot:", args.email);
      return { success: true };
    }

    // Basic validation
    if (!args.name || !args.email || !args.phone || !args.message) {
      throw new Error("Name, email, phone, and message are required.");
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(args.email)) {
      throw new Error("Invalid email format.");
    }

    // Format notes with message
    const formattedNotes = `Contact Form Message:\n${args.message}`;

    const now = Date.now();

    // Check if lead already exists with this email
    // First check by contactEmail index
    let existingLead = await ctx.db
      .query("leads")
      .withIndex("by_contact_email", (q) => q.eq("contactEmail", args.email))
      .first();
    
    // If not found, check emails array
    if (!existingLead) {
      const allLeads = await ctx.db
        .query("leads")
        .collect();
      existingLead = allLeads.find(lead => lead.emails.includes(args.email)) || null;
    }

    if (existingLead) {
      // Update existing lead with new inquiry
      const existingNotes = existingLead.notes || "";
      const updatedNotes = existingNotes 
        ? `${existingNotes}\n\n---\n\nNew inquiry (${new Date(now).toLocaleDateString()}):\n${formattedNotes}`
        : formattedNotes;

      await ctx.db.patch(existingLead._id, {
        contactPhone: args.phone,
        notes: updatedNotes,
        updatedAt: now,
      });

      return { success: true, leadId: existingLead._id };
    } else {
      // Create new lead from form submission
      // Parse name - use as contactName, and try to extract business name if provided
      const nameParts = args.name.trim().split(" ");
      const contactName = args.name.trim();
      
      // Create lead with contact form data
      const leadId = await ctx.db.insert("leads", {
        // No prospectId for contact form leads
        name: contactName, // Use contact name as business name placeholder
        address: "", // Not provided in form
        phone: args.phone,
        emails: [args.email],
        contactName: contactName,
        contactEmail: args.email,
        contactPhone: args.phone,
        status: "new",
        tags: ["website-inquiry", "contact-form"],
        notes: formattedNotes,
        createdAt: now,
        updatedAt: now,
      });

      return { success: true, leadId };
    }
  },
});

// ============ Companies ============

export const companiesList = query({
  args: {
    searchQuery: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    sortBy: v.optional(v.union(
      v.literal("name"),
      v.literal("createdAt"),
      v.literal("updatedAt")
    )),
    sortOrder: v.optional(v.union(v.literal("asc"), v.literal("desc"))),
  },
  handler: async (ctx, args) => {
    let companies = await ctx.db
      .query("companies")
      .collect();

    // Filter by tags
    if (args.tags && args.tags.length > 0) {
      companies = companies.filter((company) =>
        args.tags!.some((tag) => company.tags.includes(tag))
      );
    }

    // Filter by search query
    if (args.searchQuery) {
      const query = args.searchQuery.toLowerCase();
      companies = companies.filter(
        (company) =>
          company.name.toLowerCase().includes(query) ||
          (company.address && company.address.toLowerCase().includes(query)) ||
          (company.website && company.website.toLowerCase().includes(query))
      );
    }

    // Get contact counts for each company
    const companiesWithCounts = await Promise.all(
      companies.map(async (company) => {
        const contactCount = await ctx.db
          .query("contacts")
          .withIndex("by_company", (q: any) => q.eq("companyId", company._id))
          .collect();
        
        return {
          ...company,
          contactCount: contactCount.length,
        };
      })
    );

    // Sort
    if (args.sortBy) {
      const order = args.sortOrder || "desc";
      companiesWithCounts.sort((a, b) => {
        let aVal: any;
        let bVal: any;

        switch (args.sortBy) {
          case "name":
            aVal = a.name.toLowerCase();
            bVal = b.name.toLowerCase();
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

    return companiesWithCounts;
  },
});

export const companiesGet = query({
  args: { id: v.id("companies") },
  handler: async (ctx, args) => {
    const company = await ctx.db.get(args.id);
    if (!company) return null;

    // Get all contacts for this company
    const contacts = await ctx.db
      .query("contacts")
      .withIndex("by_company", (q: any) => q.eq("companyId", args.id))
      .collect();

    return {
      ...company,
      contacts,
      contactCount: contacts.length,
    };
  },
});

export const companiesCreate = mutation({
  args: {
    name: v.string(),
    address: v.optional(v.string()),
    website: v.optional(v.string()),
    phone: v.optional(v.string()),
    instagram: v.optional(v.string()),
    facebook: v.optional(v.string()),
    youtube: v.optional(v.string()),
    twitter: v.optional(v.string()),
    linkedin: v.optional(v.string()),
    googleBusinessLink: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!args.name || args.name.trim() === "") {
      throw new Error("Company name is required.");
    }

    const now = Date.now();
    const companyId = await ctx.db.insert("companies", {
      name: args.name.trim(),
      address: args.address || undefined,
      website: args.website || undefined,
      phone: args.phone || undefined,
      instagram: args.instagram || undefined,
      facebook: args.facebook || undefined,
      youtube: args.youtube || undefined,
      twitter: args.twitter || undefined,
      linkedin: args.linkedin || undefined,
      googleBusinessLink: args.googleBusinessLink || undefined,
      tags: args.tags || [],
      notes: args.notes || undefined,
      createdAt: now,
      updatedAt: now,
    });

    return companyId;
  },
});

export const companiesUpdate = mutation({
  args: {
    id: v.id("companies"),
    name: v.optional(v.string()),
    address: v.optional(v.string()),
    website: v.optional(v.string()),
    phone: v.optional(v.string()),
    instagram: v.optional(v.string()),
    facebook: v.optional(v.string()),
    youtube: v.optional(v.string()),
    twitter: v.optional(v.string()),
    linkedin: v.optional(v.string()),
    googleBusinessLink: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const company = await ctx.db.get(args.id);
    if (!company) {
      throw new Error("Company not found");
    }

    const update: any = { updatedAt: Date.now() };

    if (args.name !== undefined) update.name = args.name.trim();
    if (args.address !== undefined) update.address = args.address;
    if (args.website !== undefined) update.website = args.website;
    if (args.phone !== undefined) update.phone = args.phone;
    if (args.instagram !== undefined) update.instagram = args.instagram;
    if (args.facebook !== undefined) update.facebook = args.facebook;
    if (args.youtube !== undefined) update.youtube = args.youtube;
    if (args.twitter !== undefined) update.twitter = args.twitter;
    if (args.linkedin !== undefined) update.linkedin = args.linkedin;
    if (args.googleBusinessLink !== undefined) update.googleBusinessLink = args.googleBusinessLink;
    if (args.tags !== undefined) update.tags = args.tags;
    if (args.notes !== undefined) update.notes = args.notes;

    await ctx.db.patch(args.id, update);

    return args.id;
  },
});

export const companiesRemove = mutation({
  args: { id: v.id("companies") },
  handler: async (ctx, args) => {
    const company = await ctx.db.get(args.id);
    if (!company) {
      throw new Error("Company not found");
    }

    // Remove companyId from all contacts linked to this company
    const contacts = await ctx.db
      .query("contacts")
      .withIndex("by_company", (q: any) => q.eq("companyId", args.id))
      .collect();

    for (const contact of contacts) {
      await ctx.db.patch(contact._id, {
        companyId: undefined,
        updatedAt: Date.now(),
      });
    }

    // Delete the company
    await ctx.db.delete(args.id);
  },
});

