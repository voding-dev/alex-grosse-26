import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./adminAuth";

// Check if running in production
const isProduction = process.env.NODE_ENV === "production";

// Seed portfolio items (3) and projects (12) with sample data
// DEV ONLY: This function should be disabled in production
export const seedPortfolioProjects = mutation({
  args: {},
  handler: async (ctx, args) => {
    // Require proper admin authentication
    await requireAdmin(ctx);
    
    // In production, seed functions should be disabled
    if (isProduction) {
      throw new Error("Seed functions are disabled in production for security reasons.");
    }
    
    const now = Date.now();
    
    // Create 3 Portfolio Items (Design, Photo, Video) - These are the portfolio entries
    const portfolioItems = [
      {
        title: "Design Portfolio",
        slug: "design-portfolio",
        clientName: "Portfolio Showcase",
        categories: ["design" as const],
        status: "approved" as const,
        notesPublic: "Showcase of design work including branding, graphics, and visual identity projects.",
        notesPrivate: "",
        createdAt: now - 86400000 * 3,
        updatedAt: now,
      },
      {
        title: "Photo Portfolio",
        slug: "photo-portfolio",
        clientName: "Portfolio Showcase",
        categories: ["photo" as const],
        status: "approved" as const,
        notesPublic: "Collection of photography work including portraits, events, and commercial photography.",
        notesPrivate: "",
        createdAt: now - 86400000 * 2,
        updatedAt: now,
      },
      {
        title: "Video Portfolio",
        slug: "video-portfolio",
        clientName: "Portfolio Showcase",
        categories: ["video" as const],
        status: "approved" as const,
        notesPublic: "Showcase of video production work including commercials, documentaries, and corporate videos.",
        notesPrivate: "",
        createdAt: now - 86400000,
        updatedAt: now,
      },
    ];
    
    const portfolioIds = [];
    for (const item of portfolioItems) {
      const portfolioId = await ctx.db.insert("portfolio", item);
      portfolioIds.push(portfolioId);
    }
    
    // Create 12 Projects with varied data
    const projectTemplates = [
      {
        title: "Website Redesign",
        slug: "website-redesign-client-a",
        clientName: "Client A",
        categories: ["design" as const],
        status: "approved" as const,
        notesPublic: "Complete website redesign project.",
        notesPrivate: "Client requested multiple revisions.",
      },
      {
        title: "Product Photography",
        slug: "product-photography-client-b",
        clientName: "Client B",
        categories: ["photo" as const],
        status: "approved" as const,
        notesPublic: "E-commerce product photography.",
        notesPrivate: "High volume shoot, delivered on time.",
      },
      {
        title: "Promotional Video",
        slug: "promotional-video-client-c",
        clientName: "Client C",
        categories: ["video" as const],
        status: "delivered" as const,
        notesPublic: "Promotional video for product launch.",
        notesPrivate: "Final approval received.",
      },
      {
        title: "Corporate Headshots",
        slug: "corporate-headshots-client-d",
        clientName: "Client D",
        categories: ["photo" as const],
        status: "review" as const,
        notesPublic: "Professional headshots for team.",
        notesPrivate: "Awaiting client feedback.",
      },
      {
        title: "Logo Design Package",
        slug: "logo-design-package-client-e",
        clientName: "Client E",
        categories: ["design" as const],
        status: "approved" as const,
        notesPublic: "Complete logo design and brand assets.",
        notesPrivate: "Client loved the concepts.",
      },
      {
        title: "Documentary Film",
        slug: "documentary-film-client-f",
        clientName: "Client F",
        categories: ["video" as const],
        status: "approved" as const,
        notesPublic: "Short documentary film project.",
        notesPrivate: "Long-term project completed successfully.",
      },
      {
        title: "Fashion Photography",
        slug: "fashion-photography-client-g",
        clientName: "Client G",
        categories: ["photo" as const],
        status: "delivered" as const,
        notesPublic: "Fashion editorial photography.",
        notesPrivate: "Published in magazine.",
      },
      {
        title: "Packaging Design",
        slug: "packaging-design-client-h",
        clientName: "Client H",
        categories: ["design" as const],
        status: "draft" as const,
        notesPublic: "Product packaging design.",
        notesPrivate: "Initial concepts in progress.",
      },
      {
        title: "Social Media Video Content",
        slug: "social-media-video-client-i",
        clientName: "Client I",
        categories: ["video" as const],
        status: "approved" as const,
        notesPublic: "Video content for social media campaign.",
        notesPrivate: "High engagement rates achieved.",
      },
      {
        title: "Architectural Photography",
        slug: "architectural-photography-client-j",
        clientName: "Client J",
        categories: ["photo" as const],
        status: "approved" as const,
        notesPublic: "Architectural photography for portfolio.",
        notesPrivate: "Multiple locations photographed.",
      },
      {
        title: "Brand Guidelines",
        slug: "brand-guidelines-client-k",
        clientName: "Client K",
        categories: ["design" as const],
        status: "review" as const,
        notesPublic: "Comprehensive brand guidelines document.",
        notesPrivate: "Reviewing final draft.",
      },
      {
        title: "Event Videography",
        slug: "event-videography-client-l",
        clientName: "Client L",
        categories: ["video" as const],
        status: "delivered" as const,
        notesPublic: "Corporate event videography and editing.",
        notesPrivate: "Multiple camera angles captured.",
      },
    ];
    
    const projectIds = [];
    for (let i = 0; i < projectTemplates.length; i++) {
      const template = projectTemplates[i];
      const projectId = await ctx.db.insert("projects", {
        ...template,
        createdAt: now - (86400000 * (12 - i)),
        updatedAt: now,
      });
      projectIds.push(projectId);
    }
    
    return {
      portfolioIds,
      projectIds,
      message: `Created 3 portfolio items and 12 projects successfully.`,
    };
  },
});

