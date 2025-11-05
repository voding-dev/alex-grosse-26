"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ReactNode } from "react";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL || "";

// Log Convex URL for debugging (only in development)
if (typeof window !== "undefined" && convexUrl) {
  console.log("[Convex Client] Connecting to:", convexUrl);
}

const convex = convexUrl ? new ConvexReactClient(convexUrl) : null;

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  if (!convex) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-foreground/60">Convex not configured. Please set NEXT_PUBLIC_CONVEX_URL.</p>
      </div>
    );
  }

  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}
