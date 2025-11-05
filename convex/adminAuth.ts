/**
 * Shared admin authentication utility
 * Consolidates all requireAdmin functions to eliminate duplication
 * 
 * Supports both Convex auth (preferred) and session-based auth (legacy)
 * 
 * Note: Admin emails are configured via environment variables or database settings.
 * For Convex functions, environment variables should be set via Convex dashboard.
 * For Node.js actions, environment variables work as usual.
 */

// Get allowed admin emails from database settings or environment
// Falls back to empty array if not configured (must be configured in production)
async function getAllowedAdminEmails(ctx: any): Promise<string[]> {
  // Try to get from database settings first (for Convex functions)
  try {
    const setting = await ctx.db
      .query("settings")
      .withIndex("by_key", (q: any) => q.eq("key", "allowedAdminEmails"))
      .first();
    
    if (setting && setting.value) {
      const emails = Array.isArray(setting.value) 
        ? setting.value 
        : typeof setting.value === "string"
        ? setting.value.split(",").map((e: string) => e.trim().toLowerCase())
        : [];
      if (emails.length > 0) {
        return emails;
      }
    }
  } catch (e) {
    // Settings query failed, continue to environment variable check
  }
  
  // Fallback to environment variable (works for Node.js actions)
  // For Convex functions, this will be undefined unless set via Convex dashboard
  if (typeof process !== "undefined" && process.env?.ALLOWED_ADMIN_EMAILS) {
    return process.env.ALLOWED_ADMIN_EMAILS.split(",").map(email => email.trim().toLowerCase());
  }
  
  // Return empty array if not configured
  // In production, this should always be configured
  return [];
}

// Get primary email from database settings or environment
async function getPrimaryEmail(ctx: any): Promise<string | null> {
  // Try to get from database settings first
  try {
    const setting = await ctx.db
      .query("settings")
      .withIndex("by_key", (q: any) => q.eq("key", "primaryAdminEmail"))
      .first();
    
    if (setting && setting.value) {
      return typeof setting.value === "string" ? setting.value.trim().toLowerCase() : null;
    }
  } catch (e) {
    // Settings query failed, continue to environment variable check
  }
  
  // Fallback to environment variable
  if (typeof process !== "undefined" && process.env?.PRIMARY_ADMIN_EMAIL) {
    return process.env.PRIMARY_ADMIN_EMAIL.trim().toLowerCase();
  }
  
  return null;
}

/**
 * Require admin access using Convex auth (preferred method)
 * Throws an error if the user is not authenticated or not an admin
 * 
 * @param ctx - Convex context
 * @returns The authenticated admin user
 */
export async function requireAdmin(ctx: any) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Not authenticated");
  }

  const user = await ctx.db
    .query("users")
    .withIndex("by_email", (q: any) => q.eq("email", identity.email!))
    .first();

  if (!user || user.role !== "admin") {
    throw new Error("Unauthorized - admin access required");
  }

  return user;
}

/**
 * Require admin access using session token (legacy method)
 * This is used for backward compatibility with session-based auth
 * 
 * @param ctx - Convex context
 * @param sessionToken - Optional session token for session-based auth
 * @returns The authenticated admin user
 */
export async function requireAdminWithSession(ctx: any, sessionToken?: string) {
  if (sessionToken) {
    // Use session token authentication
    const session = await ctx.db
      .query("adminSessions")
      .withIndex("by_token", (q: any) => q.eq("token", sessionToken))
      .first();

    if (!session) {
      throw new Error("Not authenticated");
    }

    if (session.expiresAt < Date.now()) {
      throw new Error("Not authenticated - session expired");
    }

    // Check if email is in allowed list (from database settings or environment)
    const allowedEmails = await getAllowedAdminEmails(ctx);
    if (allowedEmails.length > 0 && !allowedEmails.includes(session.email)) {
      throw new Error("Not authenticated - email not authorized");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q: any) => q.eq("email", session.email))
      .first();

    if (!user || user.role !== "admin") {
      throw new Error("Unauthorized - admin access required");
    }

    return user;
  }

  // Fallback to Convex auth if no session token provided
  return await requireAdmin(ctx);
}

/**
 * Check if an email is in the allowed admin emails list
 * Used for validation during login/password reset
 * 
 * @param ctx - Convex context
 * @param email - Email to check
 * @returns True if email is allowed, false otherwise
 */
export async function isAllowedAdminEmail(ctx: any, email: string): Promise<boolean> {
  const allowedEmails = await getAllowedAdminEmails(ctx);
  if (allowedEmails.length === 0) {
    // If no emails configured, allow any (for development only)
    // In production, this should always be configured
    return true;
  }
  return allowedEmails.includes(email.trim().toLowerCase());
}

/**
 * Get the primary admin email
 * Used for password reset restrictions
 * 
 * @param ctx - Convex context
 * @returns Primary admin email or null if not configured
 */
export async function getPrimaryAdminEmail(ctx: any): Promise<string | null> {
  return await getPrimaryEmail(ctx);
}

