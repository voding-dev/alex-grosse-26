import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

// Convex HTTP client for server-side data fetching (e.g., generateMetadata)
// This is different from the React client which only works on the client side

let httpClient: ConvexHttpClient | null = null;

function getHttpClient(): ConvexHttpClient | null {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  
  if (!convexUrl) {
    console.warn("[Convex HTTP] NEXT_PUBLIC_CONVEX_URL is not set");
    return null;
  }
  
  if (!httpClient) {
    httpClient = new ConvexHttpClient(convexUrl);
  }
  
  return httpClient;
}

export interface SeoSettings {
  seoSiteName?: string;
  seoTitle?: string;
  seoDescription?: string;
  seoOgImageStorageKey?: string;
  seoSocialDescription?: string;
}

/**
 * Fetch all settings from Convex server-side
 * Used in generateMetadata and other server components
 * 
 * This function gracefully handles failures (e.g., Convex unavailable, 
 * plan limits exceeded) by returning empty defaults.
 */
export async function getSettings(): Promise<Record<string, unknown>> {
  const client = getHttpClient();
  
  if (!client) {
    return {};
  }
  
  try {
    const settings = await client.query(api.settings.getAll);
    return settings || {};
  } catch (error: unknown) {
    // Log as warning instead of error - this is expected when Convex is unavailable
    // or plan limits are exceeded. The site will still work with defaults.
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("exceeded") || message.includes("plan limits")) {
      console.warn("[Convex HTTP] Convex plan limits exceeded - using default settings");
    } else {
      console.warn("[Convex HTTP] Failed to fetch settings - using defaults:", message);
    }
    return {};
  }
}

/**
 * Fetch SEO-specific settings
 */
export async function getSeoSettings(): Promise<SeoSettings> {
  const settings = await getSettings();
  
  return {
    seoSiteName: settings.seoSiteName as string | undefined,
    seoTitle: settings.seoTitle as string | undefined,
    seoDescription: settings.seoDescription as string | undefined,
    seoOgImageStorageKey: settings.seoOgImageStorageKey as string | undefined,
    seoSocialDescription: settings.seoSocialDescription as string | undefined,
  };
}

/**
 * Get a storage URL for a given storage key
 * Used to convert storage keys to public URLs for OG images
 * 
 * Gracefully returns null if Convex is unavailable.
 */
export async function getStorageUrl(storageKey: string): Promise<string | null> {
  const client = getHttpClient();
  
  if (!client || !storageKey) {
    return null;
  }
  
  try {
    const url = await client.query(api.storageQueries.getUrl, { storageId: storageKey });
    return url || null;
  } catch {
    // Silently return null - the caller will use a fallback image
    return null;
  }
}
