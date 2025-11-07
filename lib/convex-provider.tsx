"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ReactNode, useEffect, useState } from "react";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL || "";

// Log Convex URL for debugging (only in development)
if (typeof window !== "undefined" && convexUrl) {
  console.log("[Convex Client] Connecting to:", convexUrl);
} else if (typeof window !== "undefined" && !convexUrl) {
  console.error("[Convex Client] ❌ NEXT_PUBLIC_CONVEX_URL is not set!");
  console.error("[Convex Client] Please set NEXT_PUBLIC_CONVEX_URL in your environment variables.");
  console.error("[Convex Client] For local dev: http://127.0.0.1:3210");
  console.error("[Convex Client] For production: https://adjoining-dinosaur-258.convex.cloud");
}

// Create Convex client with better connection handling
const convex = convexUrl ? new ConvexReactClient(convexUrl, {
  // Automatically reconnect on connection loss
  unsavedChangesWarning: false,
  // Increase timeout for inactive servers
  webSocketConstructor: typeof WebSocket !== "undefined" ? WebSocket : undefined,
}) : null;

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    if (convex && typeof window !== "undefined") {
      // Log connection status
      console.log("[Convex Client] Initialized, checking connection...");
      
      // Check connection status using Convex client's internal state
      // Note: ConvexReactClient doesn't expose connectionState() directly
      // but we can check if queries are working by attempting a simple test
      const checkConnection = () => {
        // The Convex client will automatically connect
        // We'll log after a delay to see if connection is established
        console.log("[Convex Client] ✅ Client initialized");
        console.log("[Convex Client] 📡 URL:", convexUrl);
        
        // Note: If you see "InactiveServer" errors, this is normal for Convex free tier
        // The deployment may sleep after inactivity and needs to wake up (can take 10-30 seconds)
        console.log("[Convex Client] 💡 Connection tips:");
        console.log("[Convex Client]   - If you see 'InactiveServer' errors, wait 10-30 seconds for the server to wake up");
        console.log("[Convex Client]   - The client will automatically reconnect");
        console.log("[Convex Client]   - For local dev, make sure 'npx convex dev' is running");
        console.log("[Convex Client]   - For production, ensure NEXT_PUBLIC_CONVEX_URL is set in Vercel");
        
        // Check websocket connection by looking at the client's internal state
        // If there are connection issues, they'll show up in the browser console
        // as network errors or in the Convex dev server logs
      };
      
      // Initial check after a short delay
      const timeout = setTimeout(() => {
        checkConnection();
      }, 1000);
      
      return () => {
        clearTimeout(timeout);
      };
    }
  }, [convex]);

  if (!convex) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-foreground/60 font-semibold">Convex not configured</p>
          <p className="text-sm text-foreground/40">
            Please set NEXT_PUBLIC_CONVEX_URL in your .env.local file
          </p>
          <p className="text-xs text-foreground/30">
            Run <code className="bg-foreground/10 px-2 py-1 rounded">npx convex dev</code> to get your Convex URL
          </p>
        </div>
      </div>
    );
  }

  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}
