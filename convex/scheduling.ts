import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { requireAdmin } from "./auth";
import { requireAdminWithSession } from "./adminAuth";

function generateToken(): string {
  // Simple random token, adequate for invite links
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}

// List scheduling requests (admin)
export const listRequests = query({
  args: { email: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (args.email) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_email", (q: any) => q.eq("email", args.email))
        .first();
      if (!user || user.role !== "admin") throw new Error("Unauthorized - admin access required");
    } else {
      // If no email provided, try session auth, but don't fail if not authenticated
      try {
        await requireAdmin(ctx);
      } catch (error) {
        // If session auth fails, return empty array instead of throwing
        return [];
      }
    }

    return await ctx.db
      .query("schedulingRequests")
      .withIndex("by_created_at")
      .order("desc")
      .collect();
  },
});

// Get a scheduling request with slots & invites (admin)
export const getRequest = query({
  args: { id: v.id("schedulingRequests"), email: v.optional(v.string()), sessionToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    // Try session-based auth first if sessionToken is provided
    if (args.sessionToken) {
      await requireAdminWithSession(ctx, args.sessionToken);
    } else if (args.email) {
      // Fallback to email-based check
      const user = await ctx.db
        .query("users")
        .withIndex("by_email", (q: any) => q.eq("email", args.email))
        .first();
      if (!user || user.role !== "admin") throw new Error("Unauthorized - admin access required");
    } else {
      // Last resort: try Convex auth
      await requireAdmin(ctx);
    }

    const request = await ctx.db.get(args.id);
    if (!request) throw new Error("Scheduling request not found");

    const slots = await ctx.db
      .query("schedulingSlots")
      .withIndex("by_request", (q) => q.eq("requestId", args.id))
      .order("asc")
      .collect();

    const invites = await ctx.db
      .query("schedulingInvites")
      .withIndex("by_request", (q) => q.eq("requestId", args.id))
      .collect();

    return { request, slots, invites };
  },
});

// Create a scheduling request with candidate slots (admin)
export const createRequest = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    organizerEmail: v.string(),
    recipientEmails: v.array(v.string()),
    timezone: v.optional(v.string()),
    durationMinutes: v.number(),
    maxSelectionsPerPerson: v.optional(v.number()),
    windowStart: v.optional(v.number()),
    windowEnd: v.optional(v.number()),
    // Candidate slots to propose
    slots: v.array(v.object({ start: v.number(), end: v.number() })),
    // Branding selections
    brandingPreset: v.optional(
      v.union(
        v.literal("ian"),
        v.literal("voding"),
        v.literal("styledriven")
      )
    ),
    brandingOverrides: v.optional(
      v.object({
        primary: v.optional(v.string()),
        accent: v.optional(v.string()),
        text: v.optional(v.string()),
        logoUrl: v.optional(v.string()),
      })
    ),
    email: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { email, slots, ...requestData } = args;

    if (email) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_email", (q: any) => q.eq("email", email))
        .first();
      if (!user || user.role !== "admin") throw new Error("Unauthorized - admin access required");
    } else {
      await requireAdmin(ctx);
    }

    const now = Date.now();
    const requestId = await ctx.db.insert("schedulingRequests", {
      ...requestData,
      status: "open",
      createdAt: now,
      updatedAt: now,
    });

    // Insert slots as available
    for (const s of slots) {
      await ctx.db.insert("schedulingSlots", {
        requestId,
        start: s.start,
        end: s.end,
        status: "available",
        createdAt: now,
        updatedAt: now,
      });
    }

    // Create invites with tokens
    for (const recipientEmail of requestData.recipientEmails) {
      await ctx.db.insert("schedulingInvites", {
        requestId,
        recipientEmail,
        token: generateToken(),
        status: "pending",
        createdAt: now,
        updatedAt: now,
      });
    }

    return requestId;
  },
});

// Regenerate invite tokens (admin)
export const regenerateInviteTokens = mutation({
  args: { requestId: v.id("schedulingRequests"), email: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (args.email) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_email", (q: any) => q.eq("email", args.email))
        .first();
      if (!user || user.role !== "admin") throw new Error("Unauthorized - admin access required");
    } else {
      await requireAdmin(ctx);
    }

    const invites = await ctx.db
      .query("schedulingInvites")
      .withIndex("by_request", (q) => q.eq("requestId", args.requestId))
      .collect();

    for (const inv of invites) {
      await ctx.db.patch(inv._id, { token: generateToken(), updatedAt: Date.now() });
    }
    return true;
  },
});

