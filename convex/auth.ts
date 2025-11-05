import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { isAllowedAdminEmail, getPrimaryAdminEmail } from "./adminAuth";
const bcrypt = require("bcryptjs");

// Helper to get allowed admin emails (for ensureAdminAuth)
// Note: This is a temporary helper until we can fully migrate to adminAuth
async function getAllowedAdminEmails(ctx: any): Promise<string[]> {
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
    // Settings query failed
  }
  
  // Fallback to empty array
  return [];
}

// Generate secure random password for initial setup
function generateSecurePassword(): string {
  // Generate a random password using Math.random() (works in Convex environment)
  // This is only used during initial setup when no password is configured
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
  let password = "";
  for (let i = 0; i < 32; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

// Generate secure session token
function generateSessionToken(): string {
  // Use timestamp + multiple random strings for security
  return `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

// Initialize admin auth if it doesn't exist
async function ensureAdminAuth(ctx: any) {
  const existing = await ctx.db
    .query("adminAuth")
    .first();
  
  if (!existing) {
    // Generate a secure random password for initial setup
    // This password should be changed immediately via password reset
    // In production, admin should set password via password reset flow
    const initialPassword = generateSecurePassword();
    const passwordHash = bcrypt.hashSync(initialPassword, 10);
    
    const primaryEmail = await getPrimaryAdminEmail(ctx);
    const allowedEmails = await getAllowedAdminEmails(ctx);
    
    await ctx.db.insert("adminAuth", {
      passwordHash,
      primaryEmail: primaryEmail || "",
      allowedEmails,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    
    // Log the initial password in development only (for setup purposes)
    // In production, this should be handled via secure password reset flow
    if (process.env.NODE_ENV !== "production") {
      console.warn("Initial admin password generated. Please reset via password reset flow.");
      console.warn("Initial password (DEV ONLY):", initialPassword);
    }
    
    return passwordHash;
  }
  
  return existing.passwordHash;
}

// Get current user by session token
export const getCurrentUser = query({
  args: { sessionToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (!args.sessionToken) {
      return null;
    }

    // Find session
    const session = await ctx.db
      .query("adminSessions")
      .withIndex("by_token", (q: any) => q.eq("token", args.sessionToken!))
      .first();

    if (!session) {
      return null;
    }

    // Check if session is expired (don't delete in query, just return null)
    if (session.expiresAt < Date.now()) {
      return null;
    }

    // Verify email is allowed
    if (!(await isAllowedAdminEmail(ctx, session.email))) {
      return null;
    }

    // Get user record
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q: any) => q.eq("email", session.email))
      .first();

    // Return user only if it exists and is admin
    if (user && user.role === "admin") {
      return user;
    }

    return null;
  },
});

// Login with email and password
export const login = mutation({
  args: {
    email: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    // Normalize email
    const email = args.email.trim().toLowerCase();

    // Check if email is allowed
    if (!(await isAllowedAdminEmail(ctx, email))) {
      throw new Error("Unauthorized email address");
    }

    // Get admin auth
    const adminAuth = await ctx.db
      .query("adminAuth")
      .first();
    
    if (!adminAuth || !adminAuth.passwordHash || adminAuth.passwordHash === "") {
      throw new Error("Invalid email or password");
    }

    // Verify password
    const passwordMatch = bcrypt.compareSync(args.password, adminAuth.passwordHash);
    
    if (!passwordMatch) {
      throw new Error("Invalid email or password");
    }

    // Create or update user record
    let user = await ctx.db
      .query("users")
      .withIndex("by_email", (q: any) => q.eq("email", email))
      .first();

    if (!user) {
      // Create user record if it doesn't exist
      await ctx.db.insert("users", {
        name: email.split("@")[0],
        email: email,
        role: "admin",
        createdAt: Date.now(),
      });
    } else if (user.role !== "admin") {
      // Update to admin if not already
      await ctx.db.patch(user._id, { role: "admin" });
    }

    // Create session (expires in 30 days)
    const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000;
    const sessionToken = generateSessionToken();
    
    await ctx.db.insert("adminSessions", {
      token: sessionToken,
      email: email,
      expiresAt,
      createdAt: Date.now(),
    });

    // Clean up old expired sessions for this email
    const oldSessions = await ctx.db
      .query("adminSessions")
      .withIndex("by_email", (q: any) => q.eq("email", email))
      .collect();
    
    for (const session of oldSessions) {
      if (session.expiresAt < Date.now()) {
        await ctx.db.delete(session._id);
      }
    }

    return {
      success: true,
      sessionToken,
      email,
    };
  },
});

// Reset password (only from primary email)
export const resetPassword = mutation({
  args: {
    email: v.string(),
    currentPassword: v.string(),
    newPassword: v.string(),
  },
  handler: async (ctx, args) => {
    const email = args.email.trim().toLowerCase();

    // Only allow password reset from primary email
    const primaryEmail = await getPrimaryAdminEmail(ctx);
    if (!primaryEmail || email !== primaryEmail) {
      throw new Error("Password reset is only available from the primary email address");
    }

    // Get admin auth
    const adminAuth = await ctx.db
      .query("adminAuth")
      .first();
    
    if (!adminAuth) {
      await ensureAdminAuth(ctx);
      throw new Error("Admin authentication not initialized");
    }

    // Verify current password
    const passwordMatch = bcrypt.compareSync(args.currentPassword, adminAuth.passwordHash);
    
    if (!passwordMatch) {
      throw new Error("Current password is incorrect");
    }

    // Validate new password
    if (args.newPassword.length < 8) {
      throw new Error("New password must be at least 8 characters long");
    }

    // Hash new password
    const newPasswordHash = bcrypt.hashSync(args.newPassword, 10);

    // Update password
    await ctx.db.patch(adminAuth._id, {
      passwordHash: newPasswordHash,
      updatedAt: Date.now(),
    });

    // Invalidate all existing sessions (force re-login)
    const allSessions = await ctx.db
      .query("adminSessions")
      .collect();
    
    for (const session of allSessions) {
      await ctx.db.delete(session._id);
    }

    return {
      success: true,
      message: "Password updated successfully. Please log in again.",
    };
  },
});

// Logout (invalidate session)
export const logout = mutation({
  args: {
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("adminSessions")
      .withIndex("by_token", (q: any) => q.eq("token", args.sessionToken))
      .first();

    if (session) {
      await ctx.db.delete(session._id);
    }

    return { success: true };
  },
});

// Verify session is valid
export const verifySession = query({
  args: {
    sessionToken: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("adminSessions")
      .withIndex("by_token", (q: any) => q.eq("token", args.sessionToken))
      .first();

    if (!session) {
      return { valid: false };
    }

    if (session.expiresAt < Date.now()) {
      // Don't delete in query, just return invalid
      return { valid: false };
    }

    if (!(await isAllowedAdminEmail(ctx, session.email))) {
      return { valid: false };
    }

    return { valid: true, email: session.email };
  },
});

// Set initial password (one-time use - can overwrite existing password)
// This is for production setup - use to set/overwrite password, then delete the mutation call for security
export const setInitialPassword = mutation({
  args: {
    password: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if admin auth already exists
    const existing = await ctx.db
      .query("adminAuth")
      .first();

    // Validate password
    if (args.password.length < 8) {
      throw new Error("Password must be at least 8 characters long");
    }

    // Hash password
    const passwordHash = bcrypt.hashSync(args.password, 10);

    // Get primary email and allowed emails
    const primaryEmail = await getPrimaryAdminEmail(ctx);
    const allowedEmails = await getAllowedAdminEmails(ctx);

    if (existing) {
      // Update existing record (overwrites existing password)
      await ctx.db.patch(existing._id, {
        passwordHash,
        updatedAt: Date.now(),
      });
      
      // Invalidate all existing sessions (force re-login)
      const allSessions = await ctx.db
        .query("adminSessions")
        .collect();
      
      for (const session of allSessions) {
        await ctx.db.delete(session._id);
      }
    } else {
      // Create new record
      await ctx.db.insert("adminAuth", {
        passwordHash,
        primaryEmail: primaryEmail || "",
        allowedEmails,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    return {
      success: true,
      message: "Password set successfully. All existing sessions have been invalidated. Consider deleting this mutation for security.",
    };
  },
});

// Clear/delete password (for security - use if password is compromised)
// This will prevent all logins until a new password is set via setInitialPassword
export const clearPassword = mutation({
  args: {},
  handler: async (ctx) => {
    const adminAuth = await ctx.db
      .query("adminAuth")
      .first();
    
    if (!adminAuth) {
      throw new Error("No admin auth found");
    }

    // Clear password hash (set to empty string - login will fail)
    await ctx.db.patch(adminAuth._id, {
      passwordHash: "",
      updatedAt: Date.now(),
    });

    // Invalidate all sessions
    const allSessions = await ctx.db
      .query("adminSessions")
      .collect();
    
    for (const session of allSessions) {
      await ctx.db.delete(session._id);
    }

    return {
      success: true,
      message: "Password cleared. All sessions invalidated. Use setInitialPassword to set a new password.",
    };
  },
});

// Re-export requireAdmin from adminAuth for backward compatibility
// This ensures existing imports continue to work
export { requireAdmin } from "./adminAuth";
