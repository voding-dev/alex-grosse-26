"use client";

import { useState, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Eye, EyeOff } from "lucide-react";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const login = useMutation(api.auth.login);

  // Debug: Log Convex URL on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      console.log("[Login Page] Convex URL:", process.env.NEXT_PUBLIC_CONVEX_URL);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast({
        title: "Email required",
        description: "Please enter your email address.",
        variant: "destructive",
      });
      return;
    }
    if (!password) {
      toast({
        title: "Password required",
        description: "Please enter your password.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      console.log("[Login] Attempting login with email:", email.trim().toLowerCase());
      console.log("[Login] Mutation function:", login);
      
      const result = await login({ 
        email: email.trim().toLowerCase(), 
        password 
      });
      
      console.log("[Login] Login successful, result:", result);
      
      // Store session token in localStorage
      localStorage.setItem("admin_session_token", result.sessionToken);
      localStorage.setItem("admin_email", result.email);
      
      console.log("[Login] Token stored in localStorage:", result.sessionToken);
      
      toast({
        title: "Access granted",
        description: "You can now access the admin dashboard.",
      });
      
      // Use window.location.href for a full page reload to ensure auth state is refreshed
      // This ensures the session is validated before rendering the admin dashboard
      window.location.href = "/admin";
    } catch (error: any) {
      // Log full error details for debugging
      console.error("Login error details:", {
        error,
        message: error?.message,
        data: error?.data,
        code: error?.code,
        name: error?.name,
        stack: error?.stack,
        toString: error?.toString(),
      });
      
      // Try to extract a more specific error message
      let errorMessage = "Invalid email or password.";
      if (error?.message) {
        errorMessage = error.message;
      } else if (error?.data?.message) {
        errorMessage = error.data.message;
      } else if (typeof error === "string") {
        errorMessage = error;
      } else if (error?.toString && error.toString() !== "[object Object]") {
        errorMessage = error.toString();
      }
      
      toast({
        title: "Login failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 sm:p-6">
      <div className="w-full max-w-md">
        {/* Logo/Brand */}
        <div className="mb-6 sm:mb-8 text-center">
          <div className="mb-4 sm:mb-6 flex items-center justify-center">
            <Image
              src="/ic-brandmark-white.svg"
              alt="Ian Courtright"
              width={48}
              height={48}
              className="h-10 w-10 sm:h-12 sm:w-12 object-contain"
            />
          </div>
          <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-foreground mb-3" style={{ fontWeight: '900', letterSpacing: '-0.02em' }}>
            Admin Access
          </h1>
          <p className="text-sm sm:text-base text-foreground/70 px-4">
            Enter your email and password to access the admin dashboard
          </p>
        </div>

        <Card className="border border-foreground/20 bg-foreground/5">
          <CardContent className="p-6 sm:p-8">
            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-black uppercase tracking-wider mb-3 text-foreground" style={{ fontWeight: '900' }}>
                  Email
                </label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  disabled={isLoading}
                  className="h-12 text-base"
                  autoComplete="email"
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-black uppercase tracking-wider mb-3 text-foreground" style={{ fontWeight: '900' }}>
                  Password
                </label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    disabled={isLoading}
                    className="h-12 text-base pr-10"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/60 hover:text-foreground transition-colors"
                    disabled={isLoading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>
              <Button 
                type="submit" 
                className="w-full h-12 text-base font-black uppercase tracking-wider hover:bg-accent/90 transition-colors" 
                disabled={isLoading}
                style={{ backgroundColor: '#FFA617', fontWeight: '900' }}
              >
                {isLoading ? "Signing in..." : "Sign In"}
              </Button>
            </form>
            <p className="mt-6 text-xs text-center text-foreground/60 leading-relaxed">
              Only authorized email addresses can access the admin dashboard.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