// Create a shareable (public) invite without recipient email (admin)
export const createPublicInvite = mutation({
  args: { requestId: v.id("schedulingRequests"), email: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (args.email) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_email", (q: any) => q.eq("email", args.email))
        .first();
      if (!user || user.role !== "admin") throw new Error("Unauthorized - admin access required");
    } else {
      await requireAdmin(ctx);
    }

    const request = await ctx.db.get(args.requestId);
    if (!request) throw new Error("Scheduling request not found");

    // Check if a public invite already exists
    const existingInvites = await ctx.db
      .query("schedulingInvites")
      .withIndex("by_request", (q) => q.eq("requestId", args.requestId))
      .collect();
    
    const existingPublicInvite = existingInvites.find((inv: any) => !inv.recipientEmail);
    if (existingPublicInvite) {
      return { inviteId: existingPublicInvite._id, token: existingPublicInvite.token };
    }

    const now = Date.now();
    const token = generateToken();
    const inviteId = await ctx.db.insert("schedulingInvites", {
      requestId: args.requestId,
      recipientEmail: undefined,
      token,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    });
    return { inviteId, token };
  },
});

// Get public invite token for a request (admin)
export const getPublicInviteToken = query({
  args: { requestId: v.id("schedulingRequests"), email: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (args.email) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_email", (q: any) => q.eq("email", args.email))
        .first();
      if (!user || user.role !== "admin") throw new Error("Unauthorized - admin access required");
    } else {
      await requireAdmin(ctx);
    }

    const invites = await ctx.db
      .query("schedulingInvites")
      .withIndex("by_request", (q) => q.eq("requestId", args.requestId))
      .collect();
    
    const publicInvite = invites.find((inv: any) => !inv.recipientEmail);
    return publicInvite ? publicInvite.token : null;
  },
});

// Get pages using a booking token (admin)
export const getPagesUsingToken = query({
  args: { token: v.string(), email: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (args.email) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_email", (q: any) => q.eq("email", args.email))
        .first();
      if (!user || user.role !== "admin") throw new Error("Unauthorized - admin access required");
    } else {
      await requireAdmin(ctx);
    }

    const pages: Array<{ type: string; id: string; title: string; slug?: string }> = [];

    // Check landing pages
    const landingPages = await ctx.db
      .query("landingPages")
      .collect();
    for (const page of landingPages) {
      if (page.bookingToken === args.token) {
        pages.push({
          type: "landing-page",
          id: page._id,
          title: page.title,
          slug: page.slug,
        });
      }
    }

    // Check graphic designer
    const graphicDesigner = await ctx.db
      .query("graphicDesigner")
      .first();
    if (graphicDesigner?.bookingToken === args.token) {
      pages.push({
        type: "graphic-designer",
        id: graphicDesigner._id,
        title: "Graphic Designer",
      });
    }

    // Check portraits
    const portraits = await ctx.db
      .query("portraits")
      .first();
    if (portraits?.bookingToken === args.token) {
      pages.push({
        type: "portraits",
        id: portraits._id,
        title: "Portraits",
      });
    }

    // Check design
    const design = await ctx.db
      .query("design")
      .first();
    if (design?.bookingToken === args.token) {
      pages.push({
        type: "design",
        id: design._id,
        title: "Design",
      });
    }

    return pages;
  },
});

// Public: get invite by token
export const getInviteByToken = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const invite = await ctx.db
      .query("schedulingInvites")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();
    if (!invite) return null;

    const request = await ctx.db.get(invite.requestId);
    if (!request || request.status !== "open") return null;

    return { invite, request };
  },
});

