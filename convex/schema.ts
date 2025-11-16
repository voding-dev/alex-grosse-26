import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    name: v.string(),
    email: v.string(),
    role: v.union(v.literal("admin"), v.literal("client")),
    authMethod: v.optional(v.union(v.literal("passkey"), v.literal("email"))),
    createdAt: v.number(),
  })
    .index("by_email", ["email"])
    .index("by_role", ["role"]),

  adminAuth: defineTable({
    passwordHash: v.string(), // bcrypt hash of admin password
    primaryEmail: v.string(), // Email for password resets (configured via settings or environment)
    allowedEmails: v.array(v.string()), // Array of allowed emails
    createdAt: v.number(),
    updatedAt: v.number(),
  }),
  
  adminSessions: defineTable({
    token: v.string(), // Session token
    email: v.string(), // Email used for this session
    expiresAt: v.number(), // Expiration timestamp
    createdAt: v.number(),
  })
    .index("by_token", ["token"])
    .index("by_email", ["email"]),

  projects: defineTable({
    title: v.string(),
    slug: v.string(),
    clientName: v.optional(v.string()),
    categories: v.array(v.union(v.literal("photo"), v.literal("video"), v.literal("design"), v.literal("mixed"))),
    status: v.union(
      v.literal("draft"),
      v.literal("review"),
      v.literal("approved"),
      v.literal("delivered"),
      v.literal("archived")
    ),
    coverAssetId: v.optional(v.id("assets")),
    notesPublic: v.optional(v.string()),
    notesPrivate: v.optional(v.string()),
    sortOrder: v.optional(v.number()), // Order for homepage display
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_status", ["status"])
    .index("by_category", ["categories"])
    .index("by_sort_order", ["sortOrder"]),

  assets: defineTable({
    projectId: v.optional(v.id("projects")),
    portfolioId: v.optional(v.id("portfolio")), // Portfolio assets - separate from projects
    deliveryId: v.optional(v.id("deliveries")), // Delivery assets - separate from projects
    uploadType: v.optional(v.union(v.literal("portfolio"), v.literal("project"), v.literal("delivery"))), // Separates portfolio uploads, project uploads, and delivery uploads
    type: v.union(v.literal("image"), v.literal("video"), v.literal("pdf"), v.literal("other")),
    filename: v.string(),
    storageKey: v.string(), // Convex storage ID for original
    previewKey: v.optional(v.string()), // Convex storage ID for preview (with watermark optionally)
    videoUrl: v.optional(v.string()), // YouTube/Vimeo URL for embedded videos
    width: v.optional(v.number()),
    height: v.optional(v.number()),
    duration: v.optional(v.number()), // for video
    size: v.number(), // bytes
    approved: v.boolean(),
    sortOrder: v.number(),
    createdAt: v.number(),
  })
    .index("by_project", ["projectId"])
    .index("by_approved", ["approved"])
    .index("by_portfolio", ["portfolioId"])
    .index("by_delivery", ["deliveryId"])
    .index("by_upload_type", ["uploadType"])
    .index("by_project_and_upload_type", ["projectId", "uploadType"])
    .index("by_delivery_and_upload_type", ["deliveryId", "uploadType"]),

  deliveries: defineTable({
    title: v.string(),
    clientName: v.string(),
    slug: v.string(),
    pinHash: v.optional(v.string()), // bcrypt hash; optional when portal has no PIN
    pinPlaintext: v.optional(v.string()), // Plaintext PIN for admin viewing
    expiresAt: v.optional(v.number()), // Auto-expiration date (free storage expires)
    originalDeliveryDate: v.number(), // When delivery was first created
    watermark: v.boolean(),
    allowZip: v.boolean(),
    allowedAssetIds: v.optional(v.array(v.id("assets"))),
    notesPublic: v.optional(v.string()), // Public notes for delivery
    // Storage subscription (client pays monthly to extend storage)
    storageSubscriptionId: v.optional(v.string()), // Stripe subscription ID
    storageSubscriptionStatus: v.optional(v.union(
      v.literal("active"),
      v.literal("canceled"),
      v.literal("past_due"),
      v.literal("unpaid")
    )),
    storageSubscriptionExpiresAt: v.optional(v.number()), // When paid storage expires
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_expires_at", ["expiresAt"]),

  feedback: defineTable({
    deliveryId: v.id("deliveries"),
    assetId: v.optional(v.id("assets")),
    author: v.literal("client"),
    body: v.string(),
    decision: v.optional(v.union(v.literal("approve"), v.literal("changes"), v.literal("reject"))),
    completedAt: v.optional(v.number()), // When feedback was marked as complete
    archived: v.optional(v.boolean()), // Whether feedback is archived
    projectId: v.optional(v.id("clientProjects")), // Link to project if available
    contactId: v.optional(v.id("contacts")), // Link to contact
    createdAt: v.number(),
  })
    .index("by_delivery", ["deliveryId"])
    .index("by_asset", ["assetId"])
    .index("by_archived", ["archived"])
    .index("by_project", ["projectId"])
    .index("by_contact", ["contactId"]),

  events: defineTable({
    deliveryId: v.id("deliveries"),
    type: v.union(
      v.literal("view"),
      v.literal("download"),
      v.literal("zip"),
      v.literal("feedback"),
      v.literal("pin_attempt")
    ),
    meta: v.optional(v.any()),
    createdAt: v.number(),
  })
    .index("by_delivery", ["deliveryId"])
    .index("by_type", ["type"]),

  settings: defineTable({
    key: v.string(),
    value: v.any(),
    updatedAt: v.number(),
  })
    .index("by_key", ["key"]),

  qr_codes: defineTable({
    label: v.string(),
    type: v.union(v.literal("static"), v.literal("dynamic")),
    content: v.optional(v.string()), // For static QR codes
    destination_url: v.optional(v.string()), // For dynamic QR codes
    svg_data: v.string(), // The actual SVG markup
    scan_count: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_type", ["type"])
    .index("by_created_at", ["createdAt"]),

  qr_url_history: defineTable({
    qr_code_id: v.id("qr_codes"),
    old_url: v.optional(v.string()), // Previous URL (null on first)
    new_url: v.string(), // New URL
    changed_at: v.number(),
  })
    .index("by_qr_code_id", ["qr_code_id"])
    .index("by_changed_at", ["changed_at"]),

  qr_scans: defineTable({
    qr_code_id: v.id("qr_codes"),
    scanned_at: v.number(),
    user_agent: v.optional(v.string()), // Browser/device info
    ip_address: v.optional(v.string()), // Scanner's IP (optional)
    referer: v.optional(v.string()), // Where scan came from
    country: v.optional(v.string()), // Geo data
    city: v.optional(v.string()), // Geo data
    device_type: v.optional(v.string()), // Mobile/Tablet/Desktop
  })
    .index("by_qr_code_id", ["qr_code_id"])
    .index("by_scanned_at", ["scanned_at"]),

  about: defineTable({
    heading: v.optional(v.string()), // Section heading (replaces SVG)
    imageStorageId: v.optional(v.string()), // Storage ID for about image
    bio: v.optional(v.string()), // Main bio text
    awards: v.array(v.string()), // Array of award strings
    awardsHeading: v.optional(v.string()), // Heading for awards section
    littleBits: v.optional(v.string()), // Additional info text
    littleBitsHeading: v.optional(v.string()), // Heading for little bits section
    clientList: v.array(v.string()), // Array of client names
    clientListHeading: v.optional(v.string()), // Heading for client list section
    contactHeading: v.optional(v.string()), // Heading for contact info in about section
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    instagramUrl: v.optional(v.string()),
    linkedinUrl: v.optional(v.string()),
    updatedAt: v.number(),
  })
    .index("by_updated", ["updatedAt"]),

  homepage: defineTable({
    heroText: v.optional(v.string()), // Text displayed under name SVG in hero section
    contactHeading: v.optional(v.string()), // Heading for contact section content area
    contactText: v.optional(v.string()), // Text for contact section
    contactEmail: v.optional(v.string()), // Email for contact section display
    contactPhone: v.optional(v.string()), // Phone for contact section display
    contactInstagramUrl: v.optional(v.string()),
    contactLinkedinUrl: v.optional(v.string()),
    formHeading: v.optional(v.string()), // Heading for contact form
    portfolioProjectIds: v.optional(v.array(v.id("projects"))), // Selected portfolio project IDs for homepage
    projectsProjectIds: v.optional(v.array(v.id("projects"))), // Selected project IDs for projects section
    updatedAt: v.number(),
  })
    .index("by_updated", ["updatedAt"]),

  heroCarousel: defineTable({
    imageStorageId: v.string(), // Storage ID for hero carousel image
    sortOrder: v.number(), // Order in carousel
    alt: v.optional(v.string()), // Alt text for image
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_sort_order", ["sortOrder"]),

  portraits: defineTable({
    heroText: v.optional(v.string()), // Text displayed under name SVG in hero section
    bookingToken: v.optional(v.string()), // Token for public booking invite
    stripeUrl: v.optional(v.string()), // Stripe payment link for portraits
    calUrl: v.optional(v.string()), // TEMPORARY: Legacy field from cal.com integration - will be removed after cleanup
    howItWorksTitle: v.optional(v.string()), // Title for "How It Works" section
    howItWorksSteps: v.optional(v.array(v.object({
      title: v.string(),
      description: v.string(),
    }))), // Array of steps with title and description
    services: v.optional(v.array(v.object({
      title: v.string(),
      description: v.string(),
    }))), // Array of services with title and description
    updatedAt: v.number(),
  })
    .index("by_updated", ["updatedAt"]),

  portraitsHeroCarousel: defineTable({
    imageStorageId: v.string(), // Storage ID for hero carousel image
    sortOrder: v.number(), // Order in carousel
    alt: v.optional(v.string()), // Alt text for image
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_sort_order", ["sortOrder"]),

  portraitsGallery: defineTable({
    imageStorageId: v.string(), // Storage ID for gallery image
    sortOrder: v.number(), // Order in gallery
    alt: v.optional(v.string()), // Alt text for image
    width: v.optional(v.number()),
    height: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_sort_order", ["sortOrder"]),

  design: defineTable({
    heroText: v.optional(v.string()), // Text displayed under name SVG in hero section
    bookingToken: v.optional(v.string()), // Token for public booking invite
    stripeUrl: v.optional(v.string()), // Stripe payment link for design
    calUrl: v.optional(v.string()), // TEMPORARY: Legacy field from cal.com integration - will be removed after cleanup
    howItWorksTitle: v.optional(v.string()), // Title for "How It Works" section
    howItWorksSteps: v.optional(v.array(v.object({
      title: v.string(),
      description: v.string(),
    }))), // Array of steps with title and description
    services: v.optional(v.array(v.object({
      title: v.string(),
      description: v.string(),
    }))), // Array of services with title and description
    updatedAt: v.number(),
  })
    .index("by_updated", ["updatedAt"]),

  designHeroCarousel: defineTable({
    imageStorageId: v.string(), // Storage ID for hero carousel image
    sortOrder: v.number(), // Order in carousel
    alt: v.optional(v.string()), // Alt text for image
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_sort_order", ["sortOrder"]),

  designGallery: defineTable({
    imageStorageId: v.string(), // Storage ID for gallery image
    sortOrder: v.number(), // Order in gallery
    alt: v.optional(v.string()), // Alt text for image
    width: v.optional(v.number()),
    height: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_sort_order", ["sortOrder"]),

  graphicDesignerHeroCarousel: defineTable({
    imageStorageId: v.string(), // Storage ID for hero carousel image
    sortOrder: v.number(), // Order in carousel
    alt: v.optional(v.string()), // Alt text for image
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_sort_order", ["sortOrder"]),

  graphicDesignerWindowGallery: defineTable({
    imageStorageId: v.string(), // Storage ID for gallery image
    sortOrder: v.number(), // Order in gallery
    alt: v.optional(v.string()), // Alt text for image
    width: v.optional(v.number()),
    height: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_sort_order", ["sortOrder"]),

  graphicDesignerBrandGallery: defineTable({
    imageStorageId: v.string(), // Storage ID for gallery image
    sortOrder: v.number(), // Order in gallery
    alt: v.optional(v.string()), // Alt text for image
    width: v.optional(v.number()),
    height: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_sort_order", ["sortOrder"]),

  graphicDesignerGraphicGallery: defineTable({
    imageStorageId: v.string(), // Storage ID for gallery image
    sortOrder: v.number(), // Order in gallery
    alt: v.optional(v.string()), // Alt text for image
    width: v.optional(v.number()),
    height: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_sort_order", ["sortOrder"]),

  graphicDesigner: defineTable({
    heroTitle: v.optional(v.string()), // Main hero title (e.g., "DESIGN THAT STOPS TRAFFIC")
    heroSubtitle: v.optional(v.string()), // Hero subtitle (e.g., "GRAPHIC DESIGN SERVICES")
    heroText: v.optional(v.string()), // Text displayed in hero section
    contactEmail: v.optional(v.string()), // Contact email
    contactPhone: v.optional(v.string()), // Contact phone
    bookingToken: v.optional(v.string()), // Token for public booking invite
    stripeUrl: v.optional(v.string()), // Stripe payment link
    calUrl: v.optional(v.string()), // TEMPORARY: Legacy field from cal.com integration - will be removed after cleanup
    // Value Proposition Section (sub-footer)
    valuePropositionTitle: v.optional(v.string()), // Title for value proposition section
    valuePropositionDescription: v.optional(v.string()), // Description paragraph for value proposition section
    valuePropositionFeatures: v.optional(v.array(v.object({
      title: v.string(),
      description: v.string(),
    }))), // Array of feature blocks (title + description)
    ctaTitle: v.optional(v.string()), // CTA title (e.g., "READY TO STAND OUT?")
    categories: v.optional(v.array(v.object({
      id: v.string(), // Unique category ID
      name: v.string(), // Category display name
      items: v.array(v.object({
        name: v.string(),
        description: v.string(),
        price: v.string(),
      })),
    }))),
    // Legacy support - keep for backward compatibility
    menuItems: v.optional(v.object({
      window: v.array(v.object({
        name: v.string(),
        description: v.string(),
        price: v.string(),
      })),
      brand: v.array(v.object({
        name: v.string(),
        description: v.string(),
        price: v.string(),
      })),
      graphic: v.array(v.object({
        name: v.string(),
        description: v.string(),
        price: v.string(),
      })),
    })),
    updatedAt: v.number(),
  })
    .index("by_updated", ["updatedAt"]),

  // Unified gallery table for graphic designer categories
  graphicDesignerCategoryGallery: defineTable({
    categoryId: v.string(), // Category ID this gallery belongs to
    imageStorageId: v.string(), // Storage ID for gallery image
    sortOrder: v.number(), // Order in gallery
    alt: v.optional(v.string()), // Alt text for image
    width: v.optional(v.number()),
    height: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_category", ["categoryId"]),

  // Scheduling (admin booking tool)
  schedulingRequests: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    organizerEmail: v.string(),
    recipientEmails: v.array(v.string()),
    timezone: v.optional(v.string()),
    durationMinutes: v.number(),
    maxSelectionsPerPerson: v.optional(v.number()), // How many slots each person can book
    windowStart: v.optional(v.number()),
    windowEnd: v.optional(v.number()),
    status: v.union(v.literal("open"), v.literal("closed")),
    contactId: v.optional(v.id("contacts")), // Link to unified contacts
    // Branding
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
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_created_at", ["createdAt"])
    .index("by_contact", ["contactId"]),

  schedulingSlots: defineTable({
    requestId: v.id("schedulingRequests"),
    start: v.number(),
    end: v.number(),
    status: v.union(v.literal("available"), v.literal("booked")),
    bookedByInviteId: v.optional(v.id("schedulingInvites")),
    projectId: v.optional(v.id("clientProjects")), // Link to project if booking creates project
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_request", ["requestId"])
    .index("by_project", ["projectId"]),

  schedulingInvites: defineTable({
    requestId: v.id("schedulingRequests"),
    recipientEmail: v.optional(v.string()),
    token: v.string(),
    status: v.union(v.literal("pending"), v.literal("responded")),
    selectedSlotId: v.optional(v.id("schedulingSlots")),
    respondedAt: v.optional(v.number()),
    // Booking information
    bookingName: v.optional(v.string()),
    bookingEmail: v.optional(v.string()),
    bookingPhone: v.optional(v.string()),
    bookingNotes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_request", ["requestId"]) 
    .index("by_token", ["token"]),

  // Email Marketing
  emailContacts: defineTable({
    email: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    tags: v.array(v.string()), // For segmentation
    status: v.union(
      v.literal("subscribed"),
      v.literal("unsubscribed"),
      v.literal("bounced"),
      v.literal("spam")
    ),
    source: v.optional(v.string()), // Where they came from
    metadata: v.optional(v.any()), // Custom metadata
    contactId: v.optional(v.id("contacts")), // Link to unified contacts
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_email", ["email"])
    .index("by_status", ["status"])
    .index("by_tags", ["tags"])
    .index("by_contact", ["contactId"]),

  emailCampaigns: defineTable({
    name: v.string(),
    subject: v.string(),
    fromEmail: v.optional(v.string()),
    fromName: v.optional(v.string()),
    htmlContent: v.optional(v.string()),
    textContent: v.optional(v.string()),
    status: v.union(
      v.literal("draft"),
      v.literal("scheduled"),
      v.literal("sending"),
      v.literal("sent"),
      v.literal("cancelled")
    ),
    scheduledAt: v.optional(v.number()),
    sentAt: v.optional(v.number()),
    tags: v.array(v.string()), // Campaign tags for segmentation
    projectId: v.optional(v.id("clientProjects")), // Link to project if campaign is project-related
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_status", ["status"])
    .index("by_scheduled_at", ["scheduledAt"])
    .index("by_tags", ["tags"])
    .index("by_project", ["projectId"]),

  emailSends: defineTable({
    campaignId: v.id("emailCampaigns"),
    contactId: v.id("emailContacts"),
    resendEmailId: v.optional(v.string()), // RESEND email ID for tracking
    status: v.union(
      v.literal("pending"),
      v.literal("sent"),
      v.literal("delivered"),
      v.literal("bounced"),
      v.literal("failed")
    ),
    sentAt: v.optional(v.number()),
    deliveredAt: v.optional(v.number()),
    opened: v.boolean(),
    openedCount: v.number(),
    lastOpenedAt: v.optional(v.number()),
    clicked: v.boolean(),
    clickedCount: v.number(),
    lastClickedAt: v.optional(v.number()),
    unsubscribed: v.boolean(),
    unsubscribedAt: v.optional(v.number()),
    markedAsSpam: v.boolean(),
    markedAsSpamAt: v.optional(v.number()),
    bounced: v.boolean(),
    bouncedAt: v.optional(v.number()),
    bounceReason: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_campaign", ["campaignId"])
    .index("by_contact", ["contactId"])
    .index("by_status", ["status"])
    .index("by_resend_email_id", ["resendEmailId"]),

  emailEvents: defineTable({
    sendId: v.id("emailSends"),
    type: v.union(
      v.literal("sent"),
      v.literal("delivered"),
      v.literal("opened"),
      v.literal("clicked"),
      v.literal("bounced"),
      v.literal("complained"), // Marked as spam
      v.literal("unsubscribed")
    ),
    metadata: v.optional(v.any()), // Additional event data
    createdAt: v.number(),
  })
    .index("by_send", ["sendId"])
    .index("by_type", ["type"])
    .index("by_created_at", ["createdAt"]),

  emailJourneys: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    status: v.union(
      v.literal("draft"),
      v.literal("active"),
      v.literal("paused"),
      v.literal("archived")
    ),
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
    entryTriggerData: v.optional(v.any()), // Trigger-specific data
    steps: v.array(v.object({
      stepNumber: v.number(),
      campaignId: v.id("emailCampaigns"),
      delayDays: v.number(), // Days to wait before sending this step
      condition: v.optional(v.union(
        v.literal("always"),
        v.literal("if_opened"),
        v.literal("if_clicked"),
        v.literal("if_not_opened")
      )),
    })),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_status", ["status"]),

  emailJourneyParticipants: defineTable({
    journeyId: v.id("emailJourneys"),
    contactId: v.id("emailContacts"),
    currentStep: v.number(),
    status: v.union(
      v.literal("active"),
      v.literal("completed"),
      v.literal("paused"),
      v.literal("exited")
    ),
    enteredAt: v.number(),
    nextStepAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    updatedAt: v.number(),
  })
    .index("by_journey", ["journeyId"])
    .index("by_contact", ["contactId"])
    .index("by_status", ["status"])
    .index("by_next_step_at", ["nextStepAt"]),

  emailSegments: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    filters: v.object({
      status: v.optional(v.array(v.union(
        v.literal("subscribed"),
        v.literal("unsubscribed"),
        v.literal("bounced"),
        v.literal("spam")
      ))),
      tags: v.optional(v.array(v.string())),
      sources: v.optional(v.array(v.string())),
      dateRange: v.optional(v.object({
        field: v.union(v.literal("createdAt"), v.literal("updatedAt")),
        start: v.optional(v.number()),
        end: v.optional(v.number()),
      })),
      hasOpened: v.optional(v.boolean()),
      hasClicked: v.optional(v.boolean()),
      lastActivityRange: v.optional(v.object({
        start: v.optional(v.number()),
        end: v.optional(v.number()),
      })),
    }),
    contactCount: v.number(), // Cached count
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_created_at", ["createdAt"]),

  // Portfolio (public website portfolio items - separate from projects)
  portfolio: defineTable({
    title: v.string(),
    slug: v.string(),
    clientName: v.string(),
    categories: v.array(v.union(v.literal("photo"), v.literal("video"), v.literal("design"), v.literal("mixed"))),
    status: v.union(
      v.literal("draft"),
      v.literal("review"),
      v.literal("approved"),
      v.literal("delivered"),
      v.literal("archived")
    ),
    coverAssetId: v.optional(v.id("assets")),
    notesPublic: v.optional(v.string()),
    notesPrivate: v.optional(v.string()),
    sortOrder: v.optional(v.number()), // Order for homepage display
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_status", ["status"])
    .index("by_category", ["categories"])
    .index("by_sort_order", ["sortOrder"]),

  // Landing Pages
  landingPages: defineTable({
    title: v.string(),
    slug: v.string(),
    heroText: v.optional(v.string()),
    bookingToken: v.optional(v.string()), // Token for public booking invite
    stripeUrl: v.optional(v.string()),
    howItWorksTitle: v.optional(v.string()),
    howItWorksSteps: v.optional(v.array(v.object({
      title: v.string(),
      description: v.string(),
    }))),
    services: v.optional(v.array(v.object({
      title: v.string(),
      description: v.string(),
    }))),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_slug", ["slug"]),

  landingPageHeroCarousel: defineTable({
    landingPageId: v.id("landingPages"),
    imageStorageId: v.string(),
    sortOrder: v.number(),
    alt: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_landing_page", ["landingPageId"])
    .index("by_sort_order", ["sortOrder"]),

  landingPageGallery: defineTable({
    landingPageId: v.id("landingPages"),
    imageStorageId: v.string(),
    sortOrder: v.number(),
    alt: v.optional(v.string()),
    width: v.optional(v.number()),
    height: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_landing_page", ["landingPageId"])
    .index("by_sort_order", ["sortOrder"]),

  // Client Projects (admin-only project management)
  clientProjects: defineTable({
    title: v.string(),
    clientName: v.string(),
    description: v.optional(v.string()),
    status: v.union(
      v.literal("planning"),
      v.literal("in_progress"),
      v.literal("review"),
      v.literal("completed"),
      v.literal("on_hold"),
      v.literal("cancelled")
    ),
    scope: v.optional(v.string()),
    notes: v.optional(v.string()),
    keyMoments: v.array(v.object({
      title: v.string(),
      description: v.optional(v.string()),
      date: v.number(),
      createdAt: v.number(),
    })),
    signOffs: v.array(v.object({
      title: v.string(),
      description: v.optional(v.string()),
      status: v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected")),
      date: v.optional(v.number()),
      createdAt: v.number(),
      updatedAt: v.optional(v.number()),
    })),
    linkedDeliveryIds: v.array(v.id("deliveries")),
    modificationHistory: v.array(v.object({
      field: v.string(),
      oldValue: v.any(),
      newValue: v.any(),
      modifiedBy: v.optional(v.string()),
      modifiedAt: v.number(),
    })),
    contractStorageId: v.optional(v.string()),
    contractFilename: v.optional(v.string()),
    createdBy: v.optional(v.string()),
    modifiedBy: v.optional(v.string()),
    contactId: v.optional(v.id("contacts")), // Link to unified contacts
    leadId: v.optional(v.id("leads")), // Link to lead if created from won lead
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_created_at", ["createdAt"])
    .index("by_client", ["clientName"])
    .index("by_contact", ["contactId"])
    .index("by_lead", ["leadId"]),

  // Media Library - global warehouse for reusable media
  mediaLibrary: defineTable({
    filename: v.string(),
    storageKey: v.string(), // Convex storage ID
    type: v.union(v.literal("image"), v.literal("video")),
    width: v.optional(v.number()),
    height: v.optional(v.number()),
    duration: v.optional(v.number()), // for video
    size: v.number(), // bytes (compressed size for images)
    canonicalUrl: v.optional(v.string()), // Canonical URL if needed
    tags: v.array(v.string()), // Tagging system
    folder: v.optional(v.string()), // Folder organization
    alt: v.optional(v.string()), // Alt text for images
    description: v.optional(v.string()), // Metadata description
    // Source tracking - where this media originated
    sourceAssetId: v.optional(v.id("assets")), // Original asset ID if imported from assets
    sourceType: v.optional(v.union(
      v.literal("asset"), // Imported from assets table
      v.literal("upload") // Direct upload to media library
    )),
    // Display locations - where this media is linked/displayed
    displayLocations: v.array(v.object({
      type: v.union(
        v.literal("portfolio"),
        v.literal("project"),
        v.literal("delivery"),
        v.literal("pitch_deck"),
        v.literal("quote_builder"),
        v.literal("gallery"),
        v.literal("hero_carousel"),
        v.literal("about"),
        v.literal("cover")
      ),
      entityId: v.string(), // ID of the portfolio/project/delivery/etc, or subtype identifier
      entityName: v.optional(v.string()), // Human-readable name for display
    })),
    // Compression metadata (for images)
    originalSize: v.optional(v.number()), // Original file size in bytes (before compression)
    compressedSize: v.optional(v.number()), // Compressed file size in bytes (after compression)
    compressionRatio: v.optional(v.number()), // Percentage reduction (e.g., 45 means 45% reduction)
    fileHash: v.optional(v.string()), // SHA-256 hash of file content for duplicate detection
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_tags", ["tags"])
    .index("by_folder", ["folder"])
    .index("by_type", ["type"])
    .index("by_created_at", ["createdAt"])
    .index("by_source_asset", ["sourceAssetId"])
    .index("by_file_hash", ["fileHash"]),

  // Pitch Decks (simple storage)
  pitchDecks: defineTable({
    title: v.string(),
    brandId: v.optional(v.string()), // Brand for PDF export styling
    coverDescription: v.optional(v.string()),
    preparedFor: v.optional(v.string()),
    preparedDate: v.optional(v.string()),
    coverMediaUrls: v.optional(v.array(v.string())),
    coverMediaIds: v.optional(v.array(v.id("mediaLibrary"))), // Legacy support
    scopeOfWork: v.optional(v.string()),
    preProduction: v.optional(v.string()),
    production: v.optional(v.string()),
    postProduction: v.optional(v.string()),
    imageryMediaUrls: v.optional(v.array(v.string())),
    imageryMediaIds: v.optional(v.array(v.id("mediaLibrary"))), // Legacy support
    estimate: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_created_at", ["createdAt"]),

  // Notes - quick capture and storage system
  notes: defineTable({
    title: v.string(),
    content: v.string(), // Note content (plain text or markdown)
    tags: v.array(v.string()), // Array of tag strings
    folder: v.optional(v.string()), // Optional folder name
    isPinned: v.optional(v.boolean()), // Pin important notes
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_updated", ["updatedAt"])
    .index("by_folder", ["folder"])
    .index("by_tags", ["tags"])
    .index("by_pinned", ["isPinned"]),

  // Folders - nested folder system for tasks and notes
  folders: defineTable({
    name: v.string(),
    parentFolderId: v.optional(v.id("folders")), // For nested folders
    color: v.optional(v.string()), // Optional color tag
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_parent", ["parentFolderId"])
    .index("by_name", ["name"]),

  // Tasks - time-light task manager
  tasks: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    taskType: v.union(
      v.literal("none"),
      v.literal("deadline"),
      v.literal("date_range"),
      v.literal("scheduled_time"),
      v.literal("recurring")
    ),
    deadlineAt: v.optional(v.number()), // Timestamp for "deadline"
    rangeStartDate: v.optional(v.number()), // Timestamp (date only) for "date_range"
    rangeEndDate: v.optional(v.number()), // Timestamp (date only) for "date_range"
    scheduledAt: v.optional(v.number()), // Timestamp for "scheduled_time"
    // Recurrence fields
    recurrencePattern: v.optional(v.union(
      v.literal("daily"),
      v.literal("weekly"),
      v.literal("monthly"),
      v.literal("yearly"),
      v.literal("specific_dates")
    )),
    recurrenceDaysOfWeek: v.optional(v.array(v.number())), // 0-6 for Sunday-Saturday, for daily/weekly
    recurrenceWeekInterval: v.optional(v.number()), // Every N weeks (for weekly pattern)
    recurrenceSpecificDates: v.optional(v.array(v.number())), // Array of timestamps for specific dates
    recurrenceStartDate: v.optional(v.number()), // When recurrence starts
    recurrenceEndDate: v.optional(v.number()), // Optional end date for recurrence
    recurrenceDayOfMonth: v.optional(v.number()), // Day of month (1-31) for monthly
    recurrenceMonth: v.optional(v.number()), // Month (0-11) for yearly
    recurrenceDayOfYear: v.optional(v.number()), // Day of month for yearly
    parentTaskId: v.optional(v.id("tasks")), // Reference to parent recurring task
    isRecurringInstance: v.optional(v.boolean()), // True if this is an instance of a recurring task
    isCompleted: v.boolean(),
    pinnedToday: v.boolean(),
    pinnedTomorrow: v.boolean(),
    folderId: v.optional(v.id("folders")),
    tagIds: v.array(v.string()), // Array of tag strings (using same tag system as notes)
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_completed", ["isCompleted"])
    .index("by_folder", ["folderId"])
    .index("by_tags", ["tagIds"])
    .index("by_created_at", ["createdAt"])
    .index("by_updated_at", ["updatedAt"])
    .index("by_deadline", ["deadlineAt"])
    .index("by_scheduled", ["scheduledAt"]),

  // Prospect Industries - reusable industry categories
  prospectIndustries: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_name", ["name"]),

  // Prospect Searches - search/scrape sessions
  prospectSearches: defineTable({
    name: v.string(), // Search query name (e.g., "med spa in charlotte nc")
    city: v.string(),
    state: v.string(),
    industryId: v.id("prospectIndustries"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_industry", ["industryId"])
    .index("by_city_state", ["city", "state"])
    .index("by_created_at", ["createdAt"]),

  // Prospects - individual business prospects
  prospects: defineTable({
    searchId: v.id("prospectSearches"),
    name: v.string(),
    address: v.string(),
    website: v.optional(v.string()),
    phone: v.optional(v.string()),
    instagram: v.optional(v.string()),
    facebook: v.optional(v.string()),
    youtube: v.optional(v.string()),
    twitter: v.optional(v.string()),
    linkedin: v.optional(v.string()),
    emails: v.array(v.string()), // Array of email addresses
    googleBusinessLink: v.optional(v.string()),
    score: v.optional(v.number()), // Calculated score
    scoreBreakdown: v.optional(v.any()), // Detailed breakdown of scoring
    notes: v.optional(v.string()), // User notes
    tags: v.array(v.string()), // Custom tags
    convertedToLeadId: v.optional(v.id("leads")), // Track if converted
    convertedAt: v.optional(v.number()), // When converted
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_search", ["searchId"])
    .index("by_score", ["score"])
    .index("by_created_at", ["createdAt"])
    .index("by_converted", ["convertedToLeadId"]),

  // Leads - prospects converted to leads with decision maker info
  leads: defineTable({
    prospectId: v.id("prospects"), // Link back to original prospect
    contactId: v.optional(v.id("contacts")), // Link to contact if created
    // All prospect data copied over
    name: v.string(),
    address: v.string(),
    website: v.optional(v.string()),
    phone: v.optional(v.string()),
    instagram: v.optional(v.string()),
    facebook: v.optional(v.string()),
    youtube: v.optional(v.string()),
    twitter: v.optional(v.string()),
    linkedin: v.optional(v.string()),
    emails: v.array(v.string()),
    googleBusinessLink: v.optional(v.string()),
    // Decision maker info (what makes it a lead)
    contactName: v.optional(v.string()),
    contactTitle: v.optional(v.string()),
    contactPhone: v.optional(v.string()),
    contactEmail: v.optional(v.string()),
    // Pipeline status
    status: v.union(
      v.literal("new"),
      v.literal("contacted"),
      v.literal("qualified"),
      v.literal("proposal"),
      v.literal("closed")
    ),
    closedOutcome: v.optional(v.union(v.literal("won"), v.literal("lost"))),
    notes: v.optional(v.string()),
    tags: v.array(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_prospect", ["prospectId"])
    .index("by_contact", ["contactId"])
    .index("by_status", ["status"])
    .index("by_created_at", ["createdAt"]),

  // Contacts - unified contacts database (source of truth)
  contacts: defineTable({
    // Contact identification
    email: v.string(), // Primary identifier
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    // Business info (from lead/prospect)
    businessName: v.optional(v.string()),
    address: v.optional(v.string()),
    website: v.optional(v.string()),
    phone: v.optional(v.string()),
    // Social links
    instagram: v.optional(v.string()),
    facebook: v.optional(v.string()),
    youtube: v.optional(v.string()),
    twitter: v.optional(v.string()),
    linkedin: v.optional(v.string()),
    googleBusinessLink: v.optional(v.string()),
    // Decision maker info
    contactName: v.optional(v.string()),
    contactTitle: v.optional(v.string()),
    contactPhone: v.optional(v.string()),
    // Source tracking
    source: v.optional(v.string()), // "lead", "email_marketing", "manual"
    leadId: v.optional(v.id("leads")), // If from lead
    prospectId: v.optional(v.id("prospects")), // If from prospect
    // Email marketing sync
    emailMarketingId: v.optional(v.id("emailContacts")), // Link to email marketing contact
    // Status and metadata
    tags: v.array(v.string()),
    notes: v.optional(v.string()),
    metadata: v.optional(v.any()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_email", ["email"])
    .index("by_source", ["source"])
    .index("by_lead", ["leadId"])
    .index("by_prospect", ["prospectId"])
    .index("by_email_marketing", ["emailMarketingId"]),

  // Subscription Payment Methods - customizable payment methods
  subscriptionPaymentMethods: defineTable({
    name: v.string(), // e.g., "Cash", "Red Card", "Blue Card"
    color: v.string(), // Hex color code (e.g., "#22c55e")
    isDefault: v.optional(v.boolean()), // Mark default methods
    sortOrder: v.optional(v.number()), // For ordering in UI
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_sort_order", ["sortOrder"])
    .index("by_created_at", ["createdAt"]),

  // Subscriptions - recurring payment tracking
  subscriptions: defineTable({
    name: v.string(), // e.g., "Netflix", "Adobe Creative Cloud"
    amount: v.number(), // Monthly cost
    currency: v.string(), // Default: "USD"
    billingCycle: v.union(
      v.literal("monthly"),
      v.literal("yearly"),
      v.literal("quarterly"),
      v.literal("weekly")
    ),
    startDate: v.number(), // Timestamp - original start date
    dueDay: v.number(), // 1-31, the day of month it's always due
    status: v.union(
      v.literal("active"),
      v.literal("paused"),
      v.literal("archived")
    ),
    nextDueDate: v.number(), // Timestamp - calculated next due date
    lastPaidDate: v.optional(v.number()), // Timestamp - when last marked as paid
    paymentMethodId: v.optional(v.id("subscriptionPaymentMethods")), // Link to payment method
    periodsPaid: v.optional(v.number()), // Number of billing periods that have been paid (default: 0)
    balance: v.optional(v.number()), // Remaining balance after covering full periods (default: 0)
    notes: v.optional(v.string()),
    tags: v.array(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_status", ["status"])
    .index("by_next_due_date", ["nextDueDate"])
    .index("by_payment_method", ["paymentMethodId"])
    .index("by_created_at", ["createdAt"]),

  // Subscription Payments - payment history
  subscriptionPayments: defineTable({
    subscriptionId: v.id("subscriptions"),
    amount: v.number(),
    paidDate: v.number(), // Timestamp
    paymentMethodId: v.optional(v.id("subscriptionPaymentMethods")), // Link to payment method
    notes: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_subscription", ["subscriptionId"])
    .index("by_paid_date", ["paidDate"])
    .index("by_payment_method", ["paymentMethodId"]),

  // Blog Categories
  blogCategories: defineTable({
    name: v.string(),
    slug: v.string(),
    description: v.optional(v.string()),
    sortOrder: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_created_at", ["createdAt"]),

  // Blog Tags
  blogTags: defineTable({
    name: v.string(),
    slug: v.string(),
    useCount: v.optional(v.number()), // Track how many times tag is used
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_use_count", ["useCount"])
    .index("by_created_at", ["createdAt"]),

  // Blog Posts
  blogPosts: defineTable({
    title: v.string(),
    slug: v.string(),
    excerpt: v.optional(v.string()),
    status: v.union(
      v.literal("draft"),
      v.literal("published"),
      v.literal("scheduled"),
      v.literal("archived")
    ),
    scheduledFor: v.optional(v.number()), // Timestamp when post should be published
    publishedAt: v.optional(v.number()), // Timestamp when post was published
    featured: v.optional(v.boolean()), // Featured posts
    showCoverOnPost: v.optional(v.boolean()), // Control cover image display on individual post page
    authorName: v.optional(v.string()),
    authorImageStorageId: v.optional(v.string()),
    coverImageStorageId: v.optional(v.string()),
    ogImageStorageId: v.optional(v.string()), // Open Graph image for social media
    categoryIds: v.optional(v.array(v.id("blogCategories"))),
    tags: v.optional(v.array(v.string())),
    seoTitle: v.optional(v.string()),
    seoDescription: v.optional(v.string()),
    viewCount: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_status", ["status"])
    .index("by_featured", ["featured"])
    .index("by_published_at", ["publishedAt"])
    .index("by_created_at", ["createdAt"]),

  // Blog Post Sections (for rich content editing)
  blogPostSections: defineTable({
    blogPostId: v.id("blogPosts"),
    type: v.union(
      v.literal("text"),
      v.literal("image"),
      v.literal("gallery"),
      v.literal("cta_booking"),
      v.literal("cta_stripe")
    ),
    sortOrder: v.number(),
    // Text section
    textContent: v.optional(v.string()), // Rich text HTML
    // Image section
    imageStorageId: v.optional(v.string()),
    imageAlt: v.optional(v.string()),
    imageCaption: v.optional(v.string()),
    imageWidth: v.optional(v.number()),
    imageHeight: v.optional(v.number()),
    // Gallery section
    galleryImages: v.optional(v.array(v.object({
      storageId: v.string(),
      alt: v.optional(v.string()),
      caption: v.optional(v.string()),
    }))),
    // CTA sections
    ctaHeading: v.optional(v.string()),
    ctaDescription: v.optional(v.string()),
    bookingToken: v.optional(v.string()), // For booking CTA
    stripeUrl: v.optional(v.string()), // For Stripe payment link CTA
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_blog_post", ["blogPostId"])
    .index("by_blog_post_and_sort_order", ["blogPostId", "sortOrder"])
    .index("by_sort_order", ["sortOrder"]),
});

