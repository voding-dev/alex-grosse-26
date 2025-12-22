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
      const result = await login({ 
        email: email.trim().toLowerCase(), 
        password 
      });
      
      // Store session token in localStorage
      localStorage.setItem("admin_session_token", result.sessionToken);
      localStorage.setItem("admin_email", result.email);
      
      toast({
        title: "Access granted",
        description: "You can now access the admin dashboard.",
      });
      
      // Use window.location.href for a full page reload to ensure auth state is refreshed
      // This ensures the session is validated before rendering the admin dashboard
      window.location.href = "/admin";
    } catch (error: any) {
      // Extract error message without exposing sensitive details
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
    <div className="min-h-screen" style={{ backgroundColor: '#FAFAF9' }}>
      {/* Accent top bar */}
      <div className="h-1.5 w-full" style={{ backgroundColor: '#586034' }} />
      
      <div className="flex min-h-[calc(100vh-6px)] items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md">
          {/* Logo/Brand */}
          <div className="mb-6 sm:mb-8 text-center">
            <div className="mb-4 sm:mb-6 flex items-center justify-center">
              <div className="p-4 rounded-2xl" style={{ backgroundColor: '#586034' }}>
                <Image
                  src="/ag-brandmark-white.svg"
                  alt="Alex Grosse"
                  width={48}
                  height={48}
                  className="h-10 w-10 sm:h-12 sm:w-12 object-contain"
                />
              </div>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight mb-2" style={{ fontWeight: '900', letterSpacing: '-0.02em', color: '#1a1a1a' }}>
              Admin Access
            </h1>
            <p className="text-sm sm:text-base px-4" style={{ color: '#888' }}>
              Enter your credentials to continue
            </p>
          </div>

          <Card className="shadow-xl border-0" style={{ backgroundColor: '#fff', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
          <CardContent className="p-6 sm:p-8">
            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-black uppercase tracking-wider mb-3" style={{ fontWeight: '900', color: '#333' }}>
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
                  className="h-12 text-base border-gray-200 focus:border-[#586034] focus:ring-[#586034]/20"
                  style={{ backgroundColor: '#FAFAF9', color: '#1a1a1a' }}
                  autoComplete="email"
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-black uppercase tracking-wider mb-3" style={{ fontWeight: '900', color: '#333' }}>
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
                    className="h-12 text-base pr-10 border-gray-200 focus:border-[#586034] focus:ring-[#586034]/20"
                    style={{ backgroundColor: '#FAFAF9', color: '#1a1a1a' }}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                    style={{ color: '#888' }}
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
                className="w-full h-12 text-base font-black uppercase tracking-wider transition-all hover:opacity-90" 
                disabled={isLoading}
                style={{ backgroundColor: '#586034', fontWeight: '900', color: '#fff' }}
              >
                {isLoading ? "Signing in..." : "Sign In"}
              </Button>
            </form>
            <p className="mt-6 text-xs text-center leading-relaxed" style={{ color: '#999' }}>
              Only authorized email addresses can access the admin dashboard.
            </p>
          </CardContent>
        </Card>
        
        {/* Decorative accent line */}
        <div className="mt-8 flex justify-center">
          <div className="h-1 w-16 rounded-full" style={{ backgroundColor: 'rgba(88, 96, 52, 0.3)' }} />
        </div>
        </div>
      </div>
    </div>
  );
}