// Public: list available slots for an invite (filters out slots that conflict with any booked slot)
export const listAvailableSlots = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const invite = await ctx.db
      .query("schedulingInvites")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();
    if (!invite) return [];

    const allSlots = await ctx.db
      .query("schedulingSlots")
      .withIndex("by_request", (q) => q.eq("requestId", invite.requestId))
      .collect();

    // Determine booked intervals
    const booked = allSlots.filter((s) => s.status === "booked");

    const isOverlapping = (aStart: number, aEnd: number, bStart: number, bEnd: number) =>
      aStart < bEnd && aEnd > bStart;

    // Available slots are those marked available and not overlapping any booked slot
    const available = allSlots.filter((s) => {
      if (s.status !== "available") return false;
      for (const b of booked) {
        if (isOverlapping(s.start, s.end, b.start, b.end)) return false;
      }
      return true;
    });

    // Also include slots booked by this invite (for max selections > 1)
    const bookedByThisInvite = allSlots.filter((s) => 
      s.status === "booked" && s.bookedByInviteId === invite._id
    );

    // Combine available and booked by this invite, sort by start time
    const result = [...available, ...bookedByThisInvite];
    return result.sort((a, b) => a.start - b.start);
  },
});

// Public: select a slot (first-come-first-served, no overlap)
export const selectSlot = mutation({
  args: { 
    token: v.string(), 
    slotId: v.id("schedulingSlots"),
    bookingName: v.optional(v.string()),
    bookingEmail: v.optional(v.string()),
    bookingPhone: v.optional(v.string()),
    bookingNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const invite = await ctx.db
      .query("schedulingInvites")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();
    if (!invite) throw new Error("Invalid invite");

    const slot = await ctx.db.get(args.slotId);
    if (!slot) throw new Error("Slot not found");
    if (slot.requestId !== invite.requestId) throw new Error("Slot does not belong to this request");

    const request = await ctx.db.get(invite.requestId);
    if (!request || request.status !== "open") throw new Error("Request is not open");

    // Check max selections limit
    const maxSelections = request.maxSelectionsPerPerson ?? 1;
    const allInvitesForRequest = await ctx.db
      .query("schedulingInvites")
      .withIndex("by_request", (q) => q.eq("requestId", invite.requestId))
      .collect();
    
    // Count how many slots this invite has already booked
    const bookedSlotsForInvite = await ctx.db
      .query("schedulingSlots")
      .withIndex("by_request", (q) => q.eq("requestId", invite.requestId))
      .collect()
      .then(slots => slots.filter(s => s.bookedByInviteId === invite._id));
    
    if (bookedSlotsForInvite.length >= maxSelections) {
      throw new Error(`Maximum ${maxSelections} slot${maxSelections !== 1 ? 's' : ''} per person. You have already selected ${bookedSlotsForInvite.length}.`);
    }

    // For backward compatibility: if maxSelections is 1, ensure they haven't selected already
    if (maxSelections === 1 && invite.selectedSlotId) {
      throw new Error("You have already selected a time");
    }

    // Ensure slot is currently available
    if (slot.status !== "available") throw new Error("Slot is not available");

    // Check for overlap with any already booked slot for this request
    const slotsForRequest = await ctx.db
      .query("schedulingSlots")
      .withIndex("by_request", (q) => q.eq("requestId", slot.requestId))
      .collect();

    const isOverlapping = (aStart: number, aEnd: number, bStart: number, bEnd: number) =>
      aStart < bEnd && aEnd > bStart;

    for (const s of slotsForRequest) {
      if (s.status === "booked" && isOverlapping(slot.start, slot.end, s.start, s.end)) {
        throw new Error("Another participant already booked an overlapping time");
      }
    }

    const now = Date.now();

    // Book the slot and mark invite as responded
    await ctx.db.patch(slot._id, {
      status: "booked",
      bookedByInviteId: invite._id,
      updatedAt: now,
    });

    await ctx.db.patch(invite._id, {
      status: "responded",
      selectedSlotId: slot._id,
      respondedAt: now,
      bookingName: args.bookingName,
      bookingEmail: args.bookingEmail,
      bookingPhone: args.bookingPhone,
      bookingNotes: args.bookingNotes,
      updatedAt: now,
    });

    // Auto-add to email marketing if enabled and email provided
    if (args.bookingEmail) {
      const autoAddSetting = await ctx.db
        .query("settings")
        .withIndex("by_key", (q: any) => q.eq("key", "autoAddBookingContacts"))
        .first();

      if (autoAddSetting?.value === true) {
        // Check if contact exists
        const existingContact = await ctx.db
          .query("emailContacts")
          .withIndex("by_email", (q: any) => q.eq("email", args.bookingEmail!))
          .first();
        
        if (!existingContact) {
          // Parse name into first/last
          const nameParts = args.bookingName?.split(" ") || [];
          const firstName = nameParts[0] || "";
          const lastName = nameParts.slice(1).join(" ") || undefined;
          
          await ctx.db.insert("emailContacts", {
            email: args.bookingEmail,
            firstName: firstName || undefined,
            lastName: lastName,
            tags: ["booking", `scheduler-${invite.requestId}`],
            status: "subscribed",
            source: "booking",
            metadata: {
              bookingRequestId: invite.requestId,
              firstBookingDate: slot.start,
            },
            createdAt: now,
            updatedAt: now,
          });
        } else {
          // Update existing contact with booking tag if not present
          const tags = existingContact.tags || [];
          const hasBookingTag = tags.includes("booking");
          const hasSchedulerTag = tags.includes(`scheduler-${invite.requestId}`);
          
          if (!hasBookingTag || !hasSchedulerTag) {
            const updatedTags = [...tags];
            if (!hasBookingTag) {
              updatedTags.push("booking");
            }
            if (!hasSchedulerTag) {
              updatedTags.push(`scheduler-${invite.requestId}`);
            }
            
            await ctx.db.patch(existingContact._id, {
              tags: updatedTags,
              updatedAt: now,
            });
          }
        }
      }

      // Check for booking trigger campaigns
      const bookingCreatedTrigger = await ctx.db
        .query("settings")
        .withIndex("by_key", (q: any) => q.eq("key", "bookingCreatedTrigger"))
        .first();

      if (bookingCreatedTrigger?.value && args.bookingEmail) {
        const campaignId = bookingCreatedTrigger.value as any;
        const campaign = await ctx.db.get(campaignId);
        
        if (campaign && campaign.status !== "cancelled") {
          // Find or create contact
          let contact = await ctx.db
            .query("emailContacts")
            .withIndex("by_email", (q: any) => q.eq("email", args.bookingEmail))
            .first();

          if (!contact) {
            // Create contact if doesn't exist
            const nameParts = args.bookingName?.split(" ") || [];
            const firstName = nameParts[0] || "";
            const lastName = nameParts.slice(1).join(" ") || undefined;
            
            const contactId = await ctx.db.insert("emailContacts", {
              email: args.bookingEmail,
              firstName: firstName || undefined,
              lastName: lastName,
              tags: ["booking", `scheduler-${invite.requestId}`],
              status: "subscribed",
              source: "booking",
              metadata: {
                bookingRequestId: invite.requestId,
                firstBookingDate: slot.start,
              },
              createdAt: now,
              updatedAt: now,
            });
            contact = await ctx.db.get(contactId);
          }

          if (contact && contact.status === "subscribed") {
            // Send campaign to this contact (non-blocking)
            await ctx.scheduler.runAfter(0, internal.emailMarketing.sendTriggerCampaign, {
              campaignId,
              contactId: contact._id,
            });
          }
        }
      }

      // Check for active journeys with booking_created trigger
      if (args.bookingEmail && contact) {
        const activeJourneys = await ctx.db
          .query("emailJourneys")
          .withIndex("by_status", (q: any) => q.eq("status", "active"))
          .collect();
        
        const bookingCreatedJourneys = activeJourneys.filter(
          (j: any) => j.entryTrigger === "booking_created"
        );
        
        // Enroll contact in matching journeys
        for (const journey of bookingCreatedJourneys) {
          await ctx.scheduler.runAfter(0, internal.emailMarketing.enrollOnTriggerInternal, {
            journeyId: journey._id,
            contactId: contact._id,
            triggerData: {
              bookingRequestId: invite.requestId,
              slotStart: slot.start,
              slotEnd: slot.end,
            },
          });
        }
      }

      // Send confirmation email if enabled
      const confirmationSetting = await ctx.db
        .query("settings")
        .withIndex("by_key", (q: any) => q.eq("key", "bookingConfirmationEmail"))
        .first();

      if (confirmationSetting?.value === true && args.bookingName) {
        // Schedule email to be sent (non-blocking)
        // Use runAfter with 0 delay to send immediately but non-blocking
        await ctx.scheduler.runAfter(0, internal.emailMarketing.sendBookingConfirmationEmail, {
          bookingEmail: args.bookingEmail,
          bookingName: args.bookingName,
          slotStart: slot.start,
          slotEnd: slot.end,
          requestTitle: request.title,
          requestDescription: request.description || undefined,
        });
      }

      // Schedule reminder email if enabled
      const reminderSetting = await ctx.db
        .query("settings")
        .withIndex("by_key", (q: any) => q.eq("key", "bookingReminderEmail"))
        .first();

      const reminderHoursSetting = await ctx.db
        .query("settings")
        .withIndex("by_key", (q: any) => q.eq("key", "bookingReminderHours"))
        .first();

      if (reminderSetting?.value === true && args.bookingName && args.bookingEmail) {
        const reminderHours = (reminderHoursSetting?.value as number) || 24;
        const reminderTime = slot.start - (reminderHours * 60 * 60 * 1000); // Convert hours to milliseconds
        const now = Date.now();
        
        // Only schedule if reminder time is in the future
        if (reminderTime > now) {
          await ctx.scheduler.runAt(
            reminderTime,
            internal.emailMarketing.sendBookingReminderEmail,
            {
              bookingEmail: args.bookingEmail,
              bookingName: args.bookingName,
              slotStart: slot.start,
              slotEnd: slot.end,
              requestTitle: request.title,
            }
          );
        }
      }
    }

    return { success: true };
  },
});