// Seed 12 additional projects
// DEV ONLY: This function should be disabled in production
export const seedProjects = mutation({
  args: {},
  handler: async (ctx, args) => {
    // Require proper admin authentication
    await requireAdmin(ctx);
    
    // In production, seed functions should be disabled
    if (isProduction) {
      throw new Error("Seed functions are disabled in production for security reasons.");
    }
    
    const now = Date.now();
    
    // Create 12 Projects with varied data
    const projectTemplates = [
      {
        title: "E-Commerce Photography",
        slug: "ecommerce-photography-client-m",
        clientName: "Client M",
        categories: ["photo" as const],
        status: "approved" as const,
        notesPublic: "Product photography for online store.",
        notesPrivate: "High volume shoot completed on time.",
      },
      {
        title: "Corporate Video Campaign",
        slug: "corporate-video-campaign-client-n",
        clientName: "Client N",
        categories: ["video" as const],
        status: "approved" as const,
        notesPublic: "Corporate video campaign for brand awareness.",
        notesPrivate: "Multiple locations filmed.",
      },
      {
        title: "Web Design & Development",
        slug: "web-design-development-client-o",
        clientName: "Client O",
        categories: ["design" as const],
        status: "delivered" as const,
        notesPublic: "Complete website design and development project.",
        notesPrivate: "Client very satisfied with results.",
      },
      {
        title: "Real Estate Photography",
        slug: "real-estate-photography-client-p",
        clientName: "Client P",
        categories: ["photo" as const],
        status: "approved" as const,
        notesPublic: "Professional real estate photography.",
        notesPrivate: "Multiple properties photographed.",
      },
      {
        title: "Music Video Production",
        slug: "music-video-production-client-q",
        clientName: "Client Q",
        categories: ["video" as const],
        status: "delivered" as const,
        notesPublic: "Music video production and editing.",
        notesPrivate: "Creative collaboration with artist.",
      },
      {
        title: "Brand Identity & Guidelines",
        slug: "brand-identity-guidelines-client-r",
        clientName: "Client R",
        categories: ["design" as const],
        status: "approved" as const,
        notesPublic: "Complete brand identity package.",
        notesPrivate: "Comprehensive brand guidelines delivered.",
      },
      {
        title: "Food Photography",
        slug: "food-photography-client-s",
        clientName: "Client S",
        categories: ["photo" as const],
        status: "review" as const,
        notesPublic: "Food photography for restaurant menu.",
        notesPrivate: "Awaiting final client approval.",
      },
      {
        title: "Explainer Video",
        slug: "explainer-video-client-t",
        clientName: "Client T",
        categories: ["video" as const],
        status: "approved" as const,
        notesPublic: "Animated explainer video for product launch.",
        notesPrivate: "High engagement rates on social media.",
      },
      {
        title: "Illustration & Graphics",
        slug: "illustration-graphics-client-u",
        clientName: "Client U",
        categories: ["design" as const],
        status: "draft" as const,
        notesPublic: "Custom illustrations and graphics package.",
        notesPrivate: "Initial concepts in progress.",
      },
      {
        title: "Wedding Photography",
        slug: "wedding-photography-client-v",
        clientName: "Client V",
        categories: ["photo" as const],
        status: "delivered" as const,
        notesPublic: "Wedding photography and photo album design.",
        notesPrivate: "Beautiful ceremony captured.",
      },
      {
        title: "Documentary Video Series",
        slug: "documentary-video-series-client-w",
        clientName: "Client W",
        categories: ["video" as const],
        status: "approved" as const,
        notesPublic: "Short documentary video series.",
        notesPrivate: "Multi-part series completed successfully.",
      },
      {
        title: "Print Design Package",
        slug: "print-design-package-client-x",
        clientName: "Client X",
        categories: ["design" as const],
        status: "review" as const,
        notesPublic: "Complete print design package including brochures and flyers.",
        notesPrivate: "Reviewing print proofs.",
      },
    ];
    
    const projectIds = [];
    for (let i = 0; i < projectTemplates.length; i++) {
      const template = projectTemplates[i];
      const projectId = await ctx.db.insert("projects", {
        ...template,
        createdAt: now - (86400000 * (12 - i)),
        updatedAt: now,
      });
      projectIds.push(projectId);
    }
    
    return {
      projectIds,
      message: `Created ${projectTemplates.length} projects successfully.`,
    };
  },
});

