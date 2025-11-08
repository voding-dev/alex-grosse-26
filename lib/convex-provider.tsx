"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ReactNode } from "react";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL || "";

// Check for Convex URL configuration
if (typeof window !== "undefined" && !convexUrl) {
  console.error("[Convex Client] ❌ NEXT_PUBLIC_CONVEX_URL is not set!");
  console.error("[Convex Client] Please set NEXT_PUBLIC_CONVEX_URL in your environment variables.");
}

// Create Convex client with optimized connection handling
// Note: WebSocket connection errors (code 1006) in the browser console are expected
// and handled automatically by Convex's reconnection logic. These errors occur when:
// - The connection times out (e.g., Convex server sleeping on free tier)
// - Network instability causes temporary disconnections
// - The connection is closed abnormally
// Convex automatically reconnects, so these errors can be safely ignored.
const convex = convexUrl ? new ConvexReactClient(convexUrl, {
  // Automatically reconnect on connection loss
  unsavedChangesWarning: false,
  // Use native WebSocket for better compatibility
  webSocketConstructor: typeof WebSocket !== "undefined" ? WebSocket : undefined,
}) : null;

export function ConvexClientProvider({ children }: { children: ReactNode }) {
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