// Get all bookings across all schedulers (admin)
export const getAllBookings = query({
  args: { email: v.optional(v.string()), sessionToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    // Try session-based auth first if sessionToken is provided
    if (args.sessionToken) {
      await requireAdminWithSession(ctx, args.sessionToken);
    } else if (args.email) {
      // Fallback to email-based check
      const user = await ctx.db
        .query("users")
        .withIndex("by_email", (q: any) => q.eq("email", args.email))
        .first();
      if (!user || user.role !== "admin") throw new Error("Unauthorized - admin access required");
    } else {
      // Last resort: try Convex auth
      await requireAdmin(ctx);
    }
    
    // Get all invites with booking information
    const allInvites = await ctx.db
      .query("schedulingInvites")
      .collect();
    
    const bookings = [];
    
    for (const invite of allInvites) {
      if (!invite.selectedSlotId || !invite.bookingEmail) continue;
      
      const slot = await ctx.db.get(invite.selectedSlotId);
      if (!slot) continue;
      
      const request = await ctx.db.get(invite.requestId);
      if (!request) continue;
      
      bookings.push({
        inviteId: invite._id,
        slotId: slot._id,
        requestId: request._id,
        bookingName: invite.bookingName,
        bookingEmail: invite.bookingEmail,
        bookingPhone: invite.bookingPhone,
        bookingNotes: invite.bookingNotes,
        slotStart: slot.start,
        slotEnd: slot.end,
        requestTitle: request.title,
        requestDescription: request.description,
        respondedAt: invite.respondedAt,
      });
    }
    
    return bookings;
  },
});

