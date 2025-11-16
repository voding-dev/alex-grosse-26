import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAdminWithSession } from "./adminAuth";

// List all media with optional filtering
export const list = query({
  args: {
    type: v.optional(v.union(v.literal("image"), v.literal("video"))),
    folder: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    search: v.optional(v.string()), // Search in filename, description
    includeAssets: v.optional(v.boolean()), // Include assets from assets table
    displayLocationType: v.optional(v.union(
      v.literal("portfolio"),
      v.literal("project"),
      v.literal("delivery"),
      v.literal("pitch_deck"),
      v.literal("quote_builder")
    )), // Filter by display location
  },
  handler: async (ctx, args) => {
    try {
      console.log("[mediaLibrary.list] Query started");
      let media = await ctx.db.query("mediaLibrary").order("desc").collect();
      console.log(`[mediaLibrary.list] Found ${media.length} media items in mediaLibrary table`);

      // Create a Set of storageKeys that already exist in media library
      // This prevents duplicates when including assets
      const existingStorageKeys = new Set(media.map((m) => m.storageKey));

      // If includeAssets is true, also fetch assets from assets table
      if (args.includeAssets) {
        try {
          console.log("[mediaLibrary.list] Fetching assets...");
          const assets = await ctx.db
            .query("assets")
            .filter((q) => 
              q.or(
                q.eq(q.field("type"), "image"),
                q.eq(q.field("type"), "video")
              )
            )
            .order("desc")
            .collect();
          console.log(`[mediaLibrary.list] Found ${assets.length} assets`);

          // Convert assets to media library format
          // Only include assets whose storageKey doesn't already exist in media library
          const assetMedia = await Promise.all(
            assets
              .filter((asset) => {
                // Filter out assets with invalid storage keys (seed data, etc.)
                const storageKey = asset.storageKey;
                if (!storageKey || 
                    storageKey.startsWith("seed-") || 
                    storageKey.startsWith("mock-") ||
                    storageKey.includes("seed-storage") ||
                    storageKey.length === 0) {
                  return false;
                }
                // Skip assets whose storageKey already exists in media library
                // This prevents duplicates - the media library entry is the source of truth
                if (existingStorageKeys.has(storageKey)) {
                  return false;
                }
                return true;
              })
              .map(async (asset) => {
                try {
                  // Build display locations with entity names
                  const displayLocations = [];
                  
                  if (asset.projectId) {
                    try {
                      const project = await ctx.db.get(asset.projectId);
                      if (project) {
                        displayLocations.push({
                          type: "project" as const,
                          entityId: asset.projectId,
                          entityName: project.title,
                        });
                      }
                    } catch (error) {
                      console.warn(`Failed to get project ${asset.projectId}:`, error);
                    }
                  }
                  if (asset.portfolioId) {
                    try {
                      const portfolio = await ctx.db.get(asset.portfolioId);
                      if (portfolio) {
                        displayLocations.push({
                          type: "portfolio" as const,
                          entityId: asset.portfolioId,
                          entityName: portfolio.title,
                        });
                      }
                    } catch (error) {
                      console.warn(`Failed to get portfolio ${asset.portfolioId}:`, error);
                    }
                  }
                  if (asset.deliveryId) {
                    try {
                      const delivery = await ctx.db.get(asset.deliveryId);
                      if (delivery) {
                        displayLocations.push({
                          type: "delivery" as const,
                          entityId: asset.deliveryId,
                          entityName: delivery.title,
                        });
                      }
                    } catch (error) {
                      console.warn(`Failed to get delivery ${asset.deliveryId}:`, error);
                    }
                  }

                  return {
                    _id: `asset_${asset._id}` as any, // Prefix to distinguish from media library IDs
                    _creationTime: asset._creationTime,
                    filename: asset.filename,
                    storageKey: asset.storageKey,
                    type: asset.type === "image" ? "image" as const : "video" as const,
                    width: asset.width,
                    height: asset.height,
                    duration: asset.duration,
                    size: asset.size,
                    canonicalUrl: undefined,
                    tags: [],
                    folder: undefined,
                    alt: undefined,
                    description: undefined,
                    sourceAssetId: asset._id,
                    sourceType: "asset" as const,
                    displayLocations,
                    createdAt: asset._creationTime,
                    updatedAt: asset._creationTime,
                  };
                } catch (error) {
                  console.error(`Error processing asset ${asset._id}:`, error);
                  // Return null for failed assets, filter them out later
                  return null;
                }
              })
          );

          // Filter out any null results from failed asset processing
          const validAssetMedia = assetMedia.filter((item) => item !== null);
          media = [...media, ...validAssetMedia];
        } catch (error) {
          console.error("Error fetching assets:", error);
          // Continue with just media library items if assets fetch fails
        }
      }

      // Filter by type
      if (args.type) {
        media = media.filter((m) => m.type === args.type);
      }

      // Filter by folder
      if (args.folder) {
        if (args.folder === "__not_in_folder__") {
          // Filter for items not in a folder (folder is undefined or empty)
          media = media.filter((m) => !m.folder || m.folder.trim() === "");
        } else {
          media = media.filter((m) => m.folder === args.folder);
        }
      }

      // Filter by tags (any matching tag)
      if (args.tags && args.tags.length > 0) {
        const hasNotTagged = args.tags.includes("__not_tagged__");
        const otherTags = args.tags.filter((tag) => tag !== "__not_tagged__");
        
        if (hasNotTagged && otherTags.length > 0) {
          // If both "not tagged" and other tags are selected, show items that are either not tagged OR have one of the other tags
          media = media.filter((m) => 
            m.tags.length === 0 || otherTags.some((tag) => m.tags.includes(tag))
          );
        } else if (hasNotTagged) {
          // Filter for items with no tags
          media = media.filter((m) => m.tags.length === 0);
        } else {
          // Filter for items with any of the selected tags
          media = media.filter((m) =>
            otherTags.some((tag) => m.tags.includes(tag))
          );
        }
      }

      // Filter by display location type
      if (args.displayLocationType) {
        media = media.filter((m) =>
          m.displayLocations.some((loc) => loc.type === args.displayLocationType)
        );
      }

      // Search in filename, description, alt
      if (args.search) {
        const searchLower = args.search.toLowerCase();
        media = media.filter(
          (m) =>
            m.filename.toLowerCase().includes(searchLower) ||
            (m.description && m.description.toLowerCase().includes(searchLower)) ||
            (m.alt && m.alt.toLowerCase().includes(searchLower))
        );
      }

      console.log(`[mediaLibrary.list] Returning ${media.length} total media items`);
      return media;
    } catch (error) {
      console.error("[mediaLibrary.list] Error in query:", error);
      console.error("[mediaLibrary.list] Error stack:", error instanceof Error ? error.stack : "No stack trace");
      // Return empty array on error instead of hanging
      return [];
    }
  },
});

