"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { ArrowRight, AlertCircle, Clock, MessageSquare, Package, Users, Calendar, QrCode, Mail, Settings, FileText, Image as ImageIcon, File, Globe, Layers, FolderKanban, Calculator, Sliders, Minimize2, RefreshCw, TrendingUp, Sparkles } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export default function AdminDashboard() {
  const router = useRouter();
  const { adminEmail } = useAdminAuth();

  const projects = useQuery(api.projects.list) || [];
  const allDeliveries = useQuery(
    api.deliveries.listAll,
    adminEmail ? { email: adminEmail } : ("skip" as const)
  ) || [];
  
  // Safely query feedback
  const feedbackModule = (api as any).feedback;
  const canQueryFeedback = feedbackModule && 
                          typeof feedbackModule.getRecentFeedback !== "undefined" &&
                          typeof feedbackModule.getUnreadFeedbackCount !== "undefined";
  
  const recentFeedback = useQuery(
    canQueryFeedback ? feedbackModule.getRecentFeedback : ("skip" as any),
    adminEmail && canQueryFeedback ? { email: adminEmail, limit: 5 } : ("skip" as const)
  );
  
  const unreadFeedbackCount = useQuery(
    canQueryFeedback ? feedbackModule.getUnreadFeedbackCount : ("skip" as any),
    adminEmail && canQueryFeedback ? { email: adminEmail } : ("skip" as const)
  );

  // Active deliveries expiring soon (next 7 days)
  const now = Date.now();
  const sevenDaysFromNow = now + (7 * 24 * 60 * 60 * 1000);
  const expiringDeliveries = allDeliveries.filter((d) => {
    const isFreeExpired = d.expiresAt && d.expiresAt < now;
    const isPaidActive = d.storageSubscriptionStatus === "active" && 
                         d.storageSubscriptionExpiresAt && 
                         d.storageSubscriptionExpiresAt > now;
    const isActive = !isFreeExpired || isPaidActive;
    
    if (!isActive) return false;
    
    // Check if expiring soon
    const expiryDate = d.storageSubscriptionExpiresAt || d.expiresAt;
    return expiryDate && expiryDate < sevenDaysFromNow && expiryDate > now;
  });

  // Active projects stuck (not updated in 7+ days)
  const staleProjects = projects.filter((p) => {
    if (p.status === "approved" || p.status === "delivered") return false;
    const lastUpdate = p.updatedAt || p.createdAt;
    const daysSinceUpdate = (now - lastUpdate) / (24 * 60 * 60 * 1000);
    return daysSinceUpdate > 7;
  });

  const feedbackArray = Array.isArray(recentFeedback) ? recentFeedback : [];
  const feedbackCount = typeof unreadFeedbackCount === 'number' ? unreadFeedbackCount : 0;

  // Stats
  const activeDeliveries = allDeliveries.filter((d) => {
    const isFreeExpired = d.expiresAt && d.expiresAt < now;
    const isPaidActive = d.storageSubscriptionStatus === "active" && 
                         d.storageSubscriptionExpiresAt && 
                         d.storageSubscriptionExpiresAt > now;
    return !isFreeExpired || isPaidActive;
  });

  const activeProjects = projects.filter((p) => 
    p.status !== "approved" && p.status !== "delivered" && p.status !== "archived"
  );

  // Quick links organized by category (matching new navigation structure)
  const quickLinks = {
    website: [
      { href: "/admin/website-editor", label: "Homepage Editor", icon: Globe, description: "Manage homepage content" },
      { href: "/admin/page-builder", label: "Page Builder", icon: Layers, description: "Create landing pages" },
    ],
    clients: [
      { href: "/admin/client-projects", label: "Projects", icon: FolderKanban, description: "Manage client projects" },
      { href: "/admin/deliveries", label: "Portals", icon: Package, description: "Delivery portals" },
      { href: "/admin/feedback", label: "Feedback", icon: MessageSquare, description: "Client feedback" },
    ],
    business: [
      { href: "/admin/quote-calculator", label: "Quote Builder", icon: Calculator, description: "Generate quotes" },
      { href: "/admin/tools/pitch-deck-builder", label: "Pitch Deck Builder", icon: Sliders, description: "Create pitch decks" },
      { href: "/admin/scheduling", label: "Scheduling", icon: Calendar, description: "Manage calendar" },
      { href: "/admin/email-marketing", label: "Email Marketing", icon: Mail, description: "Email campaigns" },
      { href: "/admin/qr-codes", label: "QR Codes", icon: QrCode, description: "Generate QR codes" },
    ],
    media: [
      { href: "/admin/tools/media-library", label: "Media Library", icon: ImageIcon, description: "Manage assets" },
      { href: "/admin/image-compressor", label: "Image Compressor", icon: Minimize2, description: "Optimize images" },
      { href: "/admin/file-converter", label: "File Converter", icon: RefreshCw, description: "Convert files" },
    ],
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 sm:py-12">
      {/* Header */}
      <div className="mb-8 sm:mb-12">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-xl bg-linear-to-br from-accent/20 to-accent/10 border border-accent/20">
            <Sparkles className="h-6 w-6 text-accent" />
          </div>
          <div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight text-foreground" style={{ fontWeight: '900', letterSpacing: '-0.02em' }}>
              Dashboard
            </h1>
            <p className="text-foreground/60 text-sm sm:text-base mt-1">
              Overview of your admin site and quick access to key features
            </p>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8 sm:mb-12">
        <Card className="group relative overflow-hidden border border-foreground/10 hover:border-accent/30 transition-all duration-300 hover:shadow-lg hover:shadow-accent/10 bg-linear-to-br from-background to-foreground/5">
          <div className="absolute inset-0 bg-linear-to-br from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <CardHeader className="pb-3 relative z-10">
            <CardTitle className="text-xs font-black uppercase tracking-wider text-foreground/50 flex items-center gap-2" style={{ fontWeight: '900' }}>
              <div className="p-1.5 rounded-lg bg-accent/10 group-hover:bg-accent/20 transition-colors">
                <Package className="h-3.5 w-3.5 text-accent" />
              </div>
              Active Portals
            </CardTitle>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-4xl sm:text-5xl font-black text-foreground mb-3" style={{ fontWeight: '900' }}>
              {activeDeliveries.length}
            </div>
            <Link href="/admin/deliveries" className="text-xs text-accent hover:text-accent/80 font-bold uppercase tracking-wider inline-flex items-center gap-1.5 group/link">
              View all
              <ArrowRight className="h-3 w-3 group-hover/link:translate-x-1 transition-transform" />
            </Link>
          </CardContent>
        </Card>

        <Card className="group relative overflow-hidden border border-foreground/10 hover:border-accent/30 transition-all duration-300 hover:shadow-lg hover:shadow-accent/10 bg-linear-to-br from-background to-foreground/5">
          <div className="absolute inset-0 bg-linear-to-br from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <CardHeader className="pb-3 relative z-10">
            <CardTitle className="text-xs font-black uppercase tracking-wider text-foreground/50 flex items-center gap-2" style={{ fontWeight: '900' }}>
              <div className="p-1.5 rounded-lg bg-accent/10 group-hover:bg-accent/20 transition-colors">
                <MessageSquare className="h-3.5 w-3.5 text-accent" />
              </div>
              Unread Feedback
            </CardTitle>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-4xl sm:text-5xl font-black text-foreground mb-3" style={{ fontWeight: '900' }}>
              {feedbackCount}
            </div>
            <Link href="/admin/feedback" className="text-xs text-accent hover:text-accent/80 font-bold uppercase tracking-wider inline-flex items-center gap-1.5 group/link">
              View feedback
              <ArrowRight className="h-3 w-3 group-hover/link:translate-x-1 transition-transform" />
            </Link>
          </CardContent>
        </Card>

        <Card className="group relative overflow-hidden border border-foreground/10 hover:border-accent/30 transition-all duration-300 hover:shadow-lg hover:shadow-accent/10 bg-linear-to-br from-background to-foreground/5">
          <div className="absolute inset-0 bg-linear-to-br from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <CardHeader className="pb-3 relative z-10">
            <CardTitle className="text-xs font-black uppercase tracking-wider text-foreground/50 flex items-center gap-2" style={{ fontWeight: '900' }}>
              <div className="p-1.5 rounded-lg bg-accent/10 group-hover:bg-accent/20 transition-colors">
                <Users className="h-3.5 w-3.5 text-accent" />
              </div>
              Active Projects
            </CardTitle>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-4xl sm:text-5xl font-black text-foreground mb-3" style={{ fontWeight: '900' }}>
              {activeProjects.length}
            </div>
            <Link href="/admin/client-projects" className="text-xs text-accent hover:text-accent/80 font-bold uppercase tracking-wider inline-flex items-center gap-1.5 group/link">
              View projects
              <ArrowRight className="h-3 w-3 group-hover/link:translate-x-1 transition-transform" />
            </Link>
          </CardContent>
        </Card>

        <Card className="group relative overflow-hidden border border-foreground/10 hover:border-accent/30 transition-all duration-300 hover:shadow-lg hover:shadow-accent/10 bg-linear-to-br from-background to-foreground/5">
          <div className="absolute inset-0 bg-linear-to-br from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <CardHeader className="pb-3 relative z-10">
            <CardTitle className="text-xs font-black uppercase tracking-wider text-foreground/50 flex items-center gap-2" style={{ fontWeight: '900' }}>
              <div className="p-1.5 rounded-lg bg-accent/10 group-hover:bg-accent/20 transition-colors">
                <Clock className="h-3.5 w-3.5 text-accent" />
              </div>
              Needs Attention
            </CardTitle>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-4xl sm:text-5xl font-black text-foreground mb-3" style={{ fontWeight: '900' }}>
              {expiringDeliveries.length + staleProjects.length}
            </div>
            <span className="text-xs text-foreground/50 font-medium">
              Items requiring follow-up
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Alerts Section */}
      {(feedbackCount > 0 || expiringDeliveries.length > 0 || staleProjects.length > 0) && (
        <div className="mb-8 sm:mb-12 space-y-4">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-1 w-8 bg-linear-to-r from-accent to-transparent rounded-full" />
            <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-foreground" style={{ fontWeight: '900', letterSpacing: '-0.02em' }}>
              Requires Attention
            </h2>
          </div>

          {feedbackCount > 0 && (
            <Card 
              onClick={() => router.push('/admin/feedback')}
              className="group cursor-pointer border-l-4 border-accent/60 bg-linear-to-r from-accent/5 to-transparent hover:from-accent/10 hover:to-transparent transition-all duration-300 hover:shadow-lg hover:shadow-accent/10"
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-4">
                    <div className="p-2 rounded-lg bg-accent/20 group-hover:bg-accent/30 transition-colors">
                      <MessageSquare className="h-5 w-5 text-accent" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black uppercase tracking-wider text-foreground mb-1.5" style={{ fontWeight: '900' }}>
                        Unread Feedback
                      </h3>
                      <p className="text-xs text-foreground/60 font-medium">
                        {feedbackCount} {feedbackCount === 1 ? 'item' : 'items'} waiting for review
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-foreground/30 group-hover:text-accent group-hover:translate-x-1 transition-all shrink-0" />
                </div>
                {feedbackArray.length > 0 && (
                  <div className="mt-4 space-y-3 pl-12">
                    {feedbackArray.slice(0, 3).map((fb: any) => (
                      <div key={fb._id} className="text-sm text-foreground/70 bg-foreground/5 rounded-lg p-3 border border-foreground/10">
                        <p className="line-clamp-2 mb-1.5">{fb.body}</p>
                        <p className="text-xs text-foreground/40 font-medium">
                          {formatDistanceToNow(new Date(fb.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {expiringDeliveries.length > 0 && (
            <Card 
              onClick={() => router.push('/admin/deliveries')}
              className="group cursor-pointer border-l-4 border-foreground/40 bg-linear-to-r from-foreground/5 to-transparent hover:from-foreground/10 hover:to-transparent transition-all duration-300 hover:shadow-lg"
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="p-2 rounded-lg bg-foreground/10 group-hover:bg-foreground/20 transition-colors">
                      <AlertCircle className="h-5 w-5 text-foreground/60" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black uppercase tracking-wider text-foreground mb-1.5" style={{ fontWeight: '900' }}>
                        Deliveries Expiring Soon
                      </h3>
                      <p className="text-xs text-foreground/60 font-medium">
                        {expiringDeliveries.length} {expiringDeliveries.length === 1 ? 'delivery' : 'deliveries'} expiring in the next 7 days
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-foreground/30 group-hover:text-foreground group-hover:translate-x-1 transition-all shrink-0" />
                </div>
              </CardContent>
            </Card>
          )}

          {staleProjects.length > 0 && (
            <Card 
              onClick={() => router.push('/admin/client-projects')}
              className="group cursor-pointer border-l-4 border-foreground/40 bg-linear-to-r from-foreground/5 to-transparent hover:from-foreground/10 hover:to-transparent transition-all duration-300 hover:shadow-lg"
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="p-2 rounded-lg bg-foreground/10 group-hover:bg-foreground/20 transition-colors">
                      <Clock className="h-5 w-5 text-foreground/60" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black uppercase tracking-wider text-foreground mb-1.5" style={{ fontWeight: '900' }}>
                        Projects Needing Follow-up
                      </h3>
                      <p className="text-xs text-foreground/60 font-medium">
                        {staleProjects.length} {staleProjects.length === 1 ? 'project' : 'projects'} not updated in 7+ days
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-foreground/30 group-hover:text-foreground group-hover:translate-x-1 transition-all shrink-0" />
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Quick Links */}
      <div className="space-y-8">
        <div className="flex items-center gap-3">
          <div className="h-1 w-8 bg-linear-to-r from-accent to-transparent rounded-full" />
          <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-foreground" style={{ fontWeight: '900', letterSpacing: '-0.02em' }}>
            Quick Actions
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Website Section */}
          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-foreground/60 mb-4 flex items-center gap-2 px-1" style={{ fontWeight: '900' }}>
              <Globe className="h-3.5 w-3.5" />
              Website
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {quickLinks.website.map((link) => {
                const Icon = link.icon;
                return (
                  <Link key={link.href} href={link.href}>
                    <Card className="group relative overflow-hidden cursor-pointer border border-foreground/10 hover:border-accent/40 hover:shadow-md hover:shadow-accent/10 transition-all duration-200 bg-linear-to-br from-background to-foreground/5">
                      <div className="absolute inset-0 bg-linear-to-br from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                      <CardContent className="p-4 relative z-10">
                        <div className="flex flex-col items-center gap-2.5 text-center">
                          <div className="p-2.5 rounded-lg bg-foreground/10 group-hover:bg-accent/20 transition-all duration-200">
                            <Icon className="h-5 w-5 text-foreground/60 group-hover:text-accent transition-colors" />
                          </div>
                          <h4 className="text-xs font-black uppercase tracking-wider text-foreground group-hover:text-accent transition-colors leading-snug" style={{ fontWeight: '900' }}>
                            {link.label}
                          </h4>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Clients Section */}
          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-foreground/60 mb-4 flex items-center gap-2 px-1" style={{ fontWeight: '900' }}>
              <Users className="h-3.5 w-3.5" />
              Clients
            </h3>
            <div className="grid grid-cols-3 gap-3">
              {quickLinks.clients.map((link) => {
                const Icon = link.icon;
                return (
                  <Link key={link.href} href={link.href}>
                    <Card className="group relative overflow-hidden cursor-pointer border border-foreground/10 hover:border-accent/40 hover:shadow-md hover:shadow-accent/10 transition-all duration-200 bg-linear-to-br from-background to-foreground/5">
                      <div className="absolute inset-0 bg-linear-to-br from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                      <CardContent className="p-4 relative z-10">
                        <div className="flex flex-col items-center gap-2.5 text-center">
                          <div className="p-2.5 rounded-lg bg-foreground/10 group-hover:bg-accent/20 transition-all duration-200">
                            <Icon className="h-5 w-5 text-foreground/60 group-hover:text-accent transition-colors" />
                          </div>
                          <h4 className="text-xs font-black uppercase tracking-wider text-foreground group-hover:text-accent transition-colors leading-snug" style={{ fontWeight: '900' }}>
                            {link.label}
                          </h4>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Business Section */}
          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-foreground/60 mb-4 flex items-center gap-2 px-1" style={{ fontWeight: '900' }}>
              <TrendingUp className="h-3.5 w-3.5" />
              Business
            </h3>
            <div className="grid grid-cols-3 gap-3">
              {quickLinks.business.map((link) => {
                const Icon = link.icon;
                return (
                  <Link key={link.href} href={link.href}>
                    <Card className="group relative overflow-hidden cursor-pointer border border-foreground/10 hover:border-accent/40 hover:shadow-md hover:shadow-accent/10 transition-all duration-200 bg-linear-to-br from-background to-foreground/5">
                      <div className="absolute inset-0 bg-linear-to-br from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                      <CardContent className="p-4 relative z-10">
                        <div className="flex flex-col items-center gap-2.5 text-center">
                          <div className="p-2.5 rounded-lg bg-foreground/10 group-hover:bg-accent/20 transition-all duration-200">
                            <Icon className="h-5 w-5 text-foreground/60 group-hover:text-accent transition-colors" />
                          </div>
                          <h4 className="text-xs font-black uppercase tracking-wider text-foreground group-hover:text-accent transition-colors leading-snug" style={{ fontWeight: '900' }}>
                            {link.label}
                          </h4>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Media Section */}
          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-foreground/60 mb-4 flex items-center gap-2 px-1" style={{ fontWeight: '900' }}>
              <ImageIcon className="h-3.5 w-3.5" />
              Media
            </h3>
            <div className="grid grid-cols-3 gap-3">
              {quickLinks.media.map((link) => {
                const Icon = link.icon;
                return (
                  <Link key={link.href} href={link.href}>
                    <Card className="group relative overflow-hidden cursor-pointer border border-foreground/10 hover:border-accent/40 hover:shadow-md hover:shadow-accent/10 transition-all duration-200 bg-linear-to-br from-background to-foreground/5">
                      <div className="absolute inset-0 bg-linear-to-br from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                      <CardContent className="p-4 relative z-10">
                        <div className="flex flex-col items-center gap-2.5 text-center">
                          <div className="p-2.5 rounded-lg bg-foreground/10 group-hover:bg-accent/20 transition-all duration-200">
                            <Icon className="h-5 w-5 text-foreground/60 group-hover:text-accent transition-colors" />
                          </div>
                          <h4 className="text-xs font-black uppercase tracking-wider text-foreground group-hover:text-accent transition-colors leading-snug" style={{ fontWeight: '900' }}>
                            {link.label}
                          </h4>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
