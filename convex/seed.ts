import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./adminAuth";

// Check if running in production
const isProduction = process.env.NODE_ENV === "production";

// Seed script to create sample data with stock images
// DEV ONLY: This function should be disabled in production
export const seed = mutation({
  handler: async (ctx) => {
    // Require proper admin authentication
    await requireAdmin(ctx);
    
    // In production, seed functions should be disabled
    if (isProduction) {
      throw new Error("Seed functions are disabled in production for security reasons.");
    }
    // Create sample projects
    const now = Date.now();

    // Portrait Photography Project
    const portraitProject = await ctx.db.insert("projects", {
      title: "Portraits",
      slug: "portraits",
      clientName: "Personal Work",
      categories: ["photo"],
      status: "delivered",
      notesPublic: "A collection of intimate portraits capturing authentic expressions and emotions.",
      notesPrivate: "Client was very happy with the results.",
      createdAt: now - 86400000 * 60,
      updatedAt: now - 86400000 * 7,
    });

    // Lifestyle Photography Project
    const lifestyleProject = await ctx.db.insert("projects", {
      title: "Lifestyle",
      slug: "lifestyle",
      clientName: "Editorial",
      categories: ["photo"],
      status: "delivered",
      notesPublic: "Modern lifestyle photography showcasing contemporary living and fashion.",
      notesPrivate: "Published in multiple magazines.",
      createdAt: now - 86400000 * 45,
      updatedAt: now - 86400000 * 5,
    });

    // Racing/Motorsport Project
    const racingProject = await ctx.db.insert("projects", {
      title: "Racing Series",
      slug: "racing-series",
      clientName: "Motorsport Media",
      categories: ["photo"],
      status: "delivered",
      notesPublic: "High-speed action photography capturing the intensity of professional racing.",
      notesPrivate: "Featured on motorsport websites.",
      createdAt: now - 86400000 * 30,
      updatedAt: now - 86400000 * 3,
    });

    // Characters/Editorial Project
    const charactersProject = await ctx.db.insert("projects", {
      title: "Characters",
      slug: "characters",
      clientName: "Editorial Work",
      categories: ["photo"],
      status: "delivered",
      notesPublic: "Editorial portraits showcasing diverse personalities and stories.",
      notesPrivate: "Award-winning series.",
      createdAt: now - 86400000 * 20,
      updatedAt: now - 86400000 * 2,
    });

    // Video Project
    const videoProject = await ctx.db.insert("projects", {
      title: "Brand Campaign Video",
      slug: "brand-campaign-video",
      clientName: "Creative Agency",
      categories: ["video"],
      status: "delivered",
      notesPublic: "Cinematic brand video showcasing company values and culture.",
      notesPrivate: "High priority project, client wants fast turnaround.",
      createdAt: now - 86400000 * 14,
      updatedAt: now - 86400000 * 2,
    });

    // Design Project
    const designProject = await ctx.db.insert("projects", {
      title: "Brand Identity Design",
      slug: "brand-identity-design",
      clientName: "Modern Studio",
      categories: ["design"],
      status: "delivered",
      notesPublic: "Complete visual identity redesign for creative agency.",
      notesPrivate: "Waiting for client feedback on initial concepts.",
      createdAt: now - 86400000 * 7,
      updatedAt: now - 86400000 * 1,
    });

    // Additional Photo Projects
    const streetPhotoProject = await ctx.db.insert("projects", {
      title: "Street Photography",
      slug: "street-photography",
      clientName: "Urban Stories",
      categories: ["photo"],
      status: "delivered",
      notesPublic: "Capturing the essence of urban life through candid street photography.",
      notesPrivate: "Exhibited in local gallery.",
      createdAt: now - 86400000 * 15,
      updatedAt: now - 86400000 * 4,
    });

    const fashionPhotoProject = await ctx.db.insert("projects", {
      title: "Fashion Editorial",
      slug: "fashion-editorial",
      clientName: "Style Magazine",
      categories: ["photo"],
      status: "delivered",
      notesPublic: "High-fashion editorial shoot featuring contemporary designs.",
      notesPrivate: "Published in fashion magazine.",
      createdAt: now - 86400000 * 25,
      updatedAt: now - 86400000 * 6,
    });

    const naturePhotoProject = await ctx.db.insert("projects", {
      title: "Nature & Landscapes",
      slug: "nature-landscapes",
      clientName: "Outdoor Magazine",
      categories: ["photo"],
      status: "delivered",
      notesPublic: "Stunning landscapes and nature photography showcasing the beauty of the natural world.",
      notesPrivate: "Multiple publication features.",
      createdAt: now - 86400000 * 35,
      updatedAt: now - 86400000 * 8,
    });

    // Additional Video Projects
    const documentaryVideoProject = await ctx.db.insert("projects", {
      title: "Documentary Series",
      slug: "documentary-series",
      clientName: "Independent Films",
      categories: ["video"],
      status: "delivered",
      notesPublic: "Award-winning documentary series exploring human stories.",
      notesPrivate: "Film festival submission.",
      createdAt: now - 86400000 * 10,
      updatedAt: now - 86400000 * 3,
    });

    // Additional Design Projects
    const webDesignProject = await ctx.db.insert("projects", {
      title: "Web Design Portfolio",
      slug: "web-design-portfolio",
      clientName: "Tech Startup",
      categories: ["design"],
      status: "delivered",
      notesPublic: "Modern web design and user interface for tech startup.",
      notesPrivate: "Client approved final designs.",
      createdAt: now - 86400000 * 5,
      updatedAt: now - 86400000 * 2,
    });

    // Portrait assets - using Unsplash URLs
    const portraitImageUrls = [
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=2048&h=2732&fit=crop",
      "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=2048&h=2732&fit=crop",
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=2048&h=2732&fit=crop",
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=2048&h=2732&fit=crop",
      "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=2048&h=2732&fit=crop",
      "https://images.unsplash.com/photo-1509475826633-fed577a2c71b?w=2048&h=2732&fit=crop",
    ];

    const portraitAssets = [];
    for (let i = 0; i < portraitImageUrls.length; i++) {
      const assetId = await ctx.db.insert("assets", {
        projectId: portraitProject,
        type: "image",
        filename: `portrait-${i + 1}.jpg`,
        storageKey: portraitImageUrls[i],
        previewKey: portraitImageUrls[i],
        width: 2048,
        height: 2732,
        size: 2048000,
        approved: true,
        sortOrder: i,
        createdAt: now - 86400000 * 55 + i * 3600000,
      });
      portraitAssets.push(assetId);
    }

    // Lifestyle assets
    const lifestyleImageUrls = [
      "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=2048&h=1365&fit=crop",
      "https://images.unsplash.com/photo-1522673607200-164d1b6ce486?w=2048&h=1365&fit=crop",
      "https://images.unsplash.com/photo-1512341689857-1981987a8bd4?w=2048&h=1365&fit=crop",
      "https://images.unsplash.com/photo-1534777367038-9404f45c8690?w=2048&h=1365&fit=crop",
    ];

    const lifestyleAssets = [];
    for (let i = 0; i < lifestyleImageUrls.length; i++) {
      const assetId = await ctx.db.insert("assets", {
        projectId: lifestyleProject,
        type: "image",
        filename: `lifestyle-${i + 1}.jpg`,
        storageKey: lifestyleImageUrls[i],
        previewKey: lifestyleImageUrls[i],
        width: 2048,
        height: 1365,
        size: 2048000,
        approved: true,
        sortOrder: i,
        createdAt: now - 86400000 * 40 + i * 3600000,
      });
      lifestyleAssets.push(assetId);
    }

    // Racing assets
    const racingImageUrls = [
      "https://images.unsplash.com/photo-1577335558619-4e66f7c1e34c?w=2048&h=1365&fit=crop",
      "https://images.unsplash.com/photo-1593941707882-a5bac6861ee8?w=2048&h=1365&fit=crop",
      "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=2048&h=1365&fit=crop",
    ];

    const racingAssets = [];
    for (let i = 0; i < racingImageUrls.length; i++) {
      const assetId = await ctx.db.insert("assets", {
        projectId: racingProject,
        type: "image",
        filename: `racing-${i + 1}.jpg`,
        storageKey: racingImageUrls[i],
        previewKey: racingImageUrls[i],
        width: 2048,
        height: 1365,
        size: 2048000,
        approved: true,
        sortOrder: i,
        createdAt: now - 86400000 * 25 + i * 3600000,
      });
      racingAssets.push(assetId);
    }

    // Characters assets
    const charactersImageUrls = [
      "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=2048&h=2732&fit=crop",
      "https://images.unsplash.com/photo-1552058544-f2b08422138a?w=2048&h=2732&fit=crop",
      "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=2048&h=2732&fit=crop",
    ];

    const charactersAssets = [];
    for (let i = 0; i < charactersImageUrls.length; i++) {
      const assetId = await ctx.db.insert("assets", {
        projectId: charactersProject,
        type: "image",
        filename: `character-${i + 1}.jpg`,
        storageKey: charactersImageUrls[i],
        previewKey: charactersImageUrls[i],
        width: 2048,
        height: 2732,
        size: 2048000,
        approved: true,
        sortOrder: i,
        createdAt: now - 86400000 * 15 + i * 3600000,
      });
      charactersAssets.push(assetId);
    }

    // Video assets - using thumbnail images for video covers
    const videoThumbnailUrls = [
      "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=1920&h=1080&fit=crop",
      "https://images.unsplash.com/photo-1516035069371-29a1b244b32a?w=1920&h=1080&fit=crop",
      "https://images.unsplash.com/photo-1516979187457-637abb4f9353?w=1920&h=1080&fit=crop",
    ];
    
    const videoAssets = [];
    for (let i = 0; i < videoThumbnailUrls.length; i++) {
      const assetId = await ctx.db.insert("assets", {
        projectId: videoProject,
        type: "image", // Using image type for video thumbnails
        filename: `brand-video-thumb-${i + 1}.jpg`,
        storageKey: videoThumbnailUrls[i],
        previewKey: videoThumbnailUrls[i],
        width: 1920,
        height: 1080,
        size: 2048000,
        approved: true,
        sortOrder: i,
        createdAt: now - 86400000 * 10 + i * 3600000,
      });
      videoAssets.push(assetId);
    }

    // Design assets
    const designImageUrls = [
      "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=1200&h=1200&fit=crop",
      "https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=1200&h=1200&fit=crop",
      "https://images.unsplash.com/photo-1586717791821-3f44a563fa4c?w=1200&h=1200&fit=crop",
    ];

    const designAssets = [];
    for (let i = 0; i < designImageUrls.length; i++) {
      const assetId = await ctx.db.insert("assets", {
        projectId: designProject,
        type: "image",
        filename: `design-${i + 1}.png`,
        storageKey: designImageUrls[i],
        previewKey: designImageUrls[i],
        width: 1200,
        height: 1200,
        size: 512000,
        approved: true,
        sortOrder: i,
        createdAt: now - 86400000 * 5 + i * 3600000,
      });
      designAssets.push(assetId);
    }

    // Street Photography assets
    const streetImageUrls = [
      "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=2048&h=1365&fit=crop",
      "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=2048&h=1365&fit=crop",
      "https://images.unsplash.com/photo-1505852679233-d9fd70aff56d?w=2048&h=1365&fit=crop",
      "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=2048&h=1365&fit=crop",
      "https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=2048&h=1365&fit=crop",
    ];

    const streetAssets = [];
    for (let i = 0; i < streetImageUrls.length; i++) {
      const assetId = await ctx.db.insert("assets", {
        projectId: streetPhotoProject,
        type: "image",
        filename: `street-${i + 1}.jpg`,
        storageKey: streetImageUrls[i],
        previewKey: streetImageUrls[i],
        width: 2048,
        height: 1365,
        size: 2048000,
        approved: true,
        sortOrder: i,
        createdAt: now - 86400000 * 10 + i * 3600000,
      });
      streetAssets.push(assetId);
    }

    // Fashion Editorial assets
    const fashionImageUrls = [
      "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=2048&h=2732&fit=crop",
      "https://images.unsplash.com/photo-1522338242982-e1247b2b3d02?w=2048&h=2732&fit=crop",
      "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=2048&h=2732&fit=crop",
      "https://images.unsplash.com/photo-1469334031218-e382a7b49153?w=2048&h=2732&fit=crop",
    ];

    const fashionAssets = [];
    for (let i = 0; i < fashionImageUrls.length; i++) {
      const assetId = await ctx.db.insert("assets", {
        projectId: fashionPhotoProject,
        type: "image",
        filename: `fashion-${i + 1}.jpg`,
        storageKey: fashionImageUrls[i],
        previewKey: fashionImageUrls[i],
        width: 2048,
        height: 2732,
        size: 2048000,
        approved: true,
        sortOrder: i,
        createdAt: now - 86400000 * 20 + i * 3600000,
      });
      fashionAssets.push(assetId);
    }

    // Nature & Landscapes assets
    const natureImageUrls = [
      "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=2048&h=1365&fit=crop",
      "https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=2048&h=1365&fit=crop",
      "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=2048&h=1365&fit=crop",
      "https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=2048&h=1365&fit=crop",
      "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=2048&h=1365&fit=crop",
    ];

    const natureAssets = [];
    for (let i = 0; i < natureImageUrls.length; i++) {
      const assetId = await ctx.db.insert("assets", {
        projectId: naturePhotoProject,
        type: "image",
        filename: `nature-${i + 1}.jpg`,
        storageKey: natureImageUrls[i],
        previewKey: natureImageUrls[i],
        width: 2048,
        height: 1365,
        size: 2048000,
        approved: true,
        sortOrder: i,
        createdAt: now - 86400000 * 30 + i * 3600000,
      });
      natureAssets.push(assetId);
    }

    // Documentary Video assets - using thumbnail images
    const documentaryThumbnailUrls = [
      "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1920&h=1080&fit=crop",
      "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1920&h=1080&fit=crop",
    ];
    
    const documentaryVideoAssets = [];
    for (let i = 0; i < documentaryThumbnailUrls.length; i++) {
      const assetId = await ctx.db.insert("assets", {
        projectId: documentaryVideoProject,
        type: "image", // Using image type for video thumbnails
        filename: `documentary-thumb-${i + 1}.jpg`,
        storageKey: documentaryThumbnailUrls[i],
        previewKey: documentaryThumbnailUrls[i],
        width: 1920,
        height: 1080,
        size: 2048000,
        approved: true,
        sortOrder: i,
        createdAt: now - 86400000 * 8 + i * 3600000,
      });
      documentaryVideoAssets.push(assetId);
    }

    // Web Design assets
    const webDesignImageUrls = [
      "https://images.unsplash.com/photo-1467232004584-a241de8bcf5d?w=2048&h=1365&fit=crop",
      "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=2048&h=1365&fit=crop",
      "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=2048&h=1365&fit=crop",
    ];

    const webDesignAssets = [];
    for (let i = 0; i < webDesignImageUrls.length; i++) {
      const assetId = await ctx.db.insert("assets", {
        projectId: webDesignProject,
        type: "image",
        filename: `web-design-${i + 1}.png`,
        storageKey: webDesignImageUrls[i],
        previewKey: webDesignImageUrls[i],
        width: 2048,
        height: 1365,
        size: 512000,
        approved: true,
        sortOrder: i,
        createdAt: now - 86400000 * 3 + i * 3600000,
      });
      webDesignAssets.push(assetId);
    }

    // Set cover assets
    await ctx.db.patch(portraitProject, { coverAssetId: portraitAssets[0] });
    await ctx.db.patch(lifestyleProject, { coverAssetId: lifestyleAssets[0] });
    await ctx.db.patch(racingProject, { coverAssetId: racingAssets[0] });
    await ctx.db.patch(charactersProject, { coverAssetId: charactersAssets[0] });
    await ctx.db.patch(videoProject, { coverAssetId: videoAssets[0] });
    await ctx.db.patch(designProject, { coverAssetId: designAssets[0] });
    await ctx.db.patch(streetPhotoProject, { coverAssetId: streetAssets[0] });
    await ctx.db.patch(fashionPhotoProject, { coverAssetId: fashionAssets[0] });
    await ctx.db.patch(naturePhotoProject, { coverAssetId: natureAssets[0] });
    await ctx.db.patch(documentaryVideoProject, { coverAssetId: documentaryVideoAssets[0] });
    await ctx.db.patch(webDesignProject, { coverAssetId: webDesignAssets[0] });

    // Note: Deliveries and feedback are not created in seed
    // They can be created manually through the admin interface if needed

    return {
      projects: [
        portraitProject, 
        lifestyleProject, 
        racingProject, 
        charactersProject, 
        streetPhotoProject,
        fashionPhotoProject,
        naturePhotoProject,
        videoProject, 
        documentaryVideoProject,
        designProject,
        webDesignProject
      ],
      assets: [
        ...portraitAssets, 
        ...lifestyleAssets, 
        ...racingAssets, 
        ...charactersAssets,
        ...streetAssets,
        ...fashionAssets,
        ...natureAssets,
        ...videoAssets,
        ...documentaryVideoAssets,
        ...designAssets,
        ...webDesignAssets
      ],
      message: "Seed data created successfully! All projects are visible in the portfolio.",
    };
  },
});

