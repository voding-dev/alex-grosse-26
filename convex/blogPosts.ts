import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./auth";

// List blog posts with filters
export const list = query({
  args: {
    status: v.optional(v.union(
      v.literal("draft"),
      v.literal("published"),
      v.literal("scheduled"),
      v.literal("archived"),
      v.literal("all")
    )),
    categoryId: v.optional(v.id("blogCategories")),
    tag: v.optional(v.string()),
    featured: v.optional(v.boolean()),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let posts = await ctx.db
      .query("blogPosts")
      .order("desc")
      .collect();

    // Filter by status
    if (args.status && args.status !== "all") {
      posts = posts.filter((post) => post.status === args.status);
    }

    // Filter by category
    if (args.categoryId) {
      posts = posts.filter((post) => 
        post.categoryIds?.includes(args.categoryId as any)
      );
    }

    // Filter by tag
    if (args.tag) {
      posts = posts.filter((post) => 
        post.tags?.includes(args.tag as string)
      );
    }

    // Filter by featured
    if (args.featured !== undefined) {
      posts = posts.filter((post) => post.featured === args.featured);
    }

    // Filter by search
    if (args.search) {
      const searchLower = args.search.toLowerCase();
      posts = posts.filter((post) =>
        post.title.toLowerCase().includes(searchLower) ||
        post.excerpt?.toLowerCase().includes(searchLower)
      );
    }

    return posts;
  },
});

// Get published posts for public view (includes scheduled posts that should be live)
export const listPublished = query({
  args: {
    categoryId: v.optional(v.id("blogCategories")),
    tag: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    let posts = await ctx.db
      .query("blogPosts")
      .withIndex("by_status", (q) => q.eq("status", "published"))
      .order("desc")
      .collect();

    // Also get scheduled posts that should be published
    const scheduledPosts = await ctx.db
      .query("blogPosts")
      .withIndex("by_status", (q) => q.eq("status", "scheduled"))
      .collect();

    // Add scheduled posts that should be live
    const liveScheduledPosts = scheduledPosts.filter(
      (post) => post.scheduledFor && post.scheduledFor <= now
    );

    posts = [...posts, ...liveScheduledPosts];

    // Filter by category
    if (args.categoryId) {
      posts = posts.filter((post) => 
        post.categoryIds?.includes(args.categoryId as any)
      );
    }

    // Filter by tag
    if (args.tag) {
      posts = posts.filter((post) => 
        post.tags?.includes(args.tag as string)
      );
    }

    // Sort by publishedAt or scheduledFor
    posts.sort((a, b) => {
      const aDate = a.publishedAt || a.scheduledFor || a.createdAt;
      const bDate = b.publishedAt || b.scheduledFor || b.createdAt;
      return bDate - aDate;
    });

    // Apply limit
    if (args.limit) {
      posts = posts.slice(0, args.limit);
    }

    return posts;
  },
});

// Get single blog post by ID
export const get = query({
  args: { id: v.id("blogPosts") },
  handler: async (ctx, args) => {
    const post = await ctx.db.get(args.id);
    return post || null;
  },
});

// Get blog post by slug (for public pages)
export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const post = await ctx.db
      .query("blogPosts")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();

    return post || null;
  },
});

