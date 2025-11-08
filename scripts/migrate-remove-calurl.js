/**
 * One-time migration script to remove calUrl from design documents
 * Run this with: node scripts/migrate-remove-calurl.js
 * 
 * This script uses the Convex HTTP API to run the migration mutation.
 * Make sure your Convex dev server is running or you have CONVEX_URL set.
 */

const { ConvexHttpClient } = require("convex/browser");

async function runMigration() {
  // Get Convex URL from environment - require explicit configuration for production
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL || process.env.CONVEX_URL;
  
  // Only allow localhost fallback in development
  const isDevelopment = process.env.NODE_ENV !== "production";
  const finalUrl = convexUrl || (isDevelopment ? "http://127.0.0.1:3210" : null);
  
  if (!finalUrl) {
    throw new Error(
      "Convex URL not configured. Set NEXT_PUBLIC_CONVEX_URL or CONVEX_URL environment variable.\n" +
      "This script should only be run in development or with explicit configuration."
    );
  }
  
  // Warn if using localhost in production-like environment
  if (finalUrl.includes("localhost") || finalUrl.includes("127.0.0.1")) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Cannot use localhost URL in production environment");
    }
    console.warn("⚠️  Using localhost URL - ensure this is for development only");
  }
  
  console.log(`Connecting to Convex at: ${finalUrl}`);
  
  const client = new ConvexHttpClient(finalUrl);
  
  try {
    console.log("Running migration to remove calUrl from design documents...");
    
    // Run the migration mutation
    const result = await client.mutation("design:migrateRemoveCalUrl", {});
    
    console.log("Migration completed successfully!");
    console.log(`Cleaned ${result.cleanedCount} document(s)`);
    console.log("\nNext steps:");
    console.log("1. Remove calUrl from the schema in convex/schema.ts");
    console.log("2. Delete the migrateRemoveCalUrl mutation from convex/design.ts");
    console.log("3. Delete this script file");
    
    return result;
  } catch (error) {
    console.error("Migration failed:", error.message);
    
    if (error.message.includes("Could not find function")) {
      console.error("\nThe migration function hasn't been synced yet.");
      console.error("Make sure:");
      console.error("1. The Convex dev server is running (npx convex dev)");
      console.error("2. The schema includes calUrl temporarily");
      console.error("3. Wait a few seconds for functions to sync");
      console.error("\nAlternatively, run the migration via the Convex dashboard:");
      console.error("1. Go to your Convex dashboard");
      console.error("2. Navigate to Functions");
      console.error("3. Find 'design:migrateRemoveCalUrl'");
      console.error("4. Click 'Run'");
    }
    
    throw error;
  }
}

// Run the migration
runMigration()
  .then(() => {
    console.log("\nMigration script completed.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\nMigration script failed:", error);
    process.exit(1);
  });