// Get a single media item
export const get = query({
  args: { id: v.id("mediaLibrary") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Get multiple media items by IDs
export const getMultiple = query({
  args: { ids: v.array(v.id("mediaLibrary")) },
  handler: async (ctx, args) => {
    const media = await Promise.all(
      args.ids.map((id) => ctx.db.get(id))
    );
    return media.filter((m) => m !== null);
  },
});

// Get all unique folders
export const getFolders = query({
  handler: async (ctx) => {
    const media = await ctx.db.query("mediaLibrary").collect();
    const folders = new Set<string>();
    media.forEach((m) => {
      if (m.folder) {
        folders.add(m.folder);
      }
    });
    return Array.from(folders).sort();
  },
});

// Get all unique tags
export const getTags = query({
  handler: async (ctx) => {
    const media = await ctx.db.query("mediaLibrary").collect();
    const tags = new Set<string>();
    media.forEach((m) => {
      m.tags.forEach((tag) => tags.add(tag));
    });
    return Array.from(tags).sort();
  },
});

// Check for duplicate by file hash (query)
export const checkDuplicate = query({
  args: {
    fileHash: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("mediaLibrary")
      .withIndex("by_file_hash", (q) => q.eq("fileHash", args.fileHash))
      .first();
    return existing ? existing._id : null;
  },
});

// Check for duplicate by file hash (mutation - for use in upload flow)
export const checkDuplicateMutation = mutation({
  args: {
    sessionToken: v.optional(v.string()),
    fileHash: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAdminWithSession(ctx, args.sessionToken);
    const existing = await ctx.db
      .query("mediaLibrary")
      .withIndex("by_file_hash", (q) => q.eq("fileHash", args.fileHash))
      .first();
    return existing ? existing._id : null;
  },
});

// Create a new media item
export const create = mutation({
  args: {
    sessionToken: v.optional(v.string()),
    filename: v.string(),
    storageKey: v.string(),
    type: v.union(v.literal("image"), v.literal("video")),
    width: v.optional(v.number()),
    height: v.optional(v.number()),
    duration: v.optional(v.number()),
    size: v.number(), // Compressed size for images, original size for videos
    canonicalUrl: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    folder: v.optional(v.string()),
    alt: v.optional(v.string()),
    description: v.optional(v.string()),
    sourceAssetId: v.optional(v.id("assets")),
    sourceType: v.optional(v.union(v.literal("asset"), v.literal("upload"))),
    displayLocations: v.optional(v.array(v.object({
      type: v.union(
        v.literal("portfolio"),
        v.literal("project"),
        v.literal("delivery"),
        v.literal("pitch_deck"),
        v.literal("quote_builder"),
        v.literal("gallery"),
        v.literal("hero_carousel"),
        v.literal("about"),
        v.literal("cover"),
        v.literal("blog_cover"),
        v.literal("blog_og"),
        v.literal("blog_section"),
        v.literal("blog_gallery")
      ),
      entityId: v.string(),
      entityName: v.optional(v.string()),
    }))),
    // Compression metadata
    originalSize: v.optional(v.number()),
    compressedSize: v.optional(v.number()),
    compressionRatio: v.optional(v.number()),
    fileHash: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdminWithSession(ctx, args.sessionToken);

    const now = Date.now();
    return await ctx.db.insert("mediaLibrary", {
      filename: args.filename,
      storageKey: args.storageKey,
      type: args.type,
      width: args.width,
      height: args.height,
      duration: args.duration,
      size: args.size,
      canonicalUrl: args.canonicalUrl,
      tags: args.tags || [],
      folder: args.folder,
      alt: args.alt,
      description: args.description,
      sourceAssetId: args.sourceAssetId,
      sourceType: args.sourceType || "upload",
      displayLocations: args.displayLocations || [],
      originalSize: args.originalSize,
      compressedSize: args.compressedSize,
      compressionRatio: args.compressionRatio,
      fileHash: args.fileHash,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Update a media item
export const update = mutation({
  args: {
    sessionToken: v.optional(v.string()),
    id: v.id("mediaLibrary"),
    filename: v.optional(v.string()),
    canonicalUrl: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    folder: v.optional(v.string()),
    alt: v.optional(v.string()),
    description: v.optional(v.string()),
    storageKey: v.optional(v.string()),
    width: v.optional(v.number()),
    height: v.optional(v.number()),
    size: v.optional(v.number()),
    originalSize: v.optional(v.number()),
    compressedSize: v.optional(v.number()),
    compressionRatio: v.optional(v.number()),
    displayLocations: v.optional(v.array(v.object({
      type: v.union(
        v.literal("portfolio"),
        v.literal("project"),
        v.literal("delivery"),
        v.literal("pitch_deck"),
        v.literal("quote_builder"),
        v.literal("gallery"),
        v.literal("hero_carousel"),
        v.literal("about"),
        v.literal("cover"),
        v.literal("blog_cover"),
        v.literal("blog_og"),
        v.literal("blog_section"),
        v.literal("blog_gallery")
      ),
      entityId: v.string(),
      entityName: v.optional(v.string()),
    }))),
  },
  handler: async (ctx, args) => {
    await requireAdminWithSession(ctx, args.sessionToken);

    const { id, sessionToken: _, ...updates } = args;
    const existing = await ctx.db.get(id);
    if (!existing) {
      throw new Error("Media not found");
    }

    // If updating storageKey, check for duplicates (unless it's the same entry)
    if (updates.storageKey && updates.storageKey !== existing.storageKey) {
      const duplicate = await ctx.db
        .query("mediaLibrary")
        .filter((q) => q.eq(q.field("storageKey"), updates.storageKey))
        .filter((q) => q.neq(q.field("_id"), id))
        .first();
      
      if (duplicate) {
        throw new Error("A media library entry with this storage key already exists");
      }
    }

    // Build update object, only including defined values
    const updateObj: any = {
      updatedAt: Date.now(),
    };

    // Only include fields that are actually provided
    if (updates.filename !== undefined) updateObj.filename = updates.filename;
    if (updates.canonicalUrl !== undefined) updateObj.canonicalUrl = updates.canonicalUrl;
    if (updates.tags !== undefined) updateObj.tags = updates.tags;
    if (updates.folder !== undefined) updateObj.folder = updates.folder;
    if (updates.alt !== undefined) updateObj.alt = updates.alt;
    if (updates.description !== undefined) updateObj.description = updates.description;
    if (updates.storageKey !== undefined) updateObj.storageKey = updates.storageKey;
    if (updates.width !== undefined) updateObj.width = updates.width;
    if (updates.height !== undefined) updateObj.height = updates.height;
    if (updates.size !== undefined) updateObj.size = updates.size;
    if (updates.originalSize !== undefined) updateObj.originalSize = updates.originalSize;
    if (updates.compressedSize !== undefined) updateObj.compressedSize = updates.compressedSize;
    if (updates.compressionRatio !== undefined) updateObj.compressionRatio = updates.compressionRatio;
    if (updates.displayLocations !== undefined) updateObj.displayLocations = updates.displayLocations;

    return await ctx.db.patch(id, updateObj);
  },
});

// Import asset from assets table to media library
export const importFromAsset = mutation({
  args: {
    sessionToken: v.optional(v.string()),
    assetId: v.id("assets"),
    tags: v.optional(v.array(v.string())),
    folder: v.optional(v.string()),
    alt: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdminWithSession(ctx, args.sessionToken);

    const asset = await ctx.db.get(args.assetId);
    if (!asset) {
      throw new Error("Asset not found");
    }

    // Only import images and videos
    if (asset.type !== "image" && asset.type !== "video") {
      throw new Error("Only images and videos can be imported");
    }

    // Check if already imported
    const existing = await ctx.db
      .query("mediaLibrary")
      .withIndex("by_source_asset", (q) => q.eq("sourceAssetId", args.assetId))
      .first();

    if (existing) {
      return existing._id;
    }

    // Build display locations from asset
    const displayLocations = [];
    if (asset.projectId) {
      const project = await ctx.db.get(asset.projectId);
      displayLocations.push({
        type: "project" as const,
        entityId: asset.projectId,
        entityName: project?.title,
      });
    }
    if (asset.portfolioId) {
      const portfolio = await ctx.db.get(asset.portfolioId);
      displayLocations.push({
        type: "portfolio" as const,
        entityId: asset.portfolioId,
        entityName: portfolio?.title,
      });
    }
    if (asset.deliveryId) {
      const delivery = await ctx.db.get(asset.deliveryId);
      displayLocations.push({
        type: "delivery" as const,
        entityId: asset.deliveryId,
        entityName: delivery?.title,
      });
    }

    const now = Date.now();
    return await ctx.db.insert("mediaLibrary", {
      filename: asset.filename,
      storageKey: asset.storageKey,
      type: asset.type === "image" ? "image" : "video",
      width: asset.width,
      height: asset.height,
      duration: asset.duration,
      size: asset.size,
      canonicalUrl: undefined,
      tags: args.tags || [],
      folder: args.folder,
      alt: args.alt,
      description: args.description,
      sourceAssetId: args.assetId,
      sourceType: "asset",
      displayLocations,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Add display location to media item
export const addDisplayLocation = mutation({
  args: {
    sessionToken: v.optional(v.string()),
    id: v.id("mediaLibrary"),
    locationType: v.union(
      v.literal("portfolio"),
      v.literal("project"),
      v.literal("delivery"),
      v.literal("pitch_deck"),
      v.literal("quote_builder"),
      v.literal("gallery"),
      v.literal("hero_carousel"),
      v.literal("about"),
      v.literal("cover"),
      v.literal("blog_cover"),
      v.literal("blog_og"),
      v.literal("blog_section"),
      v.literal("blog_gallery")
    ),
    entityId: v.string(),
    entityName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdminWithSession(ctx, args.sessionToken);

    const media = await ctx.db.get(args.id);
    if (!media) {
      throw new Error("Media not found");
    }

    // Check if location already exists
    const exists = media.displayLocations.some(
      (loc) => loc.type === args.locationType && loc.entityId === args.entityId
    );

    if (exists) {
      return; // Already linked
    }

    // Add new location
    const updatedLocations = [
      ...media.displayLocations,
      {
        type: args.locationType,
        entityId: args.entityId,
        entityName: args.entityName,
      },
    ];

    await ctx.db.patch(args.id, {
      displayLocations: updatedLocations,
      updatedAt: Date.now(),
    });
  },
});

// Remove display location from media item
export const removeDisplayLocation = mutation({
  args: {
    sessionToken: v.optional(v.string()),
    id: v.id("mediaLibrary"),
    locationType: v.union(
      v.literal("portfolio"),
      v.literal("project"),
      v.literal("delivery"),
      v.literal("pitch_deck"),
      v.literal("quote_builder"),
      v.literal("gallery"),
      v.literal("hero_carousel"),
      v.literal("about"),
      v.literal("cover"),
      v.literal("blog_cover"),
      v.literal("blog_og"),
      v.literal("blog_section"),
      v.literal("blog_gallery")
    ),
    entityId: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAdminWithSession(ctx, args.sessionToken);

    const media = await ctx.db.get(args.id);
    if (!media) {
      throw new Error("Media not found");
    }

    const updatedLocations = media.displayLocations.filter(
      (loc) => !(loc.type === args.locationType && loc.entityId === args.entityId)
    );

    await ctx.db.patch(args.id, {
      displayLocations: updatedLocations,
      updatedAt: Date.now(),
    });
  },
});

// Delete a media item
export const remove = mutation({
  args: { 
    sessionToken: v.optional(v.string()),
    id: v.id("mediaLibrary") 
  },
  handler: async (ctx, args) => {
    await requireAdminWithSession(ctx, args.sessionToken);

    const media = await ctx.db.get(args.id);
    if (!media) {
      throw new Error("Media not found");
    }

    // Validate storage key before attempting deletion
    const storageKey = media.storageKey;
    if (storageKey && typeof storageKey === "string") {
      // Check for invalid storage keys (Windows paths, seed data, etc.)
      const hasBackslash = storageKey.includes("\\");
      const hasDriveLetter = /^[a-zA-Z]:/.test(storageKey);
      const hasInvalidColon = storageKey.includes(":") && !storageKey.startsWith("http://") && !storageKey.startsWith("https://");
      const isSeedData = storageKey.startsWith("seed-") || storageKey.startsWith("mock-") || storageKey.includes("seed-storage");
      const isTooShort = storageKey.length < 10;

      if (!hasBackslash && !hasDriveLetter && !hasInvalidColon && !isSeedData && !isTooShort) {
        // Valid storage key - try to delete from storage
        try {
          await ctx.storage.delete(storageKey);
        } catch (error) {
          // If storage deletion fails (e.g., file doesn't exist), log but continue
          // This allows cleanup of orphaned database records
          console.warn(`Failed to delete storage key ${storageKey}:`, error);
        }
      } else {
        // Invalid storage key - skip storage deletion but still delete the record
        console.warn(`Skipping storage deletion for invalid storage key: ${storageKey}`);
      }
    }

    // Delete the record (always delete the database record, even if storage deletion failed)
    await ctx.db.delete(args.id);
  },
});

// Bulk delete media items
export const bulkDelete = mutation({
  args: { 
    sessionToken: v.optional(v.string()),
    ids: v.array(v.id("mediaLibrary")) 
  },
  handler: async (ctx, args) => {
    await requireAdminWithSession(ctx, args.sessionToken);

    for (const id of args.ids) {
      const media = await ctx.db.get(id);
      if (media) {
        // Validate storage key before attempting deletion
        const storageKey = media.storageKey;
        if (storageKey && typeof storageKey === "string") {
          // Check for invalid storage keys (Windows paths, seed data, etc.)
          const hasBackslash = storageKey.includes("\\");
          const hasDriveLetter = /^[a-zA-Z]:/.test(storageKey);
          const hasInvalidColon = storageKey.includes(":") && !storageKey.startsWith("http://") && !storageKey.startsWith("https://");
          const isSeedData = storageKey.startsWith("seed-") || storageKey.startsWith("mock-") || storageKey.includes("seed-storage");
          const isTooShort = storageKey.length < 10;

          if (!hasBackslash && !hasDriveLetter && !hasInvalidColon && !isSeedData && !isTooShort) {
            // Valid storage key - try to delete from storage
            try {
              await ctx.storage.delete(storageKey);
            } catch (error) {
              // If storage deletion fails (e.g., file doesn't exist), log but continue
              console.warn(`Failed to delete storage key ${storageKey}:`, error);
            }
          } else {
            // Invalid storage key - skip storage deletion but still delete the record
            console.warn(`Skipping storage deletion for invalid storage key: ${storageKey}`);
          }
        }
        // Always delete the database record
        await ctx.db.delete(id);
      }
    }
  },
});

// Get uncompressed media items (for bulk deletion)
export const getUncompressedMedia = query({
  args: {},
  handler: async (ctx) => {
    // Note: This query doesn't require auth since it's just listing data
    // The actual deletion mutations require auth
    
    // Get all media items
    const allMedia = await ctx.db.query("mediaLibrary").collect();
    
    // Filter for uncompressed items (images without compression metadata)
    const uncompressed = allMedia.filter((media) => {
      // Only include images (videos don't need compression)
      if (media.type !== "image") {
        return false;
      }
      
      // Exclude items that have been compressed
      // An item is compressed if it has compressionRatio (and optionally compressedSize/originalSize)
      if (media.compressionRatio !== undefined && media.compressionRatio !== null) {
        return false;
      }
      
      // Exclude items that came from assets (imported via importFromAsset)
      // These are not directly uploaded files, so we shouldn't delete them
      if (media.sourceType === "asset") {
        return false;
      }
      
      // Exclude items with invalid storage keys (seed data, test data, etc.)
      const storageKey = media.storageKey;
      if (!storageKey || typeof storageKey !== "string") {
        return false;
      }
      
      // Check for invalid storage keys
      const hasBackslash = storageKey.includes("\\");
      const hasDriveLetter = /^[a-zA-Z]:/.test(storageKey);
      const hasInvalidColon = storageKey.includes(":") && !storageKey.startsWith("http://") && !storageKey.startsWith("https://");
      const isSeedData = storageKey.startsWith("seed-") || storageKey.startsWith("mock-") || storageKey.includes("seed-storage");
      const isTooShort = storageKey.length < 10;
      
      if (hasBackslash || hasDriveLetter || hasInvalidColon || isSeedData || isTooShort) {
        return false;
      }
      
      return true;
    });
    
    return uncompressed.map((media) => media._id);
  },
});

// Delete media items by filename (for removing specific unwanted entries)
export const deleteByFilenames = mutation({
  args: {
    sessionToken: v.optional(v.string()),
    filenames: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdminWithSession(ctx, args.sessionToken);

    const deletedMediaLibrary = [];
    const deletedAssets = [];
    const notFound = [];

    // Helper function to check if a filename matches
    const filenameMatches = (dbFilename: string, targetFilename: string): boolean => {
      // Exact match
      if (dbFilename === targetFilename) return true;
      // Starts with (for truncated display names)
      if (dbFilename.startsWith(targetFilename)) return true;
      // Match with common extensions
      if (dbFilename === targetFilename + ".jpg" || dbFilename === targetFilename + ".png") return true;
      // Match target without extension against db filename
      const targetWithoutExt = targetFilename.replace(/\.(jpg|jpeg|png|gif|webp)$/i, "");
      const dbWithoutExt = dbFilename.replace(/\.(jpg|jpeg|png|gif|webp)$/i, "");
      if (targetWithoutExt === dbWithoutExt) return true;
      return false;
    };

    // Helper function to validate and delete storage key
    const deleteStorageKeyIfValid = async (storageKey: string | undefined): Promise<void> => {
      if (!storageKey || typeof storageKey !== "string") {
        return;
      }

      // Check for invalid storage keys
      const hasBackslash = storageKey.includes("\\");
      const hasDriveLetter = /^[a-zA-Z]:/.test(storageKey);
      const hasInvalidColon = storageKey.includes(":") && !storageKey.startsWith("http://") && !storageKey.startsWith("https://");
      const isSeedData = storageKey.startsWith("seed-") || storageKey.startsWith("mock-") || storageKey.includes("seed-storage");
      const isTooShort = storageKey.length < 10;

      if (!hasBackslash && !hasDriveLetter && !hasInvalidColon && !isSeedData && !isTooShort) {
        try {
          await ctx.storage.delete(storageKey);
        } catch (error) {
          // If storage deletion fails, log but continue - we'll still delete the DB record
          console.warn(`Failed to delete storage key ${storageKey}:`, error);
        }
      } else {
        console.warn(`Skipping storage deletion for invalid storage key: ${storageKey}`);
      }
    };

    // Collect all mediaLibrary and assets once (more efficient)
    const allMediaLibrary = await ctx.db.query("mediaLibrary").collect();
    const allAssets = await ctx.db.query("assets").collect();

    // Track which filenames we've found
    const foundFilenames = new Set<string>();

    // Process mediaLibrary items
    for (const media of allMediaLibrary) {
      for (const targetFilename of args.filenames) {
        if (filenameMatches(media.filename, targetFilename)) {
          foundFilenames.add(targetFilename);
          try {
            await deleteStorageKeyIfValid(media.storageKey);
            await ctx.db.delete(media._id);
            deletedMediaLibrary.push(media.filename);
          } catch (error) {
            console.error(`Error deleting mediaLibrary item ${media._id}:`, error);
            // Continue with other items even if one fails
          }
          break; // Found a match, move to next filename
        }
      }
    }

    // Process assets (only if not already found in mediaLibrary)
    for (const asset of allAssets) {
      for (const targetFilename of args.filenames) {
        if (!foundFilenames.has(targetFilename) && filenameMatches(asset.filename, targetFilename)) {
          foundFilenames.add(targetFilename);
          try {
            await deleteStorageKeyIfValid(asset.storageKey);
            await ctx.db.delete(asset._id);
            deletedAssets.push(asset.filename);
          } catch (error) {
            console.error(`Error deleting asset ${asset._id}:`, error);
            // Continue with other items even if one fails
          }
          break; // Found a match, move to next filename
        }
      }
    }

    // Track which files were not found
    for (const filename of args.filenames) {
      if (!foundFilenames.has(filename)) {
        notFound.push(filename);
      }
    }

    return {
      deletedMediaLibrary,
      deletedAssets,
      notFound,
      totalDeleted: deletedMediaLibrary.length + deletedAssets.length,
    };
  },
});