// Close a request (admin)
export const closeRequest = mutation({
  args: { id: v.id("schedulingRequests"), email: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (args.email) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_email", (q: any) => q.eq("email", args.email))
        .first();
      if (!user || user.role !== "admin") throw new Error("Unauthorized - admin access required");
    } else {
      await requireAdmin(ctx);
    }

    await ctx.db.patch(args.id, { status: "closed", updatedAt: Date.now() });
    return true;
  },
});

// Update a scheduling request (admin)
export const updateRequest = mutation({
  args: {
    id: v.id("schedulingRequests"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    organizerEmail: v.optional(v.string()),
    recipientEmails: v.optional(v.array(v.string())),
    timezone: v.optional(v.string()),
    durationMinutes: v.optional(v.number()),
    maxSelectionsPerPerson: v.optional(v.number()),
    windowStart: v.optional(v.number()),
    windowEnd: v.optional(v.number()),
    brandingPreset: v.optional(
      v.union(
        v.literal("ian"),
        v.literal("voding"),
        v.literal("styledriven")
      )
    ),
    brandingOverrides: v.optional(
      v.object({
        primary: v.optional(v.string()),
        accent: v.optional(v.string()),
        text: v.optional(v.string()),
        logoUrl: v.optional(v.string()),
      })
    ),
    email: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, email, ...updates } = args;
    if (email) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_email", (q: any) => q.eq("email", email))
        .first();
      if (!user || user.role !== "admin") throw new Error("Unauthorized - admin access required");
    } else {
      await requireAdmin(ctx);
    }

    const request = await ctx.db.get(id);
    if (!request) throw new Error("Scheduling request not found");

    await ctx.db.patch(id, { ...updates, updatedAt: Date.now() });
    return id;
  },
});

