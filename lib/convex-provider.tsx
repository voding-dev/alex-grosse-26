"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ReactNode, Component, ErrorInfo } from "react";

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

// Error boundary to catch Convex query failures (e.g., plan limits exceeded)
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  isPlanLimitError: boolean;
}

class ConvexErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null, isPlanLimitError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    const isPlanLimitError = error.message?.includes("exceeded") || 
                              error.message?.includes("plan limits") ||
                              error.message?.includes("disabled");
    return { hasError: true, error, isPlanLimitError };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.warn("[Convex Error Boundary] Caught error:", error.message);
    console.debug("[Convex Error Boundary] Error info:", errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.state.isPlanLimitError) {
        return (
          <div className="flex min-h-screen items-center justify-center bg-background">
            <div className="text-center space-y-6 max-w-md px-6">
              <div className="text-6xl">⚠️</div>
              <h1 className="text-2xl font-black uppercase tracking-tight text-foreground">
                Service Temporarily Unavailable
              </h1>
              <p className="text-foreground/60">
                The database service is currently unavailable. This is usually temporary.
              </p>
              <p className="text-sm text-foreground/40">
                If you&apos;re the site owner, please check your Convex dashboard for billing or usage issues.
              </p>
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-3 bg-accent text-white font-bold uppercase tracking-wider rounded hover:opacity-90 transition-opacity"
              >
                Try Again
              </button>
            </div>
          </div>
        );
      }
      
      // Generic error fallback
      return (
        <div className="flex min-h-screen items-center justify-center bg-background">
          <div className="text-center space-y-4 max-w-md px-6">
            <h1 className="text-xl font-bold text-foreground">Something went wrong</h1>
            <p className="text-sm text-foreground/60">
              {this.state.error?.message || "An unexpected error occurred"}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-foreground/10 text-foreground font-medium rounded hover:bg-foreground/20 transition-colors"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

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

  return (
    <ConvexErrorBoundary>
      <ConvexProvider client={convex}>{children}</ConvexProvider>
    </ConvexErrorBoundary>
  );
}
