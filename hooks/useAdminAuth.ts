"use client";

import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export function useAdminAuth() {
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("admin_session_token");
      console.log("[useAdminAuth] Reading token from localStorage:", token ? "present" : "missing");
      setSessionToken(token);
      setIsChecking(false);
      
      // Listen for storage changes (e.g., when login sets the token)
      const handleStorageChange = (e: StorageEvent) => {
        if (e.key === "admin_session_token") {
          console.log("[useAdminAuth] Storage changed, updating token");
          setSessionToken(e.newValue);
        }
      };
      
      window.addEventListener("storage", handleStorageChange);
      
      // Also check periodically in case localStorage was set in same window
      const checkToken = () => {
        const currentToken = localStorage.getItem("admin_session_token");
        setSessionToken((prevToken) => {
          if (currentToken !== prevToken) {
            console.log("[useAdminAuth] Token changed in localStorage, updating");
            return currentToken;
          }
          return prevToken;
        });
      };
      
      // Check immediately and then periodically
      checkToken();
      const interval = setInterval(checkToken, 100);
      
      return () => {
        window.removeEventListener("storage", handleStorageChange);
        clearInterval(interval);
      };
    }
  }, []);

  const user = useQuery(
    api.auth.getCurrentUser,
    sessionToken ? { sessionToken } : ("skip" as const)
  );

  // Only log when state actually changes, not on every render
  useEffect(() => {
    console.log("[useAdminAuth] State:", {
      sessionToken: sessionToken ? "present" : "missing",
      isChecking,
      user: user ? "found" : "null",
      isAuthenticated: !isChecking && sessionToken !== null && user !== null,
    });
  }, [sessionToken, isChecking, user]);

  return {
    adminEmail: user?.email || null,
    user,
    sessionToken,
    isChecking,
    isAuthenticated: !isChecking && sessionToken !== null && user !== null,
  };
}
