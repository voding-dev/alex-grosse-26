import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./adminAuth";

// Check if running in production
const isProduction = process.env.NODE_ENV === "production";

// Reset projects: Delete all existing projects and create new portfolio/projects examples
// DEV ONLY: This function should be disabled in production
export const resetProjects = mutation({
  args: {},
  handler: async (ctx, args) => {
    // Require proper admin authentication
    await requireAdmin(ctx);
    
    // In production, reset functions should be disabled
    if (isProduction) {
      throw new Error("Reset functions are disabled in production for security reasons.");
    }
    
    // Delete all existing projects and their assets
    const allProjects = await ctx.db
      .query("projects")
      .collect();
    
    for (const project of allProjects) {
      // Delete all associated assets
      const assets = await ctx.db
        .query("assets")
        .withIndex("by_project", (q) => q.eq("projectId", project._id))
        .collect();
      
      for (const asset of assets) {
        await ctx.db.delete(asset._id);
      }
      
      // Delete the project
      await ctx.db.delete(project._id);
    }
    
    // Get client list from about section
    const about = await ctx.db
      .query("about")
      .order("desc")
      .first();
    
    const clientList = about?.clientList || [];
    
    // Default clients if list is empty or insufficient
    const defaultClients = [
      "Tech Corp", "Retail Brand", "Media House", "Fashion Magazine",
      "Creative Agency", "Ad Agency", "Architecture Firm", "Startup Co",
      "Record Label", "Private Client", "Consumer Brand", "Digital Agency"
    ];
    
    // Use client list if available, otherwise use defaults
    const clients = clientList.length >= 12 
      ? clientList.slice(0, 12) 
      : [...clientList, ...defaultClients].slice(0, 12);
    
    const now = Date.now();
    
    // Stock photo URLs for different categories (Unsplash)
    const stockPhotos = {
      design: [
        "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=1200&h=1200&fit=crop",
        "https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=1200&h=1200&fit=crop",
        "https://images.unsplash.com/photo-1586717791821-3f44a563fa4c?w=1200&h=1200&fit=crop",
        "https://images.unsplash.com/photo-1635776062043-223faf322554?w=1200&h=1200&fit=crop",
      ],
      photo: [
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=2048&h=2732&fit=crop",
        "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=2048&h=2732&fit=crop",
        "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=2048&h=2732&fit=crop",
        "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=2048&h=2732&fit=crop",
      ],
      video: [
        "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=1920&h=1080&fit=crop",
        "https://images.unsplash.com/photo-1516035069371-29a1b244b32a?w=1920&h=1080&fit=crop",
        "https://images.unsplash.com/photo-1516979187457-637abb4f9353?w=1920&h=1080&fit=crop",
        "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1920&h=1080&fit=crop",
      ],
    };
    
    // Create 3 Portfolio items (design, photo, video) with stock photos
    const portfolioDesign = await ctx.db.insert("projects", {
      title: "Design Portfolio",
      slug: "design-portfolio",
      clientName: "Design Work",
      categories: ["design"],
      status: "approved",
      notesPublic: "Showcasing exceptional design work across multiple disciplines.",
      createdAt: now,
      updatedAt: now,
    });
    
    // Add design portfolio assets
    for (let i = 0; i < stockPhotos.design.length; i++) {
      await ctx.db.insert("assets", {
        projectId: portfolioDesign,
        type: "image",
        filename: `design-portfolio-${i + 1}.jpg`,
        storageKey: stockPhotos.design[i],
        previewKey: stockPhotos.design[i],
        width: 1200,
        height: 1200,
        size: 512000,
        approved: true,
        sortOrder: i,
        createdAt: now,
      });
    }
    
    const portfolioPhoto = await ctx.db.insert("projects", {
      title: "Photography Portfolio",
      slug: "photography-portfolio",
      clientName: "Photo Work",
      categories: ["photo"],
      status: "approved",
      notesPublic: "A curated collection of professional photography work.",
      createdAt: now,
      updatedAt: now,
    });
    
    // Add photo portfolio assets
    for (let i = 0; i < stockPhotos.photo.length; i++) {
      await ctx.db.insert("assets", {
        projectId: portfolioPhoto,
        type: "image",
        filename: `photo-portfolio-${i + 1}.jpg`,
        storageKey: stockPhotos.photo[i],
        previewKey: stockPhotos.photo[i],
        width: 2048,
        height: 2732,
        size: 2048000,
        approved: true,
        sortOrder: i,
        createdAt: now,
      });
    }
    
    const portfolioVideo = await ctx.db.insert("projects", {
      title: "Video Portfolio",
      slug: "video-portfolio",
      clientName: "Video Work",
      categories: ["video"],
      status: "approved",
      notesPublic: "Dynamic video content showcasing creative storytelling.",
      createdAt: now,
      updatedAt: now,
    });
    
    // Add video portfolio assets
    for (let i = 0; i < stockPhotos.video.length; i++) {
      await ctx.db.insert("assets", {
        projectId: portfolioVideo,
        type: "image",
        filename: `video-portfolio-${i + 1}.jpg`,
        storageKey: stockPhotos.video[i],
        previewKey: stockPhotos.video[i],
        width: 1920,
        height: 1080,
        size: 2048000,
        approved: true,
        sortOrder: i,
        createdAt: now,
      });
    }
    
    // Create 12 Project examples based on client list
    const projectTemplates = [
      { title: "Brand Identity Design", slug: "brand-identity", category: "design" as const, notes: "Complete brand identity redesign and visual system." },
      { title: "Product Photography", slug: "product-photography", category: "photo" as const, notes: "High-end product photography for marketing campaigns." },
      { title: "Commercial Video Production", slug: "commercial-video", category: "video" as const, notes: "Professional commercial video production for advertising." },
      { title: "Editorial Photography", slug: "editorial-photography", category: "photo" as const, notes: "Editorial photography for print and digital publications." },
      { title: "Website Design", slug: "website-design", category: "design" as const, notes: "Modern website design with responsive interface." },
      { title: "Corporate Video", slug: "corporate-video", category: "video" as const, notes: "Corporate video content showcasing company values." },
      { title: "Portrait Photography", slug: "portrait-photography", category: "photo" as const, notes: "Professional portrait photography session." },
      { title: "Packaging Design", slug: "packaging-design", category: "design" as const, notes: "Creative packaging design for retail products." },
      { title: "Documentary Video", slug: "documentary-video", category: "video" as const, notes: "Documentary video storytelling project." },
      { title: "Architectural Photography", slug: "architectural-photography", category: "photo" as const, notes: "Architectural photography showcasing building design." },
      { title: "Logo Design Package", slug: "logo-design", category: "design" as const, notes: "Complete logo design and brand guidelines." },
      { title: "Social Media Video Content", slug: "social-media-video", category: "video" as const, notes: "Engaging video content for social media platforms." },
    ];
    
    const projectIds = [];
    for (let i = 0; i < 12; i++) {
      const template = projectTemplates[i];
      const clientName = clients[i] || `Client ${i + 1}`;
      
      const projectId = await ctx.db.insert("projects", {
        title: template.title,
        slug: `${template.slug}-${i + 1}`,
        clientName: clientName,
        categories: [template.category],
        status: "approved",
        notesPublic: template.notes,
        createdAt: now - (86400000 * (12 - i)), // Stagger creation dates
        updatedAt: now,
      });
      
      // Add stock photo assets for each project
      const photos = stockPhotos[template.category];
      for (let j = 0; j < Math.min(4, photos.length); j++) {
        await ctx.db.insert("assets", {
          projectId: projectId,
          type: "image",
          filename: `${template.slug}-${i + 1}-${j + 1}.jpg`,
          storageKey: photos[j],
          previewKey: photos[j],
          width: template.category === "design" ? 1200 : template.category === "video" ? 1920 : 2048,
          height: template.category === "design" ? 1200 : template.category === "video" ? 1080 : 2732,
          size: 2048000,
          approved: true,
          sortOrder: j,
          createdAt: now - (86400000 * (12 - i)) + (j * 3600000),
        });
      }
      
      projectIds.push(projectId);
    }
    
    // Update homepage with portfolio and project selections
    const existingHomepage = await ctx.db
      .query("homepage")
      .order("desc")
      .first();
    
    if (existingHomepage) {
      await ctx.db.patch(existingHomepage._id, {
        portfolioProjectIds: [portfolioDesign, portfolioPhoto, portfolioVideo],
        projectsProjectIds: projectIds,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("homepage", {
        portfolioProjectIds: [portfolioDesign, portfolioPhoto, portfolioVideo],
        projectsProjectIds: projectIds,
        updatedAt: now,
      });
    }
    
    return {
      portfolioIds: [portfolioDesign, portfolioPhoto, portfolioVideo],
      projectIds,
    };
  },
});

