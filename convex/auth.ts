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
    try {
      // Normalize email
      const email = args.email.trim().toLowerCase();

      // Check if email is allowed
      const isAllowed = await isAllowedAdminEmail(ctx, email);
      if (!isAllowed) {
        throw new Error("Unauthorized email address. Please run 'configureAdminEmail' mutation first.");
      }

      // Get admin auth
      const adminAuth = await ctx.db
        .query("adminAuth")
        .first();
      
      if (!adminAuth || !adminAuth.passwordHash || adminAuth.passwordHash === "") {
        throw new Error("Invalid email or password. Please run 'setInitialPassword' mutation first.");
      }

      // Verify password
      let passwordMatch = false;
      try {
        passwordMatch = bcrypt.compareSync(args.password, adminAuth.passwordHash);
      } catch (bcryptError: any) {
        throw new Error(`Password verification failed: ${bcryptError.message}`);
      }
      
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
    } catch (error: any) {
      // Log the actual error for debugging
      console.error("Login error:", error);
      throw new Error(error.message || "Login failed. Please check your email and password.");
    }
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

// Configure admin email (must be run before setInitialPassword if no email is configured)
// This sets up the allowedAdminEmails and primaryAdminEmail in the settings table
export const configureAdminEmail = mutation({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const email = args.email.trim().toLowerCase();
    
    // Validate email format
    if (!email.includes("@") || !email.includes(".")) {
      throw new Error("Invalid email address");
    }

    // Set primary email
    const primaryEmailSetting = await ctx.db
      .query("settings")
      .withIndex("by_key", (q: any) => q.eq("key", "primaryAdminEmail"))
      .first();
    
    if (!primaryEmailSetting) {
      await ctx.db.insert("settings", {
        key: "primaryAdminEmail",
        value: email,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.patch(primaryEmailSetting._id, {
        value: email,
        updatedAt: Date.now(),
      });
    }

    // Set allowed emails
    const allowedEmailsSetting = await ctx.db
      .query("settings")
      .withIndex("by_key", (q: any) => q.eq("key", "allowedAdminEmails"))
      .first();
    
    const emailsToAllow = [email];
    
    if (!allowedEmailsSetting) {
      await ctx.db.insert("settings", {
        key: "allowedAdminEmails",
        value: emailsToAllow,
        updatedAt: Date.now(),
      });
    } else {
      // Update to include this email if not already present
      const existingEmails = Array.isArray(allowedEmailsSetting.value) 
        ? allowedEmailsSetting.value 
        : [];
      if (!existingEmails.includes(email)) {
        existingEmails.push(email);
      }
      await ctx.db.patch(allowedEmailsSetting._id, {
        value: existingEmails,
        updatedAt: Date.now(),
      });
    }

    // Update adminAuth record if it exists
    const adminAuth = await ctx.db
      .query("adminAuth")
      .first();
    
    if (adminAuth) {
      await ctx.db.patch(adminAuth._id, {
        primaryEmail: email,
        allowedEmails: emailsToAllow,
        updatedAt: Date.now(),
      });
    }

    return {
      success: true,
      message: `Admin email configured: ${email}. You can now set the password using setInitialPassword.`,
    };
  },
});

// Set initial password (one-time use - can overwrite existing password)
// This is for production setup - use to set/overwrite password, then delete the mutation call for security
// NOTE: Run configureAdminEmail first if no email settings exist!
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

    // Get primary email and allowed emails from settings
    const primaryEmail = await getPrimaryAdminEmail(ctx);
    const allowedEmails = await getAllowedAdminEmails(ctx);

    // Ensure settings are configured for email authorization
    // This is critical - login checks settings table, not adminAuth table
    // If no settings exist, we can't proceed - user must run configureAdminEmail first
    const primaryEmailSetting = await ctx.db
      .query("settings")
      .withIndex("by_key", (q: any) => q.eq("key", "primaryAdminEmail"))
      .first();
    
    const allowedEmailsSetting = await ctx.db
      .query("settings")
      .withIndex("by_key", (q: any) => q.eq("key", "allowedAdminEmails"))
      .first();

    // If no email settings exist, we need to configure them first
    if (!primaryEmailSetting || !allowedEmailsSetting || allowedEmails.length === 0) {
      throw new Error("Admin email not configured. Please run 'configureAdminEmail' mutation first with your email address.");
    }

    // Use the configured emails
    const emailsToAllow = allowedEmails.length > 0 ? allowedEmails : (primaryEmail ? [primaryEmail] : []);

    if (existing) {
      // Update existing record (overwrites existing password)
      await ctx.db.patch(existing._id, {
        passwordHash,
        primaryEmail: primaryEmail || existing.primaryEmail,
        allowedEmails: emailsToAllow.length > 0 ? emailsToAllow : existing.allowedEmails,
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
        allowedEmails: emailsToAllow,
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

// Check admin auth configuration status (for debugging)
export const checkAdminAuthStatus = query({
  args: {},
  handler: async (ctx) => {
    const adminAuth = await ctx.db
      .query("adminAuth")
      .first();
    
    const primaryEmailSetting = await ctx.db
      .query("settings")
      .withIndex("by_key", (q: any) => q.eq("key", "primaryAdminEmail"))
      .first();
    
    const allowedEmailsSetting = await ctx.db
      .query("settings")
      .withIndex("by_key", (q: any) => q.eq("key", "allowedAdminEmails"))
      .first();
    
    // Test email check
    const testEmail = "iancourtright@gmail.com";
    const isAllowed = await isAllowedAdminEmail(ctx, testEmail);
    
    return {
      hasAdminAuth: !!adminAuth,
      hasPassword: !!(adminAuth && adminAuth.passwordHash && adminAuth.passwordHash !== ""),
      passwordHashLength: adminAuth?.passwordHash?.length || 0,
      primaryEmail: primaryEmailSetting?.value || null,
      allowedEmails: allowedEmailsSetting?.value || [],
      adminAuthPrimaryEmail: adminAuth?.primaryEmail || null,
      adminAuthAllowedEmails: adminAuth?.allowedEmails || [],
      testEmailAllowed: isAllowed,
      testEmail: testEmail,
    };
  },
});

// Re-export requireAdmin from adminAuth for backward compatibility
// This ensures existing imports continue to work
export { requireAdmin } from "./adminAuth";
