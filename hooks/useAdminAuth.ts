"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export function useAdminAuth() {
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const tokenRef = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("admin_session_token");
      tokenRef.current = token;
      setSessionToken(token);
      setIsInitialized(true); // Mark as initialized after first check
      
      // Listen for storage changes (e.g., when login sets the token)
      const handleStorageChange = (e: StorageEvent) => {
        if (e.key === "admin_session_token" && e.newValue !== tokenRef.current) {
          tokenRef.current = e.newValue;
          setSessionToken(e.newValue);
        }
      };
      
      window.addEventListener("storage", handleStorageChange);
      
      // Also check periodically in case localStorage was set in same window
      // Use a longer interval to avoid excessive checks
      const checkToken = () => {
        const currentToken = localStorage.getItem("admin_session_token");
        // Only update if token actually changed
        if (currentToken !== tokenRef.current) {
          tokenRef.current = currentToken;
          setSessionToken(currentToken);
        }
      };
      
      // Check periodically (reduced frequency)
      const interval = setInterval(checkToken, 2000); // Check every 2 seconds
      
      return () => {
        window.removeEventListener("storage", handleStorageChange);
        clearInterval(interval);
      };
    }
  }, []);

  // Only query if initialized and token is present
  const user = useQuery(
    api.auth.getCurrentUser,
    isInitialized && sessionToken ? { sessionToken } : ("skip" as const)
  );

  // isChecking is true until initialized
  const isChecking = !isInitialized;

  return {
    adminEmail: user?.email || null,
    user,
    sessionToken,
    isChecking,
    isAuthenticated: !isChecking && sessionToken !== null && user !== null,
  };
}
