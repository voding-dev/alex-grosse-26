import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// ============ Industries ============

export const industriesList = query({
  handler: async (ctx) => {
    return await ctx.db
      .query("prospectIndustries")
      .order("desc")
      .collect();
  },
});

export const industriesCreate = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("prospectIndustries", {
      name: args.name,
      description: args.description,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const industriesUpdate = mutation({
  args: {
    id: v.id("prospectIndustries"),
    name: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      name: args.name,
      description: args.description,
      updatedAt: Date.now(),
    });
  },
});

export const industriesRemove = mutation({
  args: { id: v.id("prospectIndustries") },
  handler: async (ctx, args) => {
    // Check if any searches use this industry
    const searches = await ctx.db
      .query("prospectSearches")
      .withIndex("by_industry", (q) => q.eq("industryId", args.id))
      .collect();
    
    if (searches.length > 0) {
      throw new Error("Cannot delete industry: it is being used by searches");
    }
    
    await ctx.db.delete(args.id);
  },
});

// ============ Searches ============

export const searchesList = query({
  args: {
    industryId: v.optional(v.id("prospectIndustries")),
    city: v.optional(v.string()),
    state: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let searches;
    
    if (args.industryId) {
      searches = await ctx.db
        .query("prospectSearches")
        .withIndex("by_industry", (q) => q.eq("industryId", args.industryId!))
        .order("desc")
        .collect();
    } else if (args.city && args.state) {
      searches = await ctx.db
        .query("prospectSearches")
        .withIndex("by_city_state", (q) => 
          q.eq("city", args.city!).eq("state", args.state!)
        )
        .order("desc")
        .collect();
    } else {
      searches = await ctx.db
        .query("prospectSearches")
        .withIndex("by_created_at")
        .order("desc")
        .collect();
    }
    
    // Populate industry names
    return await Promise.all(
      searches.map(async (search) => {
        const industry = await ctx.db.get(search.industryId);
        const prospectCount = await ctx.db
          .query("prospects")
          .withIndex("by_search", (q) => q.eq("searchId", search._id))
          .collect();
        
        return {
          ...search,
          industryName: industry?.name || "Unknown",
          prospectCount: prospectCount.length,
        };
      })
    );
  },
});

export const searchesGet = query({
  args: { id: v.id("prospectSearches") },
  handler: async (ctx, args) => {
    const search = await ctx.db.get(args.id);
    if (!search) return null;
    
    const industry = await ctx.db.get(search.industryId);
    return {
      ...search,
      industryName: industry?.name || "Unknown",
    };
  },
});

