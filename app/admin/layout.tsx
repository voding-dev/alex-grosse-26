"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { 
  ChevronDown, 
  ExternalLink, 
  Menu, 
  X, 
  LogOut,
  Globe,
  Layers,
  FolderKanban,
  Package,
  MessageSquare,
  Mail,
  Calendar,
  Images,
  Sliders,
  Calculator,
  QrCode,
  Minimize2,
  RefreshCw,
  User,
  Settings
} from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { FloatingNotesButton } from "@/components/notes/floating-notes-button";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isChecking, isAuthenticated, sessionToken } = useAdminAuth();
  const router = useRouter();
  const pathname = usePathname();
  const logoutMutation = useMutation(api.auth.logout);
  
  // Get about photo for profile dropdown
  const about = useQuery(api.about.get);
  const aboutImageUrl = useQuery(
    api.storageQueries.getUrl,
    about?.imageStorageId ? { storageId: about.imageStorageId } : "skip"
  );
  const [clientsOpen, setClientsOpen] = useState(false);
  const [businessOpen, setBusinessOpen] = useState(false);
  const [mediaOpen, setMediaOpen] = useState(false);
  const [websiteOpen, setWebsiteOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileDropdownsOpen, setMobileDropdownsOpen] = useState({
    website: false,
    clients: false,
    business: false,
    media: false,
  });
  
  useEffect(() => {
    // Only redirect if we're done checking and not authenticated
    // Give a small delay to allow queries to resolve
    if (!isChecking && !isAuthenticated && pathname !== "/admin/login") {
      router.push("/admin/login");
      return;
    }
    // Close dropdowns when navigating (only if pathname actually changed)
    if (pathname) {
      setClientsOpen(false);
      setBusinessOpen(false);
      setMediaOpen(false);
      setWebsiteOpen(false);
      setProfileOpen(false);
      setMobileMenuOpen(false);
      setMobileDropdownsOpen({ website: false, clients: false, business: false, media: false });
    }
  }, [pathname, isChecking, isAuthenticated, router]);

  // Show loading while checking auth, but allow login page to render
  if (isChecking && pathname !== "/admin/login") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background transition-opacity duration-500 ease-out">
        <div className="text-center">
          <div className="mb-4 flex items-center justify-center">
            <Image
              src="/ic-brandmark-white.svg"
              alt="Ian Courtright"
              width={32}
              height={32}
              className="h-8 w-8 object-contain"
              style={{
                animation: 'pulseOpacity 2s ease-in-out infinite',
              }}
            />
          </div>
          <p 
            className="text-foreground/60 uppercase tracking-wider text-sm font-medium"
            style={{
              animation: 'pulseDots 1.5s ease-in-out infinite',
            }}
          >
            Loading<span className="inline-block" style={{ animation: 'pulseDots 1.5s ease-in-out infinite 0.2s' }}>.</span><span className="inline-block" style={{ animation: 'pulseDots 1.5s ease-in-out infinite 0.4s' }}>.</span><span className="inline-block" style={{ animation: 'pulseDots 1.5s ease-in-out infinite 0.6s' }}>.</span>
          </p>
        </div>
      </div>
    );
  }

  // Only redirect if we're definitely not authenticated (not checking anymore)
  // Don't show loading screen if we're checking - let the redirect happen
  if (!isChecking && !isAuthenticated && pathname !== "/admin/login") {
    // This will be handled by the useEffect redirect
    return (
      <div className="flex min-h-screen items-center justify-center bg-background transition-opacity duration-500 ease-out">
        <div className="text-center">
          <div className="mb-4 flex items-center justify-center">
            <Image
              src="/ic-brandmark-white.svg"
              alt="Ian Courtright"
              width={32}
              height={32}
              className="h-8 w-8 object-contain"
              style={{
                animation: 'pulseOpacity 2s ease-in-out infinite',
              }}
            />
          </div>
          <p 
            className="text-foreground/60 uppercase tracking-wider text-sm font-medium"
            style={{
              animation: 'pulseDots 1.5s ease-in-out infinite',
            }}
          >
            Redirecting<span className="inline-block" style={{ animation: 'pulseDots 1.5s ease-in-out infinite 0.2s' }}>.</span><span className="inline-block" style={{ animation: 'pulseDots 1.5s ease-in-out infinite 0.4s' }}>.</span><span className="inline-block" style={{ animation: 'pulseDots 1.5s ease-in-out infinite 0.6s' }}>.</span>
          </p>
        </div>
      </div>
    );
  }

  if (pathname === "/admin/login" || !isAuthenticated) {
    return <>{children}</>;
  }

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");
  const isClientsActive = isActive("/admin/client-projects") || isActive("/admin/deliveries") || isActive("/admin/feedback");
  const isBusinessActive = isActive("/admin/quote-calculator") || isActive("/admin/tools/pitch-deck-builder") || isActive("/admin/scheduling") || isActive("/admin/email-marketing") || isActive("/admin/qr-codes");
  const isMediaActive = isActive("/admin/tools/media-library") || isActive("/admin/image-compressor") || isActive("/admin/file-converter");
  const isWebsiteActive = isActive("/admin/website-editor") || isActive("/admin/page-builder") || isActive("/admin/portraits") || isActive("/admin/design") || isActive("/admin/landing-pages") || isActive("/admin/graphic-designer");

  const toggleMobileDropdown = (key: keyof typeof mobileDropdownsOpen) => {
    setMobileDropdownsOpen(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleLogout = async () => {
    if (sessionToken) {
      try {
        await logoutMutation({ sessionToken });
      } catch (error) {
        console.error("Error logging out:", error);
      }
    }
    // Clear session data
    localStorage.removeItem("admin_session_token");
    localStorage.removeItem("admin_email");
    // Redirect to login
    router.push("/admin/login");
  };

  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-100 border-b border-foreground/5 bg-background/80 backdrop-blur-xl supports-backdrop-filter:bg-background/60">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Logo/Brand */}
            <Link href="/admin" className="flex items-center gap-3 group" onClick={() => setMobileMenuOpen(false)}>
              <div className="relative overflow-hidden rounded-lg p-1.5 transition-all duration-300 group-hover:bg-accent/10">
                <Image
                  src="/ic-brandmark-white.svg"
                  alt="Admin"
                  width={32}
                  height={32}
                  className="h-7 w-7 object-contain transition-all duration-300 group-hover:scale-110"
                />
              </div>
              <span className="text-lg font-semibold tracking-tight text-foreground transition-colors group-hover:text-accent">
                Admin
              </span>
            </Link>
            
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-1">
              {/* Dashboard */}
              <Link
                href="/admin"
                className={cn(
                  "px-4 py-2.5 text-sm font-medium tracking-wide transition-all duration-200 rounded-lg",
                  isActive("/admin") && pathname === "/admin"
                    ? "text-accent bg-accent/10" 
                    : "text-foreground/70 hover:text-foreground hover:bg-foreground/5"
                )}
              >
                Dashboard
              </Link>

              {/* Website Dropdown */}
              <div className="relative">
                <button
                  onClick={() => {
                    setWebsiteOpen(!websiteOpen);
                    setClientsOpen(false);
                    setBusinessOpen(false);
                    setMediaOpen(false);
                    setProfileOpen(false);
                  }}
                  className={cn(
                    "px-4 py-2.5 text-sm font-medium tracking-wide transition-all duration-200 rounded-lg flex items-center gap-2 group",
                    websiteOpen || isWebsiteActive
                      ? "text-accent bg-accent/10" 
                      : "text-foreground/70 hover:text-foreground hover:bg-foreground/5"
                  )}
                >
                  Website
                  <ChevronDown className={cn("h-3.5 w-3.5 transition-all duration-300", websiteOpen && "rotate-180")} />
                </button>
                {websiteOpen && (
                  <div className="absolute top-full left-0 mt-2 bg-background/95 backdrop-blur-xl border border-foreground/10 rounded-xl shadow-2xl py-2 min-w-[220px] z-100 animate-in fade-in slide-in-from-top-2 duration-200" data-dropdown>
                    <div className="px-2 py-1.5">
                      <Link
                        href="/admin/website-editor"
                        onClick={(e) => {
                          setWebsiteOpen(false);
                        }}
                        className={cn(
                          "flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 group",
                          isActive("/admin/website-editor")
                            ? "text-accent bg-accent/10 shadow-sm"
                            : "text-foreground/80 hover:text-foreground hover:bg-foreground/5"
                        )}
                      >
                        <Globe className={cn("h-4 w-4 transition-transform group-hover:scale-110", isActive("/admin/website-editor") && "text-accent")} />
                        Homepage Editor
                      </Link>
                      <Link
                        href="/admin/page-builder"
                        onClick={(e) => {
                          setWebsiteOpen(false);
                        }}
                        className={cn(
                          "flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 group",
                          isActive("/admin/page-builder")
                            ? "text-accent bg-accent/10 shadow-sm"
                            : "text-foreground/80 hover:text-foreground hover:bg-foreground/5"
                        )}
                      >
                        <Layers className={cn("h-4 w-4 transition-transform group-hover:scale-110", isActive("/admin/page-builder") && "text-accent")} />
                        Page Builder
                      </Link>
                      <Link
                        href="/admin/graphic-designer"
                        onClick={(e) => {
                          setWebsiteOpen(false);
                        }}
                        className={cn(
                          "flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 group",
                          isActive("/admin/graphic-designer")
                            ? "text-accent bg-accent/10 shadow-sm"
                            : "text-foreground/80 hover:text-foreground hover:bg-foreground/5"
                        )}
                      >
                        <Layers className={cn("h-4 w-4 transition-transform group-hover:scale-110", isActive("/admin/graphic-designer") && "text-accent")} />
                        Graphic Designer
                      </Link>
                    </div>
                  </div>
                )}
              </div>

              {/* Clients Dropdown */}
              <div className="relative">
                <button
                  onClick={() => {
                    setClientsOpen(!clientsOpen);
                    setBusinessOpen(false);
                    setMediaOpen(false);
                    setWebsiteOpen(false);
                    setProfileOpen(false);
                  }}
                  className={cn(
                    "px-4 py-2.5 text-sm font-medium tracking-wide transition-all duration-200 rounded-lg flex items-center gap-2 group",
                    clientsOpen || isClientsActive
                      ? "text-accent bg-accent/10" 
                      : "text-foreground/70 hover:text-foreground hover:bg-foreground/5"
                  )}
                >
                  Clients
                  <ChevronDown className={cn("h-3.5 w-3.5 transition-all duration-300", clientsOpen && "rotate-180")} />
                </button>
                {clientsOpen && (
                  <div className="absolute top-full left-0 mt-2 bg-background/95 backdrop-blur-xl border border-foreground/10 rounded-xl shadow-2xl py-2 min-w-[220px] w animate-in fade-in slide-in-from-top-2 duration-200" data-dropdown>
                    <div className="px-2 py-1.5">
                      <Link
                        href="/admin/client-projects"
                        onClick={(e) => {
                          setTimeout(() => setClientsOpen(false), 0);
                        }}
                        className={cn(
                          "flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 group",
                          isActive("/admin/client-projects")
                            ? "text-accent bg-accent/10 shadow-sm"
                            : "text-foreground/80 hover:text-foreground hover:bg-foreground/5"
                        )}
                      >
                        <FolderKanban className={cn("h-4 w-4 transition-transform group-hover:scale-110", isActive("/admin/client-projects") && "text-accent")} />
                        Projects
                      </Link>
                      <Link
                        href="/admin/deliveries"
                        onClick={(e) => {
                          setTimeout(() => setClientsOpen(false), 0);
                        }}
                        className={cn(
                          "flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 group",
                          isActive("/admin/deliveries")
                            ? "text-accent bg-accent/10 shadow-sm"
                            : "text-foreground/80 hover:text-foreground hover:bg-foreground/5"
                        )}
                      >
                        <Package className={cn("h-4 w-4 transition-transform group-hover:scale-110", isActive("/admin/deliveries") && "text-accent")} />
                        Portals
                      </Link>
                      <Link
                        href="/admin/feedback"
                        onClick={(e) => {
                          setTimeout(() => setClientsOpen(false), 0);
                        }}
                        className={cn(
                          "flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 group",
                          isActive("/admin/feedback")
                            ? "text-accent bg-accent/10 shadow-sm"
                            : "text-foreground/80 hover:text-foreground hover:bg-foreground/5"
                        )}
                      >
                        <MessageSquare className={cn("h-4 w-4 transition-transform group-hover:scale-110", isActive("/admin/feedback") && "text-accent")} />
                        Feedback
                      </Link>
                    </div>
                  </div>
                )}
              </div>

              {/* Business Dropdown */}
              <div className="relative">
                <button
                  onClick={() => {
                    setBusinessOpen(!businessOpen);
                    setClientsOpen(false);
                    setMediaOpen(false);
                    setWebsiteOpen(false);
                    setProfileOpen(false);
                  }}
                  className={cn(
                    "px-4 py-2.5 text-sm font-medium tracking-wide transition-all duration-200 rounded-lg flex items-center gap-2 group",
                    businessOpen || isBusinessActive
                      ? "text-accent bg-accent/10" 
                      : "text-foreground/70 hover:text-foreground hover:bg-foreground/5"
                  )}
                >
                  Business
                  <ChevronDown className={cn("h-3.5 w-3.5 transition-all duration-300", businessOpen && "rotate-180")} />
                </button>
                {businessOpen && (
                  <div className="absolute top-full left-0 mt-2 bg-background/95 backdrop-blur-xl border border-foreground/10 rounded-xl shadow-2xl py-2 min-w-[260px] z-100 animate-in fade-in slide-in-from-top-2 duration-200" data-dropdown>
                    <div className="px-2 py-1.5">
                      <Link
                        href="/admin/quote-calculator"
                        onClick={(e) => {
                          setTimeout(() => setBusinessOpen(false), 0);
                        }}
                        className={cn(
                          "flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 group",
                          isActive("/admin/quote-calculator")
                            ? "text-accent bg-accent/10 shadow-sm"
                            : "text-foreground/80 hover:text-foreground hover:bg-foreground/5"
                        )}
                      >
                        <Calculator className={cn("h-4 w-4 transition-transform group-hover:scale-110", isActive("/admin/quote-calculator") && "text-accent")} />
                        Quote Builder
                      </Link>
                      <Link
                        href="/admin/tools/pitch-deck-builder"
                        onClick={(e) => {
                          setTimeout(() => setBusinessOpen(false), 0);
                        }}
                        className={cn(
                          "flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 group",
                          isActive("/admin/tools/pitch-deck-builder")
                            ? "text-accent bg-accent/10 shadow-sm"
                            : "text-foreground/80 hover:text-foreground hover:bg-foreground/5"
                        )}
                      >
                        <Sliders className={cn("h-4 w-4 transition-transform group-hover:scale-110", isActive("/admin/tools/pitch-deck-builder") && "text-accent")} />
                        Pitch Deck Builder
                      </Link>
                      <Link
                        href="/admin/scheduling"
                        onClick={(e) => {
                          setTimeout(() => setBusinessOpen(false), 0);
                        }}
                        className={cn(
                          "flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 group",
                          isActive("/admin/scheduling")
                            ? "text-accent bg-accent/10 shadow-sm"
                            : "text-foreground/80 hover:text-foreground hover:bg-foreground/5"
                        )}
                      >
                        <Calendar className={cn("h-4 w-4 transition-transform group-hover:scale-110", isActive("/admin/scheduling") && "text-accent")} />
                        Scheduling
                      </Link>
                      <Link
                        href="/admin/email-marketing"
                        onClick={(e) => {
                          setTimeout(() => setBusinessOpen(false), 0);
                        }}
                        className={cn(
                          "flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 group",
                          isActive("/admin/email-marketing")
                            ? "text-accent bg-accent/10 shadow-sm"
                            : "text-foreground/80 hover:text-foreground hover:bg-foreground/5"
                        )}
                      >
                        <Mail className={cn("h-4 w-4 transition-transform group-hover:scale-110", isActive("/admin/email-marketing") && "text-accent")} />
                        Email Marketing
                      </Link>
                      <Link
                        href="/admin/qr-codes"
                        onClick={(e) => {
                          setTimeout(() => setBusinessOpen(false), 0);
                        }}
                        className={cn(
                          "flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 group",
                          isActive("/admin/qr-codes")
                            ? "text-accent bg-accent/10 shadow-sm"
                            : "text-foreground/80 hover:text-foreground hover:bg-foreground/5"
                        )}
                      >
                        <QrCode className={cn("h-4 w-4 transition-transform group-hover:scale-110", isActive("/admin/qr-codes") && "text-accent")} />
                        QR Codes
                      </Link>
                    </div>
                  </div>
                )}
              </div>

              {/* Media Dropdown */}
              <div className="relative">
                <button
                  onClick={() => {
                    setMediaOpen(!mediaOpen);
                    setClientsOpen(false);
                    setBusinessOpen(false);
                    setWebsiteOpen(false);
                    setProfileOpen(false);
                  }}
                  className={cn(
                    "px-4 py-2.5 text-sm font-medium tracking-wide transition-all duration-200 rounded-lg flex items-center gap-2 group",
                    mediaOpen || isMediaActive
                      ? "text-accent bg-accent/10" 
                      : "text-foreground/70 hover:text-foreground hover:bg-foreground/5"
                  )}
                >
                  Media
                  <ChevronDown className={cn("h-3.5 w-3.5 transition-all duration-300", mediaOpen && "rotate-180")} />
                </button>
                {mediaOpen && (
                  <div className="absolute top-full left-0 mt-2 bg-background/95 backdrop-blur-xl border border-foreground/10 rounded-xl shadow-2xl py-2 min-w-[260px] z-100 animate-in fade-in slide-in-from-top-2 duration-200" data-dropdown>
                    <div className="px-2 py-1.5">
                      <Link
                        href="/admin/tools/media-library"
                        onClick={(e) => {
                          setTimeout(() => setMediaOpen(false), 0);
                        }}
                        className={cn(
                          "flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 group",
                          isActive("/admin/tools/media-library")
                            ? "text-accent bg-accent/10 shadow-sm"
                            : "text-foreground/80 hover:text-foreground hover:bg-foreground/5"
                        )}
                      >
                        <Images className={cn("h-4 w-4 transition-transform group-hover:scale-110", isActive("/admin/tools/media-library") && "text-accent")} />
                        Media Library
                      </Link>
                      <Link
                        href="/admin/image-compressor"
                        onClick={(e) => {
                          setTimeout(() => setMediaOpen(false), 0);
                        }}
                        className={cn(
                          "flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 group",
                          isActive("/admin/image-compressor")
                            ? "text-accent bg-accent/10 shadow-sm"
                            : "text-foreground/80 hover:text-foreground hover:bg-foreground/5"
                        )}
                      >
                        <Minimize2 className={cn("h-4 w-4 transition-transform group-hover:scale-110", isActive("/admin/image-compressor") && "text-accent")} />
                        Image Compressor
                      </Link>
                      <Link
                        href="/admin/file-converter"
                        onClick={(e) => {
                          setTimeout(() => setMediaOpen(false), 0);
                        }}
                        className={cn(
                          "flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 group",
                          isActive("/admin/file-converter")
                            ? "text-accent bg-accent/10 shadow-sm"
                            : "text-foreground/80 hover:text-foreground hover:bg-foreground/5"
                        )}
                      >
                        <RefreshCw className={cn("h-4 w-4 transition-transform group-hover:scale-110", isActive("/admin/file-converter") && "text-accent")} />
                        File Converter
                      </Link>
                    </div>
                  </div>
                )}
              </div>


              {/* Divider */}
              <div className="mx-2 h-6 w-px bg-foreground/10" />

              {/* Profile Dropdown */}
              <div className="relative">
                <button
                  onClick={() => {
                    setProfileOpen(!profileOpen);
                    setClientsOpen(false);
                    setBusinessOpen(false);
                    setMediaOpen(false);
                    setWebsiteOpen(false);
                  }}
                  className={cn(
                    "px-3 py-2 rounded-lg transition-all duration-200 flex items-center gap-2 group",
                    profileOpen || isActive("/admin/settings")
                      ? "bg-accent/10 text-accent"
                      : "text-foreground/70 hover:text-foreground hover:bg-foreground/5"
                  )}
                >
                  <div className="h-8 w-8 rounded-full bg-accent/20 flex items-center justify-center border border-accent/30 overflow-hidden">
                    {aboutImageUrl ? (
                      <img
                        src={aboutImageUrl}
                        alt="Profile"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <User className="h-4 w-4 text-accent" />
                    )}
                  </div>
                  <ChevronDown className={cn("h-3.5 w-3.5 transition-all duration-300", profileOpen && "rotate-180")} />
                </button>
                {profileOpen && (
                  <div className="absolute top-full right-0 mt-2 bg-background/95 backdrop-blur-xl border border-foreground/10 rounded-xl shadow-2xl py-2 min-w-[200px] z-100 animate-in fade-in slide-in-from-top-2 duration-200" data-dropdown>
                    <div className="px-2 py-1.5">
                      <Link
                        href="/admin/settings"
                        onClick={(e) => {
                          setTimeout(() => setProfileOpen(false), 0);
                        }}
                        className={cn(
                          "flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 group",
                          isActive("/admin/settings")
                            ? "text-accent bg-accent/10 shadow-sm"
                            : "text-foreground/80 hover:text-foreground hover:bg-foreground/5"
                        )}
                      >
                        <Settings className={cn("h-4 w-4 transition-transform group-hover:scale-110", isActive("/admin/settings") && "text-accent")} />
                        Settings
                      </Link>
                      <Link
                        href="/"
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => {
                          setTimeout(() => setProfileOpen(false), 0);
                        }}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 group text-foreground/80 hover:text-foreground hover:bg-foreground/5"
                      >
                        <ExternalLink className="h-4 w-4 transition-transform group-hover:scale-110" />
                        View Site
                      </Link>
                      <div className="my-1 h-px bg-foreground/10" />
                      <button
                        onClick={() => {
                          setProfileOpen(false);
                          handleLogout();
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 group text-foreground/80 hover:text-red-400 hover:bg-red-500/10"
                      >
                        <LogOut className="h-4 w-4 transition-transform group-hover:scale-110" />
                        Logout
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-foreground/70 hover:text-foreground hover:bg-foreground/5 transition-all duration-200"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu Overlay */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-foreground/5 bg-background/95 backdrop-blur-xl animate-in slide-in-from-top duration-200">
            <div className="px-4 py-4 space-y-1 max-h-[calc(100vh-4rem)] overflow-y-auto">
              {/* Dashboard */}
              <Link
                href="/admin"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setMobileDropdownsOpen({ website: false, clients: false, business: false, media: false });
                }}
                className={cn(
                  "block px-4 py-3 text-sm font-medium tracking-wide transition-all duration-200 rounded-lg",
                  isActive("/admin") && pathname === "/admin"
                    ? "text-accent bg-accent/10 shadow-sm"
                    : "text-foreground/80 hover:text-foreground hover:bg-foreground/5"
                )}
              >
                Dashboard
              </Link>

              {/* Website Mobile Dropdown */}
              <div>
                <button
                  onClick={() => toggleMobileDropdown('website')}
                  className={cn(
                    "w-full flex items-center justify-between px-4 py-3 text-sm font-medium tracking-wide transition-all duration-200 rounded-lg",
                    mobileDropdownsOpen.website || isWebsiteActive
                      ? "text-accent bg-accent/10 shadow-sm"
                      : "text-foreground/80 hover:text-foreground hover:bg-foreground/5"
                  )}
                >
                  <span>Website</span>
                  <ChevronDown className={cn("h-4 w-4 transition-all duration-300", mobileDropdownsOpen.website && "rotate-180")} />
                </button>
                {mobileDropdownsOpen.website && (
                  <div className="ml-4 mt-1 space-y-1 border-l-2 border-accent/20 pl-4 animate-in slide-in-from-left duration-200">
                    <Link
                      href="/admin/website-editor"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        setMobileDropdownsOpen({ website: false, clients: false, business: false, media: false });
                      }}
                      className={cn(
                        "flex items-center gap-3 px-4 py-2.5 text-sm font-medium tracking-wide transition-all duration-200 rounded-lg group",
                        isActive("/admin/website-editor")
                          ? "text-accent bg-accent/10 shadow-sm"
                          : "text-foreground/70 hover:text-foreground hover:bg-foreground/5"
                      )}
                    >
                      <Globe className={cn("h-4 w-4 transition-transform group-hover:scale-110", isActive("/admin/website-editor") && "text-accent")} />
                      Homepage Editor
                    </Link>
                    <Link
                      href="/admin/page-builder"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        setMobileDropdownsOpen({ website: false, clients: false, business: false, media: false });
                      }}
                      className={cn(
                        "flex items-center gap-3 px-4 py-2.5 text-sm font-medium tracking-wide transition-all duration-200 rounded-lg group",
                        isActive("/admin/page-builder")
                          ? "text-accent bg-accent/10 shadow-sm"
                          : "text-foreground/70 hover:text-foreground hover:bg-foreground/5"
                      )}
                    >
                      <Layers className={cn("h-4 w-4 transition-transform group-hover:scale-110", isActive("/admin/page-builder") && "text-accent")} />
                      Page Builder
                    </Link>
                    <Link
                      href="/admin/graphic-designer"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        setMobileDropdownsOpen({ website: false, clients: false, business: false, media: false });
                      }}
                      className={cn(
                        "flex items-center gap-3 px-4 py-2.5 text-sm font-medium tracking-wide transition-all duration-200 rounded-lg group",
                        isActive("/admin/graphic-designer")
                          ? "text-accent bg-accent/10 shadow-sm"
                          : "text-foreground/70 hover:text-foreground hover:bg-foreground/5"
                      )}
                    >
                      <Layers className={cn("h-4 w-4 transition-transform group-hover:scale-110", isActive("/admin/graphic-designer") && "text-accent")} />
                      Graphic Designer
                    </Link>
                  </div>
                )}
              </div>

              {/* Clients Mobile Dropdown */}
              <div>
                <button
                  onClick={() => toggleMobileDropdown('clients')}
                  className={cn(
                    "w-full flex items-center justify-between px-4 py-3 text-sm font-medium tracking-wide transition-all duration-200 rounded-lg",
                    mobileDropdownsOpen.clients || isClientsActive
                      ? "text-accent bg-accent/10 shadow-sm"
                      : "text-foreground/80 hover:text-foreground hover:bg-foreground/5"
                  )}
                >
                  <span>Clients</span>
                  <ChevronDown className={cn("h-4 w-4 transition-all duration-300", mobileDropdownsOpen.clients && "rotate-180")} />
                </button>
                {mobileDropdownsOpen.clients && (
                  <div className="ml-4 mt-1 space-y-1 border-l-2 border-accent/20 pl-4 animate-in slide-in-from-left duration-200">
                    <Link
                      href="/admin/client-projects"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        setMobileDropdownsOpen({ website: false, clients: false, business: false, media: false });
                      }}
                      className={cn(
                        "flex items-center gap-3 px-4 py-2.5 text-sm font-medium tracking-wide transition-all duration-200 rounded-lg group",
                        isActive("/admin/client-projects")
                          ? "text-accent bg-accent/10 shadow-sm"
                          : "text-foreground/70 hover:text-foreground hover:bg-foreground/5"
                      )}
                    >
                      <FolderKanban className={cn("h-4 w-4 transition-transform group-hover:scale-110", isActive("/admin/client-projects") && "text-accent")} />
                      Projects
                    </Link>
                    <Link
                      href="/admin/deliveries"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        setMobileDropdownsOpen({ website: false, clients: false, business: false, media: false });
                      }}
                      className={cn(
                        "flex items-center gap-3 px-4 py-2.5 text-sm font-medium tracking-wide transition-all duration-200 rounded-lg group",
                        isActive("/admin/deliveries")
                          ? "text-accent bg-accent/10 shadow-sm"
                          : "text-foreground/70 hover:text-foreground hover:bg-foreground/5"
                      )}
                    >
                      <Package className={cn("h-4 w-4 transition-transform group-hover:scale-110", isActive("/admin/deliveries") && "text-accent")} />
                      Portals
                    </Link>
                    <Link
                      href="/admin/feedback"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        setMobileDropdownsOpen({ website: false, clients: false, business: false, media: false });
                      }}
                      className={cn(
                        "flex items-center gap-3 px-4 py-2.5 text-sm font-medium tracking-wide transition-all duration-200 rounded-lg group",
                        isActive("/admin/feedback")
                          ? "text-accent bg-accent/10 shadow-sm"
                          : "text-foreground/70 hover:text-foreground hover:bg-foreground/5"
                      )}
                    >
                      <MessageSquare className={cn("h-4 w-4 transition-transform group-hover:scale-110", isActive("/admin/feedback") && "text-accent")} />
                      Feedback
                    </Link>
                  </div>
                )}
              </div>

              {/* Business Mobile Dropdown */}
              <div>
                <button
                  onClick={() => toggleMobileDropdown('business')}
                  className={cn(
                    "w-full flex items-center justify-between px-4 py-3 text-sm font-medium tracking-wide transition-all duration-200 rounded-lg",
                    mobileDropdownsOpen.business || isBusinessActive
                      ? "text-accent bg-accent/10 shadow-sm"
                      : "text-foreground/80 hover:text-foreground hover:bg-foreground/5"
                  )}
                >
                  <span>Business</span>
                  <ChevronDown className={cn("h-4 w-4 transition-all duration-300", mobileDropdownsOpen.business && "rotate-180")} />
                </button>
                {mobileDropdownsOpen.business && (
                  <div className="ml-4 mt-1 space-y-1 border-l-2 border-accent/20 pl-4 animate-in slide-in-from-left duration-200">
                    <Link
                      href="/admin/quote-calculator"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        setMobileDropdownsOpen({ website: false, clients: false, business: false, media: false });
                      }}
                      className={cn(
                        "flex items-center gap-3 px-4 py-2.5 text-sm font-medium tracking-wide transition-all duration-200 rounded-lg group",
                        isActive("/admin/quote-calculator")
                          ? "text-accent bg-accent/10 shadow-sm"
                          : "text-foreground/70 hover:text-foreground hover:bg-foreground/5"
                      )}
                    >
                      <Calculator className={cn("h-4 w-4 transition-transform group-hover:scale-110", isActive("/admin/quote-calculator") && "text-accent")} />
                      Quote Builder
                    </Link>
                    <Link
                      href="/admin/tools/pitch-deck-builder"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        setMobileDropdownsOpen({ website: false, clients: false, business: false, media: false });
                      }}
                      className={cn(
                        "flex items-center gap-3 px-4 py-2.5 text-sm font-medium tracking-wide transition-all duration-200 rounded-lg group",
                        isActive("/admin/tools/pitch-deck-builder")
                          ? "text-accent bg-accent/10 shadow-sm"
                          : "text-foreground/70 hover:text-foreground hover:bg-foreground/5"
                      )}
                    >
                      <Sliders className={cn("h-4 w-4 transition-transform group-hover:scale-110", isActive("/admin/tools/pitch-deck-builder") && "text-accent")} />
                      Pitch Deck Builder
                    </Link>
                    <Link
                      href="/admin/scheduling"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        setMobileDropdownsOpen({ website: false, clients: false, business: false, media: false });
                      }}
                      className={cn(
                        "flex items-center gap-3 px-4 py-2.5 text-sm font-medium tracking-wide transition-all duration-200 rounded-lg group",
                        isActive("/admin/scheduling")
                          ? "text-accent bg-accent/10 shadow-sm"
                          : "text-foreground/70 hover:text-foreground hover:bg-foreground/5"
                      )}
                    >
                      <Calendar className={cn("h-4 w-4 transition-transform group-hover:scale-110", isActive("/admin/scheduling") && "text-accent")} />
                      Scheduling
                    </Link>
                    <Link
                      href="/admin/email-marketing"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        setMobileDropdownsOpen({ website: false, clients: false, business: false, media: false });
                      }}
                      className={cn(
                        "flex items-center gap-3 px-4 py-2.5 text-sm font-medium tracking-wide transition-all duration-200 rounded-lg group",
                        isActive("/admin/email-marketing")
                          ? "text-accent bg-accent/10 shadow-sm"
                          : "text-foreground/70 hover:text-foreground hover:bg-foreground/5"
                      )}
                    >
                      <Mail className={cn("h-4 w-4 transition-transform group-hover:scale-110", isActive("/admin/email-marketing") && "text-accent")} />
                      Email Marketing
                    </Link>
                    <Link
                      href="/admin/qr-codes"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        setMobileDropdownsOpen({ website: false, clients: false, business: false, media: false });
                      }}
                      className={cn(
                        "flex items-center gap-3 px-4 py-2.5 text-sm font-medium tracking-wide transition-all duration-200 rounded-lg group",
                        isActive("/admin/qr-codes")
                          ? "text-accent bg-accent/10 shadow-sm"
                          : "text-foreground/70 hover:text-foreground hover:bg-foreground/5"
                      )}
                    >
                      <QrCode className={cn("h-4 w-4 transition-transform group-hover:scale-110", isActive("/admin/qr-codes") && "text-accent")} />
                      QR Codes
                    </Link>
                  </div>
                )}
              </div>

              {/* Media Mobile Dropdown */}
              <div>
                <button
                  onClick={() => toggleMobileDropdown('media')}
                  className={cn(
                    "w-full flex items-center justify-between px-4 py-3 text-sm font-medium tracking-wide transition-all duration-200 rounded-lg",
                    mobileDropdownsOpen.media || isMediaActive
                      ? "text-accent bg-accent/10 shadow-sm"
                      : "text-foreground/80 hover:text-foreground hover:bg-foreground/5"
                  )}
                >
                  <span>Media</span>
                  <ChevronDown className={cn("h-4 w-4 transition-all duration-300", mobileDropdownsOpen.media && "rotate-180")} />
                </button>
                {mobileDropdownsOpen.media && (
                  <div className="ml-4 mt-1 space-y-1 border-l-2 border-accent/20 pl-4 animate-in slide-in-from-left duration-200">
                    <Link
                      href="/admin/tools/media-library"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        setMobileDropdownsOpen({ website: false, clients: false, business: false, media: false });
                      }}
                      className={cn(
                        "flex items-center gap-3 px-4 py-2.5 text-sm font-medium tracking-wide transition-all duration-200 rounded-lg group",
                        isActive("/admin/tools/media-library")
                          ? "text-accent bg-accent/10 shadow-sm"
                          : "text-foreground/70 hover:text-foreground hover:bg-foreground/5"
                      )}
                    >
                      <Images className={cn("h-4 w-4 transition-transform group-hover:scale-110", isActive("/admin/tools/media-library") && "text-accent")} />
                      Media Library
                    </Link>
                    <Link
                      href="/admin/image-compressor"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        setMobileDropdownsOpen({ website: false, clients: false, business: false, media: false });
                      }}
                      className={cn(
                        "flex items-center gap-3 px-4 py-2.5 text-sm font-medium tracking-wide transition-all duration-200 rounded-lg group",
                        isActive("/admin/image-compressor")
                          ? "text-accent bg-accent/10 shadow-sm"
                          : "text-foreground/70 hover:text-foreground hover:bg-foreground/5"
                      )}
                    >
                      <Minimize2 className={cn("h-4 w-4 transition-transform group-hover:scale-110", isActive("/admin/image-compressor") && "text-accent")} />
                      Image Compressor
                    </Link>
                    <Link
                      href="/admin/file-converter"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        setMobileDropdownsOpen({ website: false, clients: false, business: false, media: false });
                      }}
                      className={cn(
                        "flex items-center gap-3 px-4 py-2.5 text-sm font-medium tracking-wide transition-all duration-200 rounded-lg group",
                        isActive("/admin/file-converter")
                          ? "text-accent bg-accent/10 shadow-sm"
                          : "text-foreground/70 hover:text-foreground hover:bg-foreground/5"
                      )}
                    >
                      <RefreshCw className={cn("h-4 w-4 transition-transform group-hover:scale-110", isActive("/admin/file-converter") && "text-accent")} />
                      File Converter
                    </Link>
                  </div>
                )}
              </div>

              {/* Divider */}
              <div className="my-2 h-px bg-foreground/10" />

              {/* Profile Section */}
              <div className="px-4 py-2">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-10 w-10 rounded-full bg-accent/20 flex items-center justify-center border border-accent/30 overflow-hidden">
                    {aboutImageUrl ? (
                      <img
                        src={aboutImageUrl}
                        alt="Profile"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <User className="h-5 w-5 text-accent" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Profile</p>
                  </div>
                </div>
                <div className="space-y-1">
                  <Link
                    href="/admin/settings"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setMobileDropdownsOpen({ website: false, clients: false, business: false, media: false });
                    }}
                    className={cn(
                      "flex items-center gap-3 px-4 py-2.5 text-sm font-medium tracking-wide transition-all duration-200 rounded-lg group",
                      isActive("/admin/settings")
                        ? "text-accent bg-accent/10 shadow-sm"
                        : "text-foreground/80 hover:text-foreground hover:bg-foreground/5"
                    )}
                  >
                    <Settings className={cn("h-4 w-4 transition-transform group-hover:scale-110", isActive("/admin/settings") && "text-accent")} />
                    Settings
                  </Link>
                  <Link
                    href="/"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setMobileDropdownsOpen({ website: false, clients: false, business: false, media: false });
                    }}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium tracking-wide transition-all duration-200 rounded-lg group text-foreground/80 hover:text-foreground hover:bg-foreground/5"
                  >
                    <ExternalLink className="h-4 w-4 transition-transform group-hover:scale-110" />
                    View Site
                  </Link>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setMobileDropdownsOpen({ website: false, clients: false, business: false, media: false });
                      handleLogout();
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium tracking-wide transition-all duration-200 rounded-lg group text-foreground/80 hover:text-red-400 hover:bg-red-500/10"
                  >
                    <LogOut className="h-4 w-4 transition-transform group-hover:scale-110" />
                    Logout
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </nav>
      <main className="bg-background">{children}</main>
      
      {/* Floating Notes Button */}
      <FloatingNotesButton />
      
      {/* Click outside to close dropdowns */}
      {(clientsOpen || businessOpen || mediaOpen || websiteOpen || profileOpen) && (
        <div 
          className="fixed inset-0 z-90 hidden md:block" 
          onClick={(e) => {
            // Don't close if clicking on a link or inside a dropdown
            const target = e.target as HTMLElement;
            if (target.closest('a') || target.closest('[role="menu"]') || target.closest('[data-dropdown]')) {
              return;
            }
            setClientsOpen(false);
            setBusinessOpen(false);
            setMediaOpen(false);
            setWebsiteOpen(false);
            setProfileOpen(false);
          }}
        />
      )}
    </div>
  );
}

