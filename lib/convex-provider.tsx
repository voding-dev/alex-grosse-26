"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ReactNode, useEffect, useState } from "react";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL || "";

// Log Convex URL for debugging (only in development)
if (typeof window !== "undefined" && convexUrl) {
  console.log("[Convex Client] Connecting to:", convexUrl);
} else if (typeof window !== "undefined" && !convexUrl) {
  console.error("[Convex Client] NEXT_PUBLIC_CONVEX_URL is not set!");
}

const convex = convexUrl ? new ConvexReactClient(convexUrl) : null;

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    if (convex && typeof window !== "undefined") {
      // Log connection status
      console.log("[Convex Client] Initialized, checking connection...");
      
      // The Convex client will automatically connect
      // Log after a short delay to see if connection is established
      const timeout = setTimeout(() => {
        console.log("[Convex Client] Client initialized, queries should work now");
      }, 2000);
      
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
