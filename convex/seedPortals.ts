import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./adminAuth";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const bcrypt = require("bcryptjs");

// Check if running in production
const isProduction = process.env.NODE_ENV === "production";

// Helper to generate secure random PIN (4 digits for convenience, 6 digits for better security)
function generateSecurePIN(): string {
  // Generate a random 4-digit PIN using Math.random() (works in Convex environment)
  const pin = Math.floor(Math.random() * 9000 + 1000).toString();
  return pin;
}

// Helper to create a storage ID for seed data
// DEV ONLY: This creates placeholder storage - in production, this should fail
// For seed data, we use placeholder storage keys. The portals will work but assets won't have actual images.
function createPlaceholderStorage() {
  if (isProduction) {
    throw new Error("Placeholder storage keys are not allowed in production. Use actual file uploads.");
  }
  return `seed-storage-${Date.now()}-${Math.random().toString(36).substring(7)}`;
}

// Seed sample portals (deliveries) with assets and feedback
// DEV ONLY: This function should be disabled or heavily guarded in production
export const seedPortals = mutation({
  args: {},
  handler: async (ctx, args) => {
    // Require proper admin authentication
    await requireAdmin(ctx);
    
    // In production, seed functions should be disabled or require additional confirmation
    if (isProduction) {
      throw new Error("Seed functions are disabled in production for security reasons.");
    }

    const now = Date.now();

    // Create sample assets for portals
    // Note: These use placeholder storage keys for demonstration
    // In production, you'd upload actual files through the UI
    const sampleAssets = [];
    const assetFilenames = [
      "brand-campaign-final-01.jpg",
      "brand-campaign-final-02.jpg",
      "brand-campaign-final-03.jpg",
      "product-photos-shoot-01.jpg",
      "product-photos-shoot-02.jpg",
      "corporate-video-still-01.jpg",
      "corporate-video-still-02.jpg",
      "event-coverage-highlight.jpg",
    ];

    for (let i = 0; i < assetFilenames.length; i++) {
      const storageKey = createPlaceholderStorage();
      const assetId = await ctx.db.insert("assets", {
        filename: assetFilenames[i],
        storageKey: storageKey,
        type: i < 6 ? "image" : (i < 7 ? "video" : "image"),
        size: 2048000 + i * 100000, // Varying file sizes
        approved: true,
        sortOrder: i,
        uploadType: "delivery",
        createdAt: now - (assetFilenames.length - i) * 3600000,
      });
      sampleAssets.push(assetId);
    }

    // Portal 1: Brand Campaign with feedback
    // Generate secure random PIN instead of hardcoded value
    const portal1Pin = generateSecurePIN();
    const portal1PinHash = bcrypt.hashSync(portal1Pin, 10);
    const portal1Assets = [sampleAssets[0], sampleAssets[1], sampleAssets[2]];
    const portal1 = await ctx.db.insert("deliveries", {
      title: "Brand Campaign - Final Deliverables",
      clientName: "Acme Corporation",
      slug: "brand-campaign-acme-final",
      pinHash: portal1PinHash,
      // Note: pinPlaintext should not be stored in production - only for seed data
      pinPlaintext: isProduction ? undefined : portal1Pin,
      expiresAt: now + 30 * 24 * 60 * 60 * 1000, // 30 days from now
      originalDeliveryDate: now - 5 * 24 * 60 * 60 * 1000, // 5 days ago
      watermark: true,
      allowZip: true,
      allowedAssetIds: portal1Assets,
      notesPublic: "Thank you for your patience. Here are the final deliverables from our brand campaign shoot. Please review and provide feedback on any images that need adjustments.",
      createdAt: now - 5 * 24 * 60 * 60 * 1000,
      updatedAt: now - 2 * 24 * 60 * 60 * 1000,
    });

    // Add feedback for portal 1
    await ctx.db.insert("feedback", {
      deliveryId: portal1,
      assetId: portal1Assets[0],
      body: "This image looks great! Love the composition and color grading.",
      decision: "approve",
      author: "client",
      createdAt: now - 4 * 24 * 60 * 60 * 1000,
    });
    await ctx.db.insert("feedback", {
      deliveryId: portal1,
      assetId: portal1Assets[1],
      body: "Could we brighten this one a bit? The shadows are a little too dark.",
      decision: "changes",
      author: "client",
      createdAt: now - 3 * 24 * 60 * 60 * 1000,
    });
    await ctx.db.insert("feedback", {
      deliveryId: portal1,
      body: "Overall, these look amazing! Just the minor adjustments mentioned and we're good to go.",
      author: "client",
      createdAt: now - 2 * 24 * 60 * 60 * 1000,
    });

    // Portal 2: Product Photography - expiring soon
    const portal2Pin = generateSecurePIN();
    const portal2PinHash = bcrypt.hashSync(portal2Pin, 10);
    const portal2Assets = [sampleAssets[3], sampleAssets[4]];
    const portal2 = await ctx.db.insert("deliveries", {
      title: "Product Photography - Spring Collection",
      clientName: "Fashion Boutique Inc",
      slug: "product-spring-collection",
      pinHash: portal2PinHash,
      pinPlaintext: portal2Pin,
      expiresAt: now + 3 * 24 * 60 * 60 * 1000, // 3 days from now (expiring soon)
      originalDeliveryDate: now - 27 * 24 * 60 * 60 * 1000, // 27 days ago
      watermark: true,
      allowZip: true,
      allowedAssetIds: portal2Assets,
      notesPublic: "Product photography for the Spring 2024 collection. All images are ready for use on your website and marketing materials.",
      createdAt: now - 27 * 24 * 60 * 60 * 1000,
      updatedAt: now - 20 * 24 * 60 * 60 * 1000,
    });

    // Add feedback for portal 2
    await ctx.db.insert("feedback", {
      deliveryId: portal2,
      assetId: portal2Assets[0],
      body: "Perfect! Exactly what we needed.",
      decision: "approve",
      author: "client",
      createdAt: now - 25 * 24 * 60 * 60 * 1000,
    });
    await ctx.db.insert("feedback", {
      deliveryId: portal2,
      body: "All images approved and downloaded. Thank you!",
      author: "client",
      createdAt: now - 22 * 24 * 60 * 60 * 1000,
    });

    // Portal 3: Corporate Video - with active paid storage
    const portal3Pin = generateSecurePIN();
    const portal3PinHash = bcrypt.hashSync(portal3Pin, 10);
    const portal3Assets = [sampleAssets[5], sampleAssets[6]];
    const portal3 = await ctx.db.insert("deliveries", {
      title: "Corporate Video Campaign - B-Roll",
      clientName: "Tech Startup Co",
      slug: "corporate-video-broll",
      pinHash: portal3PinHash,
      pinPlaintext: portal3Pin,
      expiresAt: now - 10 * 24 * 60 * 60 * 1000, // Expired 10 days ago
      originalDeliveryDate: now - 60 * 24 * 60 * 60 * 1000, // 60 days ago
      watermark: false,
      allowZip: true,
      allowedAssetIds: portal3Assets,
      notesPublic: "B-roll footage from the corporate video campaign. High resolution files available for download.",
      storageSubscriptionStatus: "active",
      storageSubscriptionId: "sub_sample_123",
      storageSubscriptionExpiresAt: now + 30 * 24 * 60 * 60 * 1000, // Paid storage active for 30 more days
      createdAt: now - 60 * 24 * 60 * 60 * 1000,
      updatedAt: now - 50 * 24 * 60 * 60 * 1000,
    });

    // Add feedback for portal 3
    await ctx.db.insert("feedback", {
      deliveryId: portal3,
      assetId: portal3Assets[0],
      body: "The lighting in this shot is perfect. We'll definitely use this.",
      decision: "approve",
      author: "client",
      createdAt: now - 55 * 24 * 60 * 60 * 1000,
    });

    // Portal 4: Event Coverage - no feedback yet
    const portal4Pin = generateSecurePIN();
    const portal4PinHash = bcrypt.hashSync(portal4Pin, 10);
    const portal4Assets = [sampleAssets[7]];
    const portal4 = await ctx.db.insert("deliveries", {
      title: "Event Coverage - Annual Conference",
      clientName: "Business Events LLC",
      slug: "annual-conference-2024",
      pinHash: portal4PinHash,
      pinPlaintext: portal4Pin,
      expiresAt: now + 45 * 24 * 60 * 60 * 1000, // 45 days from now
      originalDeliveryDate: now - 2 * 24 * 60 * 60 * 1000, // 2 days ago
      watermark: true,
      allowZip: true,
      allowedAssetIds: portal4Assets,
      notesPublic: "Event coverage photos from the annual conference. Please review and let us know if you need any specific shots.",
      createdAt: now - 2 * 24 * 60 * 60 * 1000,
      updatedAt: now - 1 * 24 * 60 * 60 * 1000,
    });

    // Portal 5: Expired portal
    const portal5Pin = generateSecurePIN();
    const portal5PinHash = bcrypt.hashSync(portal5Pin, 10);
    const portal5Assets = [sampleAssets[0], sampleAssets[1]];
    const portal5 = await ctx.db.insert("deliveries", {
      title: "Wedding Photography - Sarah & John",
      clientName: "Sarah & John",
      slug: "wedding-sarah-john",
      pinHash: portal5PinHash,
      pinPlaintext: portal5Pin,
      expiresAt: now - 15 * 24 * 60 * 60 * 1000, // Expired 15 days ago
      originalDeliveryDate: now - 45 * 24 * 60 * 60 * 1000, // 45 days ago
      watermark: true,
      allowZip: true,
      allowedAssetIds: portal5Assets,
      notesPublic: "Wedding photography deliverables. All images have been watermarked for review.",
      createdAt: now - 45 * 24 * 60 * 60 * 1000,
      updatedAt: now - 30 * 24 * 60 * 60 * 1000,
    });

    // Add some events for tracking
    await ctx.db.insert("events", {
      deliveryId: portal1,
      type: "view",
      meta: { timestamp: now - 4 * 24 * 60 * 60 * 1000 },
      createdAt: now - 4 * 24 * 60 * 60 * 1000,
    });
    await ctx.db.insert("events", {
      deliveryId: portal2,
      type: "download",
      meta: { assetId: portal2Assets[0] },
      createdAt: now - 23 * 24 * 60 * 60 * 1000,
    });
    await ctx.db.insert("events", {
      deliveryId: portal3,
      type: "view",
      meta: { timestamp: now - 55 * 24 * 60 * 60 * 1000 },
      createdAt: now - 55 * 24 * 60 * 60 * 1000,
    });

    return {
      portals: [
        {
          id: portal1,
      slug: "brand-campaign-acme-final",
      pin: portal1Pin, // Note: PIN is returned for development convenience only
        },
        {
          id: portal2,
          slug: "product-spring-collection",
          pin: portal2Pin,
        },
        {
          id: portal3,
          slug: "corporate-video-broll",
          pin: portal3Pin,
        },
        {
          id: portal4,
          slug: "annual-conference-2024",
          pin: portal4Pin,
        },
        {
          id: portal5,
          slug: "wedding-sarah-john",
          pin: portal5Pin,
        },
      ],
      message: "Sample portals created successfully! Check /admin/deliveries to see them. Some portals include sample feedback.",
    };
  },
});