export const searchesCreate = mutation({
  args: {
    name: v.string(),
    city: v.string(),
    state: v.string(),
    industryId: v.id("prospectIndustries"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("prospectSearches", {
      name: args.name,
      city: args.city,
      state: args.state,
      industryId: args.industryId,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const searchesUpdate = mutation({
  args: {
    id: v.id("prospectSearches"),
    name: v.optional(v.string()),
    city: v.optional(v.string()),
    state: v.optional(v.string()),
    industryId: v.optional(v.id("prospectIndustries")),
  },
  handler: async (ctx, args) => {
    const update: any = { updatedAt: Date.now() };
    if (args.name !== undefined) update.name = args.name;
    if (args.city !== undefined) update.city = args.city;
    if (args.state !== undefined) update.state = args.state;
    if (args.industryId !== undefined) update.industryId = args.industryId;
    
    await ctx.db.patch(args.id, update);
  },
});

export const searchesRemove = mutation({
  args: { id: v.id("prospectSearches") },
  handler: async (ctx, args) => {
    // Delete all prospects in this search
    const prospects = await ctx.db
      .query("prospects")
      .withIndex("by_search", (q) => q.eq("searchId", args.id))
      .collect();
    
    for (const prospect of prospects) {
      await ctx.db.delete(prospect._id);
    }
    
    await ctx.db.delete(args.id);
  },
});

// ============ Prospects ============

export const prospectsList = query({
  args: {
    searchId: v.optional(v.id("prospectSearches")),
    minScore: v.optional(v.number()),
    maxScore: v.optional(v.number()),
    tags: v.optional(v.array(v.string())),
    city: v.optional(v.string()),
    state: v.optional(v.string()),
    industryId: v.optional(v.id("prospectIndustries")),
    sortBy: v.optional(v.union(v.literal("score"), v.literal("name"), v.literal("createdAt"), v.literal("city"), v.literal("state"), v.literal("industry"))),
    sortOrder: v.optional(v.union(v.literal("asc"), v.literal("desc"))),
  },
  handler: async (ctx, args) => {
    let prospects;
    
    if (args.searchId) {
      prospects = await ctx.db
        .query("prospects")
        .withIndex("by_search", (q) => q.eq("searchId", args.searchId!))
        .order("desc")
        .collect();
    } else {
      prospects = await ctx.db
        .query("prospects")
        .withIndex("by_created_at")
        .order("desc")
        .collect();
    }
    
    // Filter by score
    if (args.minScore !== undefined) {
      prospects = prospects.filter((p) => (p.score || 0) >= args.minScore!);
    }
    if (args.maxScore !== undefined) {
      prospects = prospects.filter((p) => (p.score || 0) <= args.maxScore!);
    }
    
    // Filter by tags
    if (args.tags && args.tags.length > 0) {
      prospects = prospects.filter((p) =>
        args.tags!.some((tag) => p.tags.includes(tag))
      );
    }
    
    // Populate search info first (needed for filtering and sorting)
    const prospectsWithSearchInfo = await Promise.all(
      prospects.map(async (prospect) => {
        const search = await ctx.db.get(prospect.searchId);
        const industry = search ? await ctx.db.get(search.industryId) : null;
        
        return {
          ...prospect,
          searchName: search?.name,
          city: search?.city || "",
          state: search?.state || "",
          industryName: industry?.name || "",
          industryId: search?.industryId,
        };
      })
    );
    
    // Filter by city, state, and industry
    let filtered = prospectsWithSearchInfo;
    
    if (args.city) {
      filtered = filtered.filter((p) => 
        p.city?.toLowerCase() === args.city!.toLowerCase()
      );
    }
    
    if (args.state) {
      filtered = filtered.filter((p) => 
        p.state?.toUpperCase() === args.state!.toUpperCase()
      );
    }
    
    if (args.industryId) {
      filtered = filtered.filter((p) => 
        p.industryId === args.industryId
      );
    }
    
    // Sort
    const sortBy = args.sortBy || "createdAt";
    const sortOrder = args.sortOrder || "desc";
    
    filtered.sort((a, b) => {
      let aVal: any;
      let bVal: any;
      
      if (sortBy === "score") {
        aVal = a.score || 0;
        bVal = b.score || 0;
      } else if (sortBy === "name") {
        aVal = a.name.toLowerCase();
        bVal = b.name.toLowerCase();
      } else if (sortBy === "city") {
        aVal = (a.city || "").toLowerCase();
        bVal = (b.city || "").toLowerCase();
      } else if (sortBy === "state") {
        aVal = (a.state || "").toUpperCase();
        bVal = (b.state || "").toUpperCase();
      } else if (sortBy === "industry") {
        aVal = (a.industryName || "").toLowerCase();
        bVal = (b.industryName || "").toLowerCase();
      } else {
        aVal = a.createdAt;
        bVal = b.createdAt;
      }
      
      if (sortOrder === "asc") {
        return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      } else {
        return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
      }
    });
    
    return filtered;
  },
});

export const prospectsGet = query({
  args: { id: v.id("prospects") },
  handler: async (ctx, args) => {
    const prospect = await ctx.db.get(args.id);
    if (!prospect) return null;
    
    const search = await ctx.db.get(prospect.searchId);
    const industry = search ? await ctx.db.get(search.industryId) : null;
    
    return {
      ...prospect,
      searchName: search?.name,
      city: search?.city,
      state: search?.state,
      industryName: industry?.name,
    };
  },
});

export const prospectsCreate = mutation({
  args: {
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
    emails: v.array(v.string()),
    googleBusinessLink: v.optional(v.string()),
    notes: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    // Calculate score using automated hardcoded scoring
    const { score, breakdown } = calculateAutomatedScore(args);
    
    return await ctx.db.insert("prospects", {
      searchId: args.searchId,
      name: args.name,
      address: args.address,
      website: args.website,
      phone: args.phone,
      instagram: args.instagram,
      facebook: args.facebook,
      youtube: args.youtube,
      twitter: args.twitter,
      linkedin: args.linkedin,
      emails: args.emails,
      googleBusinessLink: args.googleBusinessLink,
      score,
      scoreBreakdown: breakdown,
      notes: args.notes,
      tags: args.tags || [],
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const prospectsBulkCreate = mutation({
  args: {
    searchId: v.id("prospectSearches"),
    prospects: v.array(v.object({
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
    })),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    const inserted = [];
    
    for (const prospectData of args.prospects) {
      // Calculate score using automated hardcoded scoring
      const { score, breakdown } = calculateAutomatedScore(prospectData);
      
      const id = await ctx.db.insert("prospects", {
        searchId: args.searchId,
        name: prospectData.name,
        address: prospectData.address,
        website: prospectData.website,
        phone: prospectData.phone,
        instagram: prospectData.instagram,
        facebook: prospectData.facebook,
        youtube: prospectData.youtube,
        twitter: prospectData.twitter,
        linkedin: prospectData.linkedin,
        emails: prospectData.emails,
        googleBusinessLink: prospectData.googleBusinessLink,
        score,
        scoreBreakdown: breakdown,
        tags: [],
        createdAt: now,
        updatedAt: now,
      });
      
      inserted.push(id);
    }
    
    return { count: inserted.length, ids: inserted };
  },
});

export const prospectsUpdate = mutation({
  args: {
    id: v.id("prospects"),
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
    notes: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    recalculateScore: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const prospect = await ctx.db.get(args.id);
    if (!prospect) throw new Error("Prospect not found");
    
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
    if (args.notes !== undefined) update.notes = args.notes;
    if (args.tags !== undefined) update.tags = args.tags;
    
    // Recalculate score if requested or if relevant fields changed
    if (args.recalculateScore || 
        args.website !== undefined || 
        args.phone !== undefined ||
        args.instagram !== undefined ||
        args.facebook !== undefined ||
        args.youtube !== undefined ||
        args.twitter !== undefined ||
        args.linkedin !== undefined ||
        args.emails !== undefined ||
        args.googleBusinessLink !== undefined) {
      const prospectData = {
        ...prospect,
        ...update,
      };
      
      // Calculate score using automated hardcoded scoring
      const { score, breakdown } = calculateAutomatedScore(prospectData);
      update.score = score;
      update.scoreBreakdown = breakdown;
    }
    
    await ctx.db.patch(args.id, update);
  },
});

export const prospectsRemove = mutation({
  args: { id: v.id("prospects") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

export const prospectsBulkRemove = mutation({
  args: { ids: v.array(v.id("prospects")) },
  handler: async (ctx, args) => {
    for (const id of args.ids) {
      await ctx.db.delete(id);
    }
    return { count: args.ids.length };
  },
});

// ============ Scoring Criteria ============
// Scoring criteria functions removed - scoring is now automated and hardcoded

// ============ Score Calculation ============

// Hardcoded automated scoring based on prospect fields
function calculateAutomatedScore(prospect: any): { score: number; breakdown: any } {
  let totalScore = 0;
  const breakdown: any = {};
  
  // Has Website: +10 points
  if (prospect.website && prospect.website.trim() !== "") {
    totalScore += 10;
    breakdown.hasWebsite = { points: 10, matched: true };
  } else {
    breakdown.hasWebsite = { points: 0, matched: false };
  }
  
  // Has Phone: +5 points
  if (prospect.phone && prospect.phone.trim() !== "") {
    totalScore += 5;
    breakdown.hasPhone = { points: 5, matched: true };
  } else {
    breakdown.hasPhone = { points: 0, matched: false };
  }
  
  // Has Emails: +10 points (1+ email)
  if (prospect.emails && Array.isArray(prospect.emails) && prospect.emails.length > 0) {
    totalScore += 10;
    breakdown.hasEmails = { points: 10, matched: true, count: prospect.emails.length };
  } else {
    breakdown.hasEmails = { points: 0, matched: false };
  }
  
  // Has Instagram: +5 points
  if (prospect.instagram && prospect.instagram.trim() !== "") {
    totalScore += 5;
    breakdown.hasInstagram = { points: 5, matched: true };
  } else {
    breakdown.hasInstagram = { points: 0, matched: false };
  }
  
  // Has Facebook: +5 points
  if (prospect.facebook && prospect.facebook.trim() !== "") {
    totalScore += 5;
    breakdown.hasFacebook = { points: 5, matched: true };
  } else {
    breakdown.hasFacebook = { points: 0, matched: false };
  }
  
  // Has YouTube: +5 points
  if (prospect.youtube && prospect.youtube.trim() !== "") {
    totalScore += 5;
    breakdown.hasYouTube = { points: 5, matched: true };
  } else {
    breakdown.hasYouTube = { points: 0, matched: false };
  }
  
  // Has Twitter: +5 points
  if (prospect.twitter && prospect.twitter.trim() !== "") {
    totalScore += 5;
    breakdown.hasTwitter = { points: 5, matched: true };
  } else {
    breakdown.hasTwitter = { points: 0, matched: false };
  }
  
  // Has LinkedIn: +10 points
  if (prospect.linkedin && prospect.linkedin.trim() !== "") {
    totalScore += 10;
    breakdown.hasLinkedIn = { points: 10, matched: true };
  } else {
    breakdown.hasLinkedIn = { points: 0, matched: false };
  }
  
  // Has Google Business Link: +10 points
  if (prospect.googleBusinessLink && prospect.googleBusinessLink.trim() !== "") {
    totalScore += 10;
    breakdown.hasGoogleBusiness = { points: 10, matched: true };
  } else {
    breakdown.hasGoogleBusiness = { points: 0, matched: false };
  }
  
  // Multiple social platforms bonus: +5 points (3+ platforms)
  const socialPlatforms = [
    prospect.instagram,
    prospect.facebook,
    prospect.youtube,
    prospect.twitter,
    prospect.linkedin,
  ].filter(p => p && p.trim() !== "").length;
  
  if (socialPlatforms >= 3) {
    totalScore += 5;
    breakdown.multipleSocialPlatforms = { points: 5, matched: true, count: socialPlatforms };
  } else {
    breakdown.multipleSocialPlatforms = { points: 0, matched: false, count: socialPlatforms };
  }
  
  return { score: totalScore, breakdown };
}

// Legacy function for backward compatibility (uses customizable criteria)
function calculateScore(
  prospect: any,
  criteria: any[]
): { score: number; breakdown: any } {
  let totalScore = 0;
  const breakdown: any = {};
  
  for (const criterion of criteria) {
    const fieldValue = prospect[criterion.field];
    let matches = false;
    
    switch (criterion.condition) {
      case "exists":
        matches = fieldValue !== undefined && fieldValue !== null && fieldValue !== "";
        if (Array.isArray(fieldValue)) {
          matches = fieldValue.length > 0;
        }
        break;
      case "not_exists":
        matches = fieldValue === undefined || fieldValue === null || fieldValue === "";
        if (Array.isArray(fieldValue)) {
          matches = fieldValue.length === 0;
        }
        break;
      case "contains":
        if (typeof fieldValue === "string") {
          matches = fieldValue.toLowerCase().includes(
            String(criterion.value).toLowerCase()
          );
        }
        break;
      case "greater_than":
        if (typeof fieldValue === "number" && typeof criterion.value === "number") {
          matches = fieldValue > criterion.value;
        }
        break;
      case "less_than":
        if (typeof fieldValue === "number" && typeof criterion.value === "number") {
          matches = fieldValue < criterion.value;
        }
        break;
      case "equals":
        matches = fieldValue === criterion.value;
        break;
      case "array_length_greater_than":
        if (Array.isArray(fieldValue) && typeof criterion.value === "number") {
          matches = fieldValue.length > criterion.value;
        }
        break;
    }
    
    if (matches) {
      totalScore += criterion.points;
      breakdown[criterion.name] = {
        points: criterion.points,
        matched: true,
      };
    } else {
      breakdown[criterion.name] = {
        points: 0,
        matched: false,
      };
    }
  }
  
  return { score: totalScore, breakdown };
}

// Recalculate scores for all prospects using automated hardcoded scoring
export const prospectsRecalculateAllScores = mutation({
  handler: async (ctx) => {
    const prospects = await ctx.db.query("prospects").collect();
    
    let updated = 0;
    for (const prospect of prospects) {
      // Calculate score using automated hardcoded scoring
      const { score, breakdown } = calculateAutomatedScore(prospect);
      await ctx.db.patch(prospect._id, {
        score,
        scoreBreakdown: breakdown,
        updatedAt: Date.now(),
      });
      updated++;
    }
    
    return { updated };
  },
});