// Delete a scheduling request and cascade delete slots/invites (admin)
export const removeRequest = mutation({
  args: { id: v.id("schedulingRequests"), email: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (args.email) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_email", (q: any) => q.eq("email", args.email))
        .first();
      if (!user || user.role !== "admin") throw new Error("Unauthorized - admin access required");
    } else {
      await requireAdmin(ctx);
    }

    const req = await ctx.db.get(args.id);
    if (!req) return true;

    const slots = await ctx.db
      .query("schedulingSlots")
      .withIndex("by_request", (q) => q.eq("requestId", args.id))
      .collect();
    for (const s of slots) await ctx.db.delete(s._id);

    const invites = await ctx.db
      .query("schedulingInvites")
      .withIndex("by_request", (q) => q.eq("requestId", args.id))
      .collect();
    for (const i of invites) await ctx.db.delete(i._id);

    await ctx.db.delete(args.id);
    return true;
  },
});

// Update a slot (admin)
export const updateSlot = mutation({
  args: {
    id: v.id("schedulingSlots"),
    start: v.optional(v.number()),
    end: v.optional(v.number()),
    email: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, email, ...updates } = args;
    if (email) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_email", (q: any) => q.eq("email", email))
        .first();
      if (!user || user.role !== "admin") throw new Error("Unauthorized - admin access required");
    } else {
      await requireAdmin(ctx);
    }

    const slot = await ctx.db.get(id);
    if (!slot) throw new Error("Slot not found");

    // Don't allow editing booked slots (admin should cancel booking first)
    if (slot.status === "booked" && (updates.start !== undefined || updates.end !== undefined)) {
      throw new Error("Cannot edit time of a booked slot. Cancel the booking first.");
    }

    await ctx.db.patch(id, { ...updates, updatedAt: Date.now() });
    return true;
  },
});

// Delete a slot (admin)
export const removeSlot = mutation({
  args: { id: v.id("schedulingSlots"), email: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (args.email) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_email", (q: any) => q.eq("email", args.email))
        .first();
      if (!user || user.role !== "admin") throw new Error("Unauthorized - admin access required");
    } else {
      await requireAdmin(ctx);
    }

    const slot = await ctx.db.get(args.id);
    if (!slot) return true;

    // If slot is booked, also clear the invite's selectedSlotId
    if (slot.status === "booked" && slot.bookedByInviteId) {
      await ctx.db.patch(slot.bookedByInviteId, {
        selectedSlotId: undefined,
        status: "pending",
        updatedAt: Date.now(),
      });
    }

    await ctx.db.delete(args.id);
    return true;
  },
});

// Cancel a booking (admin) - makes a booked slot available again
export const cancelBooking = mutation({
  args: { slotId: v.id("schedulingSlots"), email: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (args.email) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_email", (q: any) => q.eq("email", args.email))
        .first();
      if (!user || user.role !== "admin") throw new Error("Unauthorized - admin access required");
    } else {
      await requireAdmin(ctx);
    }

    const slot = await ctx.db.get(args.slotId);
    if (!slot) throw new Error("Slot not found");
    if (slot.status !== "booked") throw new Error("Slot is not booked");

    const inviteId = slot.bookedByInviteId;
    if (inviteId) {
      await ctx.db.patch(inviteId, {
        selectedSlotId: undefined,
        status: "pending",
        updatedAt: Date.now(),
      });
    }

    await ctx.db.patch(args.slotId, {
      status: "available",
      bookedByInviteId: undefined,
      updatedAt: Date.now(),
    });

    return true;
  },
});

// Create a new slot (admin)
export const createSlot = mutation({
  args: {
    requestId: v.id("schedulingRequests"),
    start: v.number(),
    end: v.number(),
    email: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { requestId, start, end, email } = args;
    if (email) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_email", (q: any) => q.eq("email", email))
        .first();
      if (!user || user.role !== "admin") throw new Error("Unauthorized - admin access required");
    } else {
      await requireAdmin(ctx);
    }

    const request = await ctx.db.get(requestId);
    if (!request) throw new Error("Scheduling request not found");

    if (end <= start) throw new Error("End time must be after start time");

    const now = Date.now();
    await ctx.db.insert("schedulingSlots", {
      requestId,
      start,
      end,
      status: "available",
      createdAt: now,
      updatedAt: now,
    });

    return true;
  },
});


