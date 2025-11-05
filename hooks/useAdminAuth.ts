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
      setSessionToken(token);
      setIsChecking(false);
    }
  }, []);

  const user = useQuery(
    api.auth.getCurrentUser,
    sessionToken ? { sessionToken } : ("skip" as const)
  );

  return {
    adminEmail: user?.email || null,
    user,
    sessionToken,
    isChecking,
    isAuthenticated: !isChecking && sessionToken !== null && user !== null,
  };
}