// Create new blog post
export const create = mutation({
  args: {
    title: v.string(),
    slug: v.string(),
    excerpt: v.optional(v.string()),
    status: v.optional(v.union(
      v.literal("draft"),
      v.literal("published"),
      v.literal("scheduled"),
      v.literal("archived")
    )),
    scheduledFor: v.optional(v.number()),
    featured: v.optional(v.boolean()),
    authorName: v.optional(v.string()),
    authorImageStorageId: v.optional(v.string()),
    categoryIds: v.optional(v.array(v.id("blogCategories"))),
    tags: v.optional(v.array(v.string())),
    seoTitle: v.optional(v.string()),
    seoDescription: v.optional(v.string()),
    ogImageStorageId: v.optional(v.string()),
    coverImageStorageId: v.optional(v.string()),
    email: v.optional(v.string()), // Dev mode: email for admin check
  },
  handler: async (ctx, args) => {
    const { email: adminEmail, ...data } = args;

    // Development mode: check admin by email
    if (adminEmail) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_email", (q: any) => q.eq("email", adminEmail))
        .first();

      if (!user || user.role !== "admin") {
        throw new Error("Unauthorized - admin access required");
      }
    } else {
      // Production mode: use requireAdmin
      await requireAdmin(ctx);
    }

    // Check if slug already exists
    const existing = await ctx.db
      .query("blogPosts")
      .withIndex("by_slug", (q) => q.eq("slug", data.slug))
      .first();

    if (existing) {
      throw new Error("A blog post with this slug already exists");
    }

    const now = Date.now();
    
    // Set publishedAt if status is published
    const publishedAt = data.status === "published" ? now : undefined;

    const postId = await ctx.db.insert("blogPosts", {
      ...data,
      status: data.status || "draft",
      publishedAt,
      viewCount: 0,
      createdAt: now,
      updatedAt: now,
    });

    return postId;
  },
});

// Update blog post
export const update = mutation({
  args: {
    id: v.id("blogPosts"),
    title: v.optional(v.string()),
    slug: v.optional(v.string()),
    excerpt: v.optional(v.string()),
    status: v.optional(v.union(
      v.literal("draft"),
      v.literal("published"),
      v.literal("scheduled"),
      v.literal("archived")
    )),
    scheduledFor: v.optional(v.number()),
    publishedAt: v.optional(v.number()), // Allow custom publish date
    featured: v.optional(v.boolean()),
    showCoverOnPost: v.optional(v.boolean()),
    authorName: v.optional(v.string()),
    authorImageStorageId: v.optional(v.string()),
    categoryIds: v.optional(v.array(v.id("blogCategories"))),
    tags: v.optional(v.array(v.string())),
    seoTitle: v.optional(v.string()),
    seoDescription: v.optional(v.string()),
    ogImageStorageId: v.optional(v.string()),
    coverImageStorageId: v.optional(v.string()),
    email: v.optional(v.string()), // Dev mode: email for admin check
  },
  handler: async (ctx, args) => {
    const { id, email: adminEmail, ...updates } = args;

    // Development mode: check admin by email
    if (adminEmail) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_email", (q: any) => q.eq("email", adminEmail))
        .first();

      if (!user || user.role !== "admin") {
        throw new Error("Unauthorized - admin access required");
      }
    } else {
      // Production mode: use requireAdmin
      await requireAdmin(ctx);
    }

    const post = await ctx.db.get(id);
    if (!post) {
      throw new Error("Blog post not found");
    }

    // If slug is being updated, check if it conflicts with another post
    if (updates.slug && updates.slug !== post.slug) {
      const existing = await ctx.db
        .query("blogPosts")
        .withIndex("by_slug", (q) => q.eq("slug", updates.slug as string))
        .first();

      if (existing && existing._id !== id) {
        throw new Error("A blog post with this slug already exists");
      }
    }

    const now = Date.now();

    // Auto-publish if trying to set status to scheduled but scheduled time is in the past
    if (updates.status === "scheduled" && updates.scheduledFor && updates.scheduledFor <= now) {
      const publishedAt = updates.scheduledFor;
      await ctx.db.patch(id, {
        ...updates,
        status: "published",
        publishedAt,
        updatedAt: now,
      });
      return;
    }

    // Set publishedAt
    let publishedAt = post.publishedAt;
    
    // Use custom publishedAt if provided (for backdating)
    if ("publishedAt" in updates && updates.publishedAt !== undefined) {
      publishedAt = updates.publishedAt;
    } 
    // Otherwise, set to now if status is changing to published
    else if (updates.status === "published" && post.status !== "published") {
      publishedAt = now;
    }

    // Build patch data
    const patchData: any = {
      ...updates,
      publishedAt,
      updatedAt: now,
    };

    // Handle explicit field removal
    // When undefined is passed, we want to actually remove the field from the document
    if ("coverImageStorageId" in args) {
      patchData.coverImageStorageId = args.coverImageStorageId;
    }
    if ("ogImageStorageId" in args) {
      patchData.ogImageStorageId = args.ogImageStorageId;
    }
    if ("authorImageStorageId" in args) {
      patchData.authorImageStorageId = args.authorImageStorageId;
    }

    await ctx.db.patch(id, patchData);
  },
});

