import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./adminAuth";

// Check if running in production
const isProduction = process.env.NODE_ENV === "production";

// Seed sample client projects with linked deliveries and key moments
// DEV ONLY: This function should be disabled in production
export const seedClientProjects = mutation({
  args: {},
  handler: async (ctx, args) => {
    // Require proper admin authentication
    await requireAdmin(ctx);
    
    // In production, seed functions should be disabled
    if (isProduction) {
      throw new Error("Seed functions are disabled in production for security reasons.");
    }

    const now = Date.now();
    const email = "iancourtright@gmail.com"; // Default admin email for seed data

    // Get existing deliveries to link to projects
    const allDeliveries = await ctx.db
      .query("deliveries")
      .order("desc")
      .collect();

    if (allDeliveries.length === 0) {
      throw new Error("No deliveries found. Please seed portals first using seedPortals.");
    }

    // Project 1: Brand Campaign - Active project with linked portal and feedback
    const delivery1 = allDeliveries.find(d => d.slug === "brand-campaign-acme-final");
    const project1 = await ctx.db.insert("clientProjects", {
      title: "Brand Campaign 2024",
      clientName: "Acme Corporation",
      description: "Full brand campaign including photography, video, and design assets for the 2024 marketing push.",
      status: "in_progress",
      scope: "• Brand photography session\n• Video production (3 videos)\n• Social media assets\n• Print materials\n• Final delivery via portal",
      notes: "Client is very happy with initial deliverables. Awaiting feedback on final revisions.",
      keyMoments: [
        {
          title: "Project Kickoff",
          description: "Initial meeting with client to discuss brand vision and requirements",
          date: now - 30 * 24 * 60 * 60 * 1000, // 30 days ago
          createdAt: now - 30 * 24 * 60 * 60 * 1000,
        },
        {
          title: "Photography Session",
          description: "Brand photography shoot completed at client location",
          date: now - 20 * 24 * 60 * 60 * 1000, // 20 days ago
          createdAt: now - 20 * 24 * 60 * 60 * 1000,
        },
        {
          title: "Initial Deliverables",
          description: "First batch of assets delivered via portal for client review",
          date: now - 5 * 24 * 60 * 60 * 1000, // 5 days ago
          createdAt: now - 5 * 24 * 60 * 60 * 1000,
        },
      ],
      signOffs: [
        {
          title: "Contract Signed",
          description: "Project contract signed and approved by client",
          status: "approved",
          date: now - 35 * 24 * 60 * 60 * 1000, // 35 days ago
          createdAt: now - 35 * 24 * 60 * 60 * 1000,
        },
        {
          title: "Initial Design Approval",
          description: "Client approved initial design concepts",
          status: "approved",
          date: now - 25 * 24 * 60 * 60 * 1000, // 25 days ago
          createdAt: now - 25 * 24 * 60 * 60 * 1000,
        },
        {
          title: "Final Deliverables Approval",
          description: "Waiting for client approval on final deliverables",
          status: "pending",
          createdAt: now - 5 * 24 * 60 * 60 * 1000,
        },
      ],
      linkedDeliveryIds: delivery1 ? [delivery1._id] : [],
      modificationHistory: [],
      createdBy: undefined,
      modifiedBy: undefined,
      createdAt: now - 35 * 24 * 60 * 60 * 1000,
      updatedAt: now - 2 * 24 * 60 * 60 * 1000,
    });

    // Project 2: Product Photography - Completed project
    const delivery2 = allDeliveries.find(d => d.slug === "product-spring-collection");
    const project2 = await ctx.db.insert("clientProjects", {
      title: "Product Photography - Spring Collection",
      clientName: "Fashion Boutique Inc",
      description: "Product photography for the Spring 2024 fashion collection. Includes e-commerce and marketing images.",
      status: "completed",
      scope: "• Product photography (50 items)\n• E-commerce optimized images\n• Lifestyle shots\n• Social media assets\n• All images delivered via portal",
      notes: "Project completed successfully. All deliverables approved by client. Portal has been accessed multiple times.",
      keyMoments: [
        {
          title: "Project Start",
          description: "Initial briefing and product collection received",
          date: now - 40 * 24 * 60 * 60 * 1000, // 40 days ago
          createdAt: now - 40 * 24 * 60 * 60 * 1000,
        },
        {
          title: "Photography Complete",
          description: "All product shots completed and post-processing finished",
          date: now - 28 * 24 * 60 * 60 * 1000, // 28 days ago
          createdAt: now - 28 * 24 * 60 * 60 * 1000,
        },
        {
          title: "Final Delivery",
          description: "All images delivered via portal and approved by client",
          date: now - 27 * 24 * 60 * 60 * 1000, // 27 days ago
          createdAt: now - 27 * 24 * 60 * 60 * 1000,
        },
      ],
      signOffs: [
        {
          title: "Contract Signed",
          status: "approved",
          date: now - 42 * 24 * 60 * 60 * 1000,
          createdAt: now - 42 * 24 * 60 * 60 * 1000,
        },
        {
          title: "Final Approval",
          description: "All deliverables approved by client",
          status: "approved",
          date: now - 25 * 24 * 60 * 60 * 1000,
          createdAt: now - 25 * 24 * 60 * 60 * 1000,
        },
      ],
      linkedDeliveryIds: delivery2 ? [delivery2._id] : [],
      modificationHistory: [
        {
          field: "status",
          oldValue: "in_progress",
          newValue: "completed",
          modifiedBy: email,
          modifiedAt: now - 25 * 24 * 60 * 60 * 1000,
        },
      ],
      createdBy: email,
      modifiedBy: email,
      createdAt: now - 42 * 24 * 60 * 60 * 1000,
      updatedAt: now - 25 * 24 * 60 * 60 * 1000,
    });

    // Project 3: Corporate Video - Planning stage
    const delivery3 = allDeliveries.find(d => d.slug === "corporate-video-broll");
    const project3 = await ctx.db.insert("clientProjects", {
      title: "Corporate Video Campaign",
      clientName: "Tech Startup Co",
      description: "Complete corporate video campaign including B-roll footage, interviews, and final cut for marketing use.",
      status: "planning",
      scope: "• Video production planning\n• B-roll footage\n• Interview recordings\n• Post-production\n• Final video deliverables",
      notes: "Project in planning phase. Awaiting client confirmation on timeline and budget.",
      keyMoments: [
        {
          title: "Initial Consultation",
          description: "Discussed video requirements and production timeline with client",
          date: now - 70 * 24 * 60 * 60 * 1000, // 70 days ago
          createdAt: now - 70 * 24 * 60 * 60 * 1000,
        },
        {
          title: "B-Roll Delivered",
          description: "Initial B-roll footage delivered for client review",
          date: now - 60 * 24 * 60 * 60 * 1000, // 60 days ago
          createdAt: now - 60 * 24 * 60 * 60 * 1000,
        },
      ],
      signOffs: [
        {
          title: "Contract Signed",
          status: "approved",
          date: now - 75 * 24 * 60 * 60 * 1000,
          createdAt: now - 75 * 24 * 60 * 60 * 1000,
        },
        {
          title: "Final Video Approval",
          description: "Waiting for final video approval",
          status: "pending",
          createdAt: now - 50 * 24 * 60 * 60 * 1000,
        },
      ],
      linkedDeliveryIds: delivery3 ? [delivery3._id] : [],
      modificationHistory: [],
      createdBy: email,
      modifiedBy: email,
      createdAt: now - 75 * 24 * 60 * 60 * 1000,
      updatedAt: now - 50 * 24 * 60 * 60 * 1000,
    });

    // Project 4: Event Coverage - Review stage
    const delivery4 = allDeliveries.find(d => d.slug === "annual-conference-2024");
    const project4 = await ctx.db.insert("clientProjects", {
      title: "Annual Conference Event Coverage",
      clientName: "Business Events LLC",
      description: "Complete event coverage for the annual business conference including photography and video highlights.",
      status: "review",
      scope: "• Event photography\n• Video highlights\n• Behind-the-scenes footage\n• Social media content\n• Final deliverables via portal",
      notes: "Event coverage completed. Deliverables sent to client for review. Awaiting feedback.",
      keyMoments: [
        {
          title: "Event Day",
          description: "On-site event coverage - photography and video recording",
          date: now - 5 * 24 * 60 * 60 * 1000, // 5 days ago
          createdAt: now - 5 * 24 * 60 * 60 * 1000,
        },
        {
          title: "Post-Production Complete",
          description: "All event photos edited and video highlights prepared",
          date: now - 3 * 24 * 60 * 60 * 1000, // 3 days ago
          createdAt: now - 3 * 24 * 60 * 60 * 1000,
        },
        {
          title: "Deliverables Sent",
          description: "Event coverage delivered via portal for client review",
          date: now - 2 * 24 * 60 * 60 * 1000, // 2 days ago
          createdAt: now - 2 * 24 * 60 * 60 * 1000,
        },
      ],
      signOffs: [
        {
          title: "Event Contract Signed",
          status: "approved",
          date: now - 15 * 24 * 60 * 60 * 1000,
          createdAt: now - 15 * 24 * 60 * 60 * 1000,
        },
        {
          title: "Final Deliverables Approval",
          description: "Waiting for client approval on event coverage",
          status: "pending",
          createdAt: now - 2 * 24 * 60 * 60 * 1000,
        },
      ],
      linkedDeliveryIds: delivery4 ? [delivery4._id] : [],
      modificationHistory: [
        {
          field: "status",
          oldValue: "in_progress",
          newValue: "review",
          modifiedBy: email,
          modifiedAt: now - 2 * 24 * 60 * 60 * 1000,
        },
      ],
      createdBy: email,
      modifiedBy: email,
      createdAt: now - 15 * 24 * 60 * 60 * 1000,
      updatedAt: now - 1 * 24 * 60 * 60 * 1000,
    });

    return {
      projects: [
        {
          id: project1,
          title: "Brand Campaign 2024",
          clientName: "Acme Corporation",
          linkedDeliveries: delivery1 ? 1 : 0,
        },
        {
          id: project2,
          title: "Product Photography - Spring Collection",
          clientName: "Fashion Boutique Inc",
          linkedDeliveries: delivery2 ? 1 : 0,
        },
        {
          id: project3,
          title: "Corporate Video Campaign",
          clientName: "Tech Startup Co",
          linkedDeliveries: delivery3 ? 1 : 0,
        },
        {
          id: project4,
          title: "Annual Conference Event Coverage",
          clientName: "Business Events LLC",
          linkedDeliveries: delivery4 ? 1 : 0,
        },
      ],
      message: "Sample client projects created successfully! Each project is linked to a delivery portal. Check /admin/client-projects to see them.",
    };
  },
});



