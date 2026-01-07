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
  Images,
  User,
  Settings,
  Layout,
  FolderKanban,
  UserCircle,
  Phone
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
  
  const [websiteOpen, setWebsiteOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileWebsiteOpen, setMobileWebsiteOpen] = useState(false);
  
  useEffect(() => {
    // Only redirect if we're done checking and not authenticated
    if (!isChecking && !isAuthenticated && pathname !== "/admin/login") {
      router.push("/admin/login");
      return;
    }
    // Close dropdowns when navigating
    if (pathname) {
      setWebsiteOpen(false);
      setProfileOpen(false);
      setMobileMenuOpen(false);
      setMobileWebsiteOpen(false);
    }
  }, [pathname, isChecking, isAuthenticated, router]);

  // Show loading while checking auth, but allow login page to render
  if (isChecking && pathname !== "/admin/login") {
    return (
      <div className="flex min-h-screen items-center justify-center transition-opacity duration-500 ease-out" style={{ backgroundColor: '#FAFAF9' }}>
        <div className="text-center">
          <div className="mb-4 flex items-center justify-center">
            <div className="p-3 rounded-xl" style={{ backgroundColor: '#586034' }}>
              <Image
                src="/smallbrandmark-alexgrosse-white.svg"
                alt="Loading"
                width={32}
                height={32}
                className="h-8 w-8 object-contain"
                style={{
                  animation: 'pulseOpacity 2s ease-in-out infinite',
                }}
              />
            </div>
          </div>
          <p 
            className="uppercase tracking-wider text-sm font-medium"
            style={{
              animation: 'pulseDots 1.5s ease-in-out infinite',
              color: '#888'
            }}
          >
            Loading<span className="inline-block" style={{ animation: 'pulseDots 1.5s ease-in-out infinite 0.2s' }}>.</span><span className="inline-block" style={{ animation: 'pulseDots 1.5s ease-in-out infinite 0.4s' }}>.</span><span className="inline-block" style={{ animation: 'pulseDots 1.5s ease-in-out infinite 0.6s' }}>.</span>
          </p>
        </div>
      </div>
    );
  }

  // Redirect if not authenticated
  if (!isChecking && !isAuthenticated && pathname !== "/admin/login") {
    return (
      <div className="flex min-h-screen items-center justify-center transition-opacity duration-500 ease-out" style={{ backgroundColor: '#FAFAF9' }}>
        <div className="text-center">
          <div className="mb-4 flex items-center justify-center">
            <div className="p-3 rounded-xl" style={{ backgroundColor: '#586034' }}>
              <Image
                src="/smallbrandmark-alexgrosse-white.svg"
                alt="Loading"
                width={32}
                height={32}
                className="h-8 w-8 object-contain"
                style={{
                  animation: 'pulseOpacity 2s ease-in-out infinite',
                }}
              />
            </div>
          </div>
          <p 
            className="uppercase tracking-wider text-sm font-medium"
            style={{
              animation: 'pulseDots 1.5s ease-in-out infinite',
              color: '#888'
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
  const isWebsiteActive = isActive("/admin/website-editor") || isActive("/admin/portfolio") || isActive("/admin/projects");
  const isMediaActive = isActive("/admin/media-library");
  const isLeadsActive = isActive("/admin/leads");

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
    <div className="min-h-screen" style={{ backgroundColor: '#FAFAF9', color: '#1a1a1a' }}>
      {/* Accent top bar */}
      <div className="h-1.5 w-full" style={{ backgroundColor: '#586034' }} />
      <nav className="sticky top-0 z-100 border-b shadow-sm" style={{ borderColor: 'rgba(88, 96, 52, 0.15)', backgroundColor: 'rgba(255, 255, 255, 0.98)', backdropFilter: 'blur(12px)' }}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Logo/Brand */}
            <Link href="/admin/website-editor/hero" className="flex items-center gap-3 group" onClick={() => setMobileMenuOpen(false)}>
              <div className="relative overflow-hidden rounded-xl p-2 transition-all duration-300 group-hover:scale-105" style={{ backgroundColor: '#586034' }}>
                <Image
                  src="/smallbrandmark-alexgrosse-white.svg"
                  alt="Admin"
                  width={32}
                  height={32}
                  className="h-6 w-6 object-contain"
                />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-black uppercase tracking-wider" style={{ fontWeight: '900', color: '#586034' }}>
                  Alex Grosse
                </span>
                <span className="text-[10px] font-medium uppercase tracking-widest -mt-0.5" style={{ color: '#888' }}>
                  Admin Panel
                </span>
              </div>
            </Link>
            
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-1">
              {/* Website Editor Dropdown */}
              <div className="relative">
                <button
                  onClick={() => {
                    setWebsiteOpen(!websiteOpen);
                    setProfileOpen(false);
                  }}
                  className={cn(
                    "px-4 py-2.5 text-sm font-bold uppercase tracking-wider transition-all duration-200 rounded-lg flex items-center gap-2 group border",
                    websiteOpen || isWebsiteActive
                      ? "border-accent/30" 
                      : "border-transparent hover:border-accent/20"
                  )}
                  style={{ 
                    fontWeight: '700',
                    color: websiteOpen || isWebsiteActive ? '#586034' : '#555',
                    backgroundColor: websiteOpen || isWebsiteActive ? 'rgba(88, 96, 52, 0.1)' : 'transparent'
                  }}
                >
                  Website
                  <ChevronDown className={cn("h-3.5 w-3.5 transition-all duration-300", websiteOpen && "rotate-180")} />
                </button>
                {websiteOpen && (
                  <div className="absolute top-full left-0 mt-2 border rounded-xl shadow-xl py-2 min-w-[220px] z-100 animate-in fade-in slide-in-from-top-2 duration-200" style={{ backgroundColor: '#fff', borderColor: 'rgba(88, 96, 52, 0.2)' }} data-dropdown>
                    <div className="px-2 py-1.5">
                      <Link
                        href="/admin/website-editor/hero"
                        onClick={() => setWebsiteOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 group"
                        style={{ 
                          color: isActive("/admin/website-editor/hero") ? '#586034' : '#555',
                          backgroundColor: isActive("/admin/website-editor/hero") ? 'rgba(88, 96, 52, 0.1)' : 'transparent'
                        }}
                      >
                        <Layout className="h-4 w-4 transition-transform group-hover:scale-110" style={{ color: isActive("/admin/website-editor/hero") ? '#586034' : undefined }} />
                        Hero
                      </Link>
                      <Link
                        href="/admin/website-editor/portfolio"
                        onClick={() => setWebsiteOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 group"
                        style={{ 
                          color: isActive("/admin/website-editor/portfolio") || isActive("/admin/portfolio") ? '#586034' : '#555',
                          backgroundColor: isActive("/admin/website-editor/portfolio") || isActive("/admin/portfolio") ? 'rgba(88, 96, 52, 0.1)' : 'transparent'
                        }}
                      >
                        <Globe className="h-4 w-4 transition-transform group-hover:scale-110" style={{ color: (isActive("/admin/website-editor/portfolio") || isActive("/admin/portfolio")) ? '#586034' : undefined }} />
                        Portfolio
                      </Link>
                      <Link
                        href="/admin/website-editor/projects"
                        onClick={() => setWebsiteOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 group"
                        style={{ 
                          color: isActive("/admin/website-editor/projects") || isActive("/admin/projects") ? '#586034' : '#555',
                          backgroundColor: isActive("/admin/website-editor/projects") || isActive("/admin/projects") ? 'rgba(88, 96, 52, 0.1)' : 'transparent'
                        }}
                      >
                        <FolderKanban className="h-4 w-4 transition-transform group-hover:scale-110" style={{ color: (isActive("/admin/website-editor/projects") || isActive("/admin/projects")) ? '#586034' : undefined }} />
                        Projects
                      </Link>
                      <Link
                        href="/admin/website-editor/about"
                        onClick={() => setWebsiteOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 group"
                        style={{ 
                          color: isActive("/admin/website-editor/about") ? '#586034' : '#555',
                          backgroundColor: isActive("/admin/website-editor/about") ? 'rgba(88, 96, 52, 0.1)' : 'transparent'
                        }}
                      >
                        <UserCircle className="h-4 w-4 transition-transform group-hover:scale-110" style={{ color: isActive("/admin/website-editor/about") ? '#586034' : undefined }} />
                        About
                      </Link>
                      <Link
                        href="/admin/website-editor/contact"
                        onClick={() => setWebsiteOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 group"
                        style={{ 
                          color: isActive("/admin/website-editor/contact") ? '#586034' : '#555',
                          backgroundColor: isActive("/admin/website-editor/contact") ? 'rgba(88, 96, 52, 0.1)' : 'transparent'
                        }}
                      >
                        <Phone className="h-4 w-4 transition-transform group-hover:scale-110" style={{ color: isActive("/admin/website-editor/contact") ? '#586034' : undefined }} />
                        Contact
                      </Link>
                    </div>
                  </div>
                )}
              </div>

              {/* Media Library - Direct Link */}
              <Link
                href="/admin/media-library"
                className="px-4 py-2.5 text-sm font-bold uppercase tracking-wider transition-all duration-200 rounded-lg flex items-center gap-2 border"
                style={{ 
                  fontWeight: '700',
                  color: isMediaActive ? '#586034' : '#555',
                  backgroundColor: isMediaActive ? 'rgba(88, 96, 52, 0.1)' : 'transparent',
                  borderColor: isMediaActive ? 'rgba(88, 96, 52, 0.3)' : 'transparent'
                }}
              >
                <Images className="h-4 w-4" />
                Media
              </Link>

              {/* Leads - Direct Link */}
              <Link
                href="/admin/leads"
                className="px-4 py-2.5 text-sm font-bold uppercase tracking-wider transition-all duration-200 rounded-lg flex items-center gap-2 border"
                style={{ 
                  fontWeight: '700',
                  color: isActive("/admin/leads") ? '#586034' : '#555',
                  backgroundColor: isActive("/admin/leads") ? 'rgba(88, 96, 52, 0.1)' : 'transparent',
                  borderColor: isActive("/admin/leads") ? 'rgba(88, 96, 52, 0.3)' : 'transparent'
                }}
              >
                <User className="h-4 w-4" />
                Leads
              </Link>

              {/* Divider */}
              <div className="mx-3 h-8 w-px" style={{ backgroundColor: 'rgba(88, 96, 52, 0.2)' }} />

              {/* Profile Dropdown */}
              <div className="relative">
                <button
                  onClick={() => {
                    setProfileOpen(!profileOpen);
                    setWebsiteOpen(false);
                  }}
                  className="px-3 py-2 rounded-lg transition-all duration-200 flex items-center gap-2 group border"
                  style={{
                    backgroundColor: profileOpen || isActive("/admin/settings") ? 'rgba(88, 96, 52, 0.1)' : 'transparent',
                    borderColor: profileOpen || isActive("/admin/settings") ? 'rgba(88, 96, 52, 0.3)' : 'transparent'
                  }}
                >
                  <div className="h-9 w-9 rounded-full flex items-center justify-center border-2 overflow-hidden" style={{ backgroundColor: 'rgba(88, 96, 52, 0.15)', borderColor: 'rgba(88, 96, 52, 0.4)' }}>
                    {aboutImageUrl ? (
                      <img
                        src={aboutImageUrl}
                        alt="Profile"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <User className="h-4 w-4" style={{ color: '#586034' }} />
                    )}
                  </div>
                  <ChevronDown className={cn("h-3.5 w-3.5 transition-all duration-300", profileOpen && "rotate-180")} style={{ color: '#586034' }} />
                </button>
                {profileOpen && (
                  <div className="absolute top-full right-0 mt-2 border rounded-xl shadow-xl py-2 min-w-[200px] z-100 animate-in fade-in slide-in-from-top-2 duration-200" style={{ backgroundColor: '#fff', borderColor: 'rgba(88, 96, 52, 0.2)' }} data-dropdown>
                    <div className="px-2 py-1.5">
                      <Link
                        href="/admin/settings"
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 group"
                        style={{
                          color: isActive("/admin/settings") ? '#586034' : '#555',
                          backgroundColor: isActive("/admin/settings") ? 'rgba(88, 96, 52, 0.1)' : 'transparent'
                        }}
                      >
                        <Settings className="h-4 w-4 transition-transform group-hover:scale-110" style={{ color: isActive("/admin/settings") ? '#586034' : undefined }} />
                        Settings
                      </Link>
                      <Link
                        href="/"
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 group hover:bg-gray-50"
                        style={{ color: '#555' }}
                      >
                        <ExternalLink className="h-4 w-4 transition-transform group-hover:scale-110" />
                        View Site
                      </Link>
                      <div className="my-1 h-px" style={{ backgroundColor: 'rgba(0,0,0,0.08)' }} />
                      <button
                        onClick={() => {
                          setProfileOpen(false);
                          handleLogout();
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 group hover:bg-red-50"
                        style={{ color: '#666' }}
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
              className="md:hidden p-2.5 rounded-lg transition-all duration-200 border"
              style={{ color: '#586034', backgroundColor: 'rgba(88, 96, 52, 0.1)', borderColor: 'rgba(88, 96, 52, 0.2)' }}
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
          <div className="md:hidden border-t animate-in slide-in-from-top duration-200" style={{ borderColor: 'rgba(88, 96, 52, 0.15)', backgroundColor: '#fff' }}>
            <div className="px-4 py-4 space-y-1 max-h-[calc(100vh-4rem)] overflow-y-auto">
              {/* Website Editor Mobile Dropdown */}
              <div>
                <button
                  onClick={() => setMobileWebsiteOpen(!mobileWebsiteOpen)}
                  className="w-full flex items-center justify-between px-4 py-3 text-sm font-bold uppercase tracking-wider transition-all duration-200 rounded-lg border"
                  style={{ 
                    fontWeight: '700',
                    color: mobileWebsiteOpen || isWebsiteActive ? '#586034' : '#555',
                    backgroundColor: mobileWebsiteOpen || isWebsiteActive ? 'rgba(88, 96, 52, 0.1)' : 'transparent',
                    borderColor: mobileWebsiteOpen || isWebsiteActive ? 'rgba(88, 96, 52, 0.3)' : 'transparent'
                  }}
                >
                  <span>Website</span>
                  <ChevronDown className={cn("h-4 w-4 transition-all duration-300", mobileWebsiteOpen && "rotate-180")} />
                </button>
                {mobileWebsiteOpen && (
                  <div className="ml-4 mt-1 space-y-1 border-l-2 pl-4 animate-in slide-in-from-left duration-200" style={{ borderColor: 'rgba(88, 96, 52, 0.2)' }}>
                    <Link
                      href="/admin/website-editor/hero"
                      onClick={() => { setMobileMenuOpen(false); setMobileWebsiteOpen(false); }}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium tracking-wide transition-all duration-200 rounded-lg group"
                      style={{ 
                        color: isActive("/admin/website-editor/hero") ? '#586034' : '#555',
                        backgroundColor: isActive("/admin/website-editor/hero") ? 'rgba(88, 96, 52, 0.1)' : 'transparent'
                      }}
                    >
                      <Layout className="h-4 w-4 transition-transform group-hover:scale-110" style={{ color: isActive("/admin/website-editor/hero") ? '#586034' : undefined }} />
                      Hero
                    </Link>
                    <Link
                      href="/admin/website-editor/portfolio"
                      onClick={() => { setMobileMenuOpen(false); setMobileWebsiteOpen(false); }}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium tracking-wide transition-all duration-200 rounded-lg group"
                      style={{ 
                        color: isActive("/admin/website-editor/portfolio") || isActive("/admin/portfolio") ? '#586034' : '#555',
                        backgroundColor: isActive("/admin/website-editor/portfolio") || isActive("/admin/portfolio") ? 'rgba(88, 96, 52, 0.1)' : 'transparent'
                      }}
                    >
                      <Globe className="h-4 w-4 transition-transform group-hover:scale-110" style={{ color: (isActive("/admin/website-editor/portfolio") || isActive("/admin/portfolio")) ? '#586034' : undefined }} />
                      Portfolio
                    </Link>
                    <Link
                      href="/admin/website-editor/projects"
                      onClick={() => { setMobileMenuOpen(false); setMobileWebsiteOpen(false); }}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium tracking-wide transition-all duration-200 rounded-lg group"
                      style={{ 
                        color: isActive("/admin/website-editor/projects") || isActive("/admin/projects") ? '#586034' : '#555',
                        backgroundColor: isActive("/admin/website-editor/projects") || isActive("/admin/projects") ? 'rgba(88, 96, 52, 0.1)' : 'transparent'
                      }}
                    >
                      <FolderKanban className="h-4 w-4 transition-transform group-hover:scale-110" style={{ color: (isActive("/admin/website-editor/projects") || isActive("/admin/projects")) ? '#586034' : undefined }} />
                      Projects
                    </Link>
                    <Link
                      href="/admin/website-editor/about"
                      onClick={() => { setMobileMenuOpen(false); setMobileWebsiteOpen(false); }}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium tracking-wide transition-all duration-200 rounded-lg group"
                      style={{ 
                        color: isActive("/admin/website-editor/about") ? '#586034' : '#555',
                        backgroundColor: isActive("/admin/website-editor/about") ? 'rgba(88, 96, 52, 0.1)' : 'transparent'
                      }}
                    >
                      <UserCircle className="h-4 w-4 transition-transform group-hover:scale-110" style={{ color: isActive("/admin/website-editor/about") ? '#586034' : undefined }} />
                      About
                    </Link>
                    <Link
                      href="/admin/website-editor/contact"
                      onClick={() => { setMobileMenuOpen(false); setMobileWebsiteOpen(false); }}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium tracking-wide transition-all duration-200 rounded-lg group"
                      style={{ 
                        color: isActive("/admin/website-editor/contact") ? '#586034' : '#555',
                        backgroundColor: isActive("/admin/website-editor/contact") ? 'rgba(88, 96, 52, 0.1)' : 'transparent'
                      }}
                    >
                      <Phone className="h-4 w-4 transition-transform group-hover:scale-110" style={{ color: isActive("/admin/website-editor/contact") ? '#586034' : undefined }} />
                      Contact
                    </Link>
                  </div>
                )}
              </div>

              {/* Media Library */}
              <Link
                href="/admin/media-library"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 text-sm font-bold uppercase tracking-wider transition-all duration-200 rounded-lg border"
                style={{ 
                  fontWeight: '700',
                  color: isMediaActive ? '#586034' : '#555',
                  backgroundColor: isMediaActive ? 'rgba(88, 96, 52, 0.1)' : 'transparent',
                  borderColor: isMediaActive ? 'rgba(88, 96, 52, 0.3)' : 'transparent'
                }}
              >
                <Images className="h-4 w-4" />
                Media
              </Link>

              {/* Leads */}
              <Link
                href="/admin/leads"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 text-sm font-bold uppercase tracking-wider transition-all duration-200 rounded-lg border"
                style={{ 
                  fontWeight: '700',
                  color: isLeadsActive ? '#586034' : '#555',
                  backgroundColor: isLeadsActive ? 'rgba(88, 96, 52, 0.1)' : 'transparent',
                  borderColor: isLeadsActive ? 'rgba(88, 96, 52, 0.3)' : 'transparent'
                }}
              >
                <User className="h-4 w-4" />
                Leads
              </Link>

              {/* Divider */}
              <div className="my-3 h-px" style={{ backgroundColor: 'rgba(88, 96, 52, 0.15)' }} />

              {/* Profile Section */}
              <div className="px-4 py-2">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-11 w-11 rounded-full flex items-center justify-center border-2 overflow-hidden" style={{ backgroundColor: 'rgba(88, 96, 52, 0.15)', borderColor: 'rgba(88, 96, 52, 0.4)' }}>
                    {aboutImageUrl ? (
                      <img
                        src={aboutImageUrl}
                        alt="Profile"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <User className="h-5 w-5" style={{ color: '#586034' }} />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-bold uppercase tracking-wider" style={{ fontWeight: '700', color: '#586034' }}>Profile</p>
                    <p className="text-[10px] uppercase tracking-widest" style={{ color: '#888' }}>Account Settings</p>
                  </div>
                </div>
                <div className="space-y-1">
                  <Link
                    href="/admin/settings"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium tracking-wide transition-all duration-200 rounded-lg group"
                    style={{ 
                      color: isActive("/admin/settings") ? '#586034' : '#555',
                      backgroundColor: isActive("/admin/settings") ? 'rgba(88, 96, 52, 0.1)' : 'transparent'
                    }}
                  >
                    <Settings className="h-4 w-4 transition-transform group-hover:scale-110" style={{ color: isActive("/admin/settings") ? '#586034' : undefined }} />
                    Settings
                  </Link>
                  <Link
                    href="/"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium tracking-wide transition-all duration-200 rounded-lg group hover:bg-gray-50"
                    style={{ color: '#555' }}
                  >
                    <ExternalLink className="h-4 w-4 transition-transform group-hover:scale-110" />
                    View Site
                  </Link>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      handleLogout();
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium tracking-wide transition-all duration-200 rounded-lg group hover:bg-red-50"
                    style={{ color: '#666' }}
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
      <main className="min-h-[calc(100vh-5rem)]" style={{ backgroundColor: '#FAFAF9' }}>{children}</main>
      
      {/* Floating Notes Button */}
      <FloatingNotesButton />
      
      {/* Click outside to close dropdowns */}
      {(websiteOpen || profileOpen) && (
        <div 
          className="fixed inset-0 z-90 hidden md:block" 
          onClick={(e) => {
            const target = e.target as HTMLElement;
            if (target.closest('a') || target.closest('[role="menu"]') || target.closest('[data-dropdown]')) {
              return;
            }
            setWebsiteOpen(false);
            setProfileOpen(false);
          }}
        />
      )}
    </div>
  );
}