// Delete blog post (and all its sections)
export const remove = mutation({
  args: {
    id: v.id("blogPosts"),
    email: v.optional(v.string()), // Dev mode: email for admin check
  },
  handler: async (ctx, args) => {
    const { email: adminEmail } = args;

    // Development mode: check admin by email
    if (adminEmail) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_email", (q: any) => q.eq("email", adminEmail))
        .first();

      if (!user || user.role !== "admin") {
        throw new Error("Unauthorized - admin access required");
      }
    } else {
      // Production mode: use requireAdmin
      await requireAdmin(ctx);
    }

    // Delete all sections for this post
    const sections = await ctx.db
      .query("blogPostSections")
      .withIndex("by_blog_post", (q) => q.eq("blogPostId", args.id))
      .collect();

    for (const section of sections) {
      await ctx.db.delete(section._id);
    }

    // Delete the post
    await ctx.db.delete(args.id);
  },
});

// Increment view count
export const incrementViewCount = mutation({
  args: { id: v.id("blogPosts") },
  handler: async (ctx, args) => {
    const post = await ctx.db.get(args.id);
    if (!post) {
      throw new Error("Blog post not found");
    }

    await ctx.db.patch(args.id, {
      viewCount: (post.viewCount || 0) + 1,
    });
  },
});

// Increment like count for a blog post
export const incrementLikeCount = mutation({
  args: { id: v.id("blogPosts") },
  handler: async (ctx, args) => {
    const post = await ctx.db.get(args.id);
    if (!post) {
      throw new Error("Blog post not found");
    }

    await ctx.db.patch(args.id, {
      likeCount: (post.likeCount || 0) + 1,
    });
    
    return (post.likeCount || 0) + 1;
  },
});

// Get stats for dashboard
export const getStats = query({
  handler: async (ctx) => {
    const allPosts = await ctx.db.query("blogPosts").collect();

    const stats = {
      total: allPosts.length,
      published: allPosts.filter((p) => p.status === "published").length,
      drafts: allPosts.filter((p) => p.status === "draft").length,
      scheduled: allPosts.filter((p) => p.status === "scheduled").length,
      archived: allPosts.filter((p) => p.status === "archived").length,
    };

    return stats;
  },
});

// Internal mutation: Automatically publish scheduled posts (called by cron)
export const publishScheduledPosts = internalMutation({
  handler: async (ctx) => {
    // Get site timezone from settings (default to America/New_York = EST)
    const timezoneSetting = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", "siteTimezone"))
      .first();
    
    const siteTimezone = (timezoneSetting?.value as string) || "America/New_York";
    
    // Get current time in UTC
    const now = Date.now();
    
    // Find all scheduled posts that should be published
    const scheduledPosts = await ctx.db
      .query("blogPosts")
      .withIndex("by_status", (q) => q.eq("status", "scheduled"))
      .collect();
    
    // Filter posts that should be published now
    // Note: scheduledFor is already stored as UTC timestamp representing the scheduled time in site timezone
    const postsToPublish = scheduledPosts.filter(
      (post) => post.scheduledFor && post.scheduledFor <= now
    );
    
    // Update each post to published status
    for (const post of postsToPublish) {
      await ctx.db.patch(post._id, {
        status: "published",
        publishedAt: post.scheduledFor || now,
        updatedAt: now,
      });
    }
    
    // Return count of published posts (for logging)
    return {
      published: postsToPublish.length,
      timezone: siteTimezone,
      currentTime: now,
      posts: postsToPublish.map(p => ({ id: p._id, title: p.title, scheduledFor: p.scheduledFor })),
    };
  },
});

