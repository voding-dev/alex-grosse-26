"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { ArrowRight, AlertCircle, Clock, MessageSquare, Package, Users, Calendar, QrCode, Mail, Settings, FileText, Image as ImageIcon, File, Globe, Layers, FolderKanban, Calculator, Sliders, Minimize2, RefreshCw, TrendingUp, Sparkles, ChevronRight, Activity, MoreHorizontal, ChevronDown, ChevronUp, CreditCard } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export default function AdminDashboard() {
  const router = useRouter();
  const { adminEmail } = useAdminAuth();
  const [moreToolsOpen, setMoreToolsOpen] = useState(false);

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

  // Most used tools - prioritized and prominent
  const mostUsedTools = [
    { href: "/admin/client-projects", label: "Projects", icon: FolderKanban, description: "Manage client projects", count: activeProjects.length },
    { href: "/admin/deliveries", label: "Portals", icon: Package, description: "Delivery portals", count: activeDeliveries.length },
    { href: "/admin/feedback", label: "Feedback", icon: MessageSquare, description: "Client feedback", count: feedbackCount, badge: feedbackCount > 0 },
    { href: "/admin/tools/subscription-tracker", label: "Subscriptions", icon: CreditCard, description: "Track recurring payments" },
    { href: "/admin/tools/prospecting", label: "Prospecting", icon: Sparkles, description: "Import & manage prospects" },
    { href: "/admin/tools/lead-pipeline", label: "Lead Pipeline", icon: TrendingUp, description: "Manage sales pipeline" },
    { href: "/admin/tools/pitch-deck-builder", label: "Pitch Deck Builder", icon: Sliders, description: "Create pitch decks" },
  ];

  // Additional tools - less prominent, compact list
  const additionalTools = [
    { href: "/admin/tools/contacts", label: "Contacts", icon: Users },
    { href: "/admin/scheduling", label: "Scheduling", icon: Calendar },
    { href: "/admin/email-marketing", label: "Email Marketing", icon: Mail },
    { href: "/admin/tools/media-library", label: "Media Library", icon: ImageIcon },
    { href: "/admin/website-editor", label: "Homepage Editor", icon: Globe },
    { href: "/admin/page-builder", label: "Page Builder", icon: Layers },
    { href: "/admin/quote-calculator", label: "Quote Builder", icon: Calculator },
    { href: "/admin/qr-codes", label: "QR Codes", icon: QrCode },
    { href: "/admin/image-compressor", label: "Image Compressor", icon: Minimize2 },
    { href: "/admin/file-converter", label: "File Converter", icon: RefreshCw },
  ];

  // Recent projects (last 5, sorted by updated date)
  const recentProjects = [...projects]
    .sort((a, b) => (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt))
    .slice(0, 5);

  // Recent deliveries (last 5)
  const recentDeliveries = [...allDeliveries]
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
    .slice(0, 5);

  const totalActionItems = feedbackCount + expiringDeliveries.length + staleProjects.length;

  // Calculate trends (projects created in last 7 days)
  const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);
  const recentProjectsCount = projects.filter(p => (p.createdAt || 0) > sevenDaysAgo).length;
  const recentDeliveriesCount = allDeliveries.filter(d => (d.createdAt || 0) > sevenDaysAgo).length;

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6 sm:py-10">
      {/* Compact Header */}
      <div className="mb-6 sm:mb-8">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-accent/20 border border-accent/20">
            <Sparkles className="h-5 w-5 text-accent" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-foreground" style={{ fontWeight: '900', letterSpacing: '-0.02em' }}>
              Dashboard
            </h1>
          </div>
        </div>
      </div>

      {/* Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
        {/* Main Content - Left Column */}
        <div className="lg:col-span-8 space-y-6 lg:space-y-8">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <Card className="group border border-foreground/10 hover:border-accent/30 transition-all duration-200 hover:shadow-md">
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 rounded-lg bg-accent/10">
                    <Package className="h-4 w-4 text-accent" />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider text-foreground/50" style={{ fontWeight: '900' }}>
                    Portals
                  </span>
                </div>
                <div className="text-3xl sm:text-4xl font-black text-foreground mb-1" style={{ fontWeight: '900' }}>
                  {activeDeliveries.length}
                </div>
                {recentDeliveriesCount > 0 && (
                  <p className="text-xs text-foreground/40">
                    +{recentDeliveriesCount} this week
                  </p>
                )}
                <Link href="/admin/deliveries" className="text-xs text-accent hover:text-accent/80 font-bold uppercase tracking-wider inline-flex items-center gap-1 mt-2 group/link">
                  View
                  <ArrowRight className="h-3 w-3 group-hover/link:translate-x-0.5 transition-transform" />
                </Link>
              </CardContent>
            </Card>

            <Card className="group border border-foreground/10 hover:border-accent/30 transition-all duration-200 hover:shadow-md">
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 rounded-lg bg-accent/10">
                    <MessageSquare className="h-4 w-4 text-accent" />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider text-foreground/50" style={{ fontWeight: '900' }}>
                    Feedback
                  </span>
                </div>
                <div className="text-3xl sm:text-4xl font-black text-foreground mb-1" style={{ fontWeight: '900' }}>
                  {feedbackCount}
                </div>
                <Link href="/admin/feedback" className="text-xs text-accent hover:text-accent/80 font-bold uppercase tracking-wider inline-flex items-center gap-1 mt-2 group/link">
                  View
                  <ArrowRight className="h-3 w-3 group-hover/link:translate-x-0.5 transition-transform" />
                </Link>
              </CardContent>
            </Card>

            <Card className="group border border-foreground/10 hover:border-accent/30 transition-all duration-200 hover:shadow-md">
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 rounded-lg bg-accent/10">
                    <Users className="h-4 w-4 text-accent" />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider text-foreground/50" style={{ fontWeight: '900' }}>
                    Projects
                  </span>
                </div>
                <div className="text-3xl sm:text-4xl font-black text-foreground mb-1" style={{ fontWeight: '900' }}>
                  {activeProjects.length}
                </div>
                {recentProjectsCount > 0 && (
                  <p className="text-xs text-foreground/40">
                    +{recentProjectsCount} this week
                  </p>
                )}
                <Link href="/admin/client-projects" className="text-xs text-accent hover:text-accent/80 font-bold uppercase tracking-wider inline-flex items-center gap-1 mt-2 group/link">
                  View
                  <ArrowRight className="h-3 w-3 group-hover/link:translate-x-0.5 transition-transform" />
                </Link>
              </CardContent>
            </Card>

            <Card className="group border border-foreground/10 hover:border-accent/30 transition-all duration-200 hover:shadow-md">
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 rounded-lg bg-accent/10">
                    <Clock className="h-4 w-4 text-accent" />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider text-foreground/50" style={{ fontWeight: '900' }}>
                    Attention
                  </span>
                </div>
                <div className="text-3xl sm:text-4xl font-black text-foreground mb-1" style={{ fontWeight: '900' }}>
                  {totalActionItems}
                </div>
                <span className="text-xs text-foreground/40">
                  Items to review
                </span>
              </CardContent>
            </Card>
          </div>

          {/* Action Items - Only show if there are items */}
          {totalActionItems > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="h-0.5 w-6 bg-accent rounded-full" />
                <h2 className="text-lg sm:text-xl font-black uppercase tracking-tight text-foreground" style={{ fontWeight: '900', letterSpacing: '-0.02em' }}>
                  Action Required
                </h2>
              </div>

              <div className="space-y-2">
                {feedbackCount > 0 && (
                  <Card 
                    onClick={() => router.push('/admin/feedback')}
                    className="cursor-pointer border-l-4 border-accent/60 hover:border-accent transition-all duration-200 hover:shadow-md"
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <MessageSquare className="h-4 w-4 text-accent" />
                          <div>
                            <h3 className="text-sm font-black uppercase tracking-wider text-foreground" style={{ fontWeight: '900' }}>
                              Unread Feedback
                            </h3>
                            <p className="text-xs text-foreground/60">
                              {feedbackCount} {feedbackCount === 1 ? 'item' : 'items'} waiting
                            </p>
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-foreground/30 shrink-0" />
                      </div>
                    </CardContent>
                  </Card>
                )}

                {expiringDeliveries.length > 0 && (
                  <Card 
                    onClick={() => router.push('/admin/deliveries')}
                    className="cursor-pointer border-l-4 border-foreground/30 hover:border-foreground/50 transition-all duration-200 hover:shadow-md"
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <AlertCircle className="h-4 w-4 text-foreground/60" />
                          <div>
                            <h3 className="text-sm font-black uppercase tracking-wider text-foreground" style={{ fontWeight: '900' }}>
                              Deliveries Expiring
                            </h3>
                            <p className="text-xs text-foreground/60">
                              {expiringDeliveries.length} expiring in 7 days
                            </p>
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-foreground/30 shrink-0" />
                      </div>
                    </CardContent>
                  </Card>
                )}

                {staleProjects.length > 0 && (
                  <Card 
                    onClick={() => router.push('/admin/client-projects')}
                    className="cursor-pointer border-l-4 border-foreground/30 hover:border-foreground/50 transition-all duration-200 hover:shadow-md"
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Clock className="h-4 w-4 text-foreground/60" />
                          <div>
                            <h3 className="text-sm font-black uppercase tracking-wider text-foreground" style={{ fontWeight: '900' }}>
                              Projects Need Follow-up
                            </h3>
                            <p className="text-xs text-foreground/60">
                              {staleProjects.length} not updated in 7+ days
                            </p>
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-foreground/30 shrink-0" />
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}

          {/* Most Used Tools */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="h-0.5 w-6 bg-accent rounded-full" />
              <h2 className="text-lg sm:text-xl font-black uppercase tracking-tight text-foreground" style={{ fontWeight: '900', letterSpacing: '-0.02em' }}>
                Most Used Tools
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {mostUsedTools.map((tool) => {
                const Icon = tool.icon;
                return (
                  <Link key={tool.href} href={tool.href}>
                    <Card className="group cursor-pointer border border-foreground/10 hover:border-accent/40 hover:shadow-md transition-all duration-200">
                      <CardContent className="p-4 sm:p-5">
                        <div className="flex items-start justify-between mb-3">
                          <div className="p-2.5 rounded-lg bg-foreground/10 group-hover:bg-accent/20 transition-colors">
                            <Icon className="h-5 w-5 text-foreground/60 group-hover:text-accent transition-colors" />
                          </div>
                          {tool.badge && (
                            <span className="px-2 py-0.5 rounded-full bg-accent/20 text-accent text-xs font-bold uppercase">
                              {tool.count}
                            </span>
                          )}
                        </div>
                        <h3 className="text-sm font-black uppercase tracking-tight text-foreground mb-1 group-hover:text-accent transition-colors" style={{ fontWeight: '900' }}>
                          {tool.label}
                        </h3>
                        <p className="text-xs text-foreground/50 font-medium">
                          {tool.description}
                        </p>
                        {tool.count !== undefined && !tool.badge && (
                          <div className="text-xs text-foreground/40 font-medium mt-2">
                            {tool.count} active
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Collapsible More Tools */}
          <div>
            <button
              onClick={() => setMoreToolsOpen(!moreToolsOpen)}
              className="flex items-center justify-between w-full mb-4 group"
            >
              <div className="flex items-center gap-2">
                <div className="h-0.5 w-6 bg-foreground/20 rounded-full" />
                <h2 className="text-base font-black uppercase tracking-tight text-foreground/70 group-hover:text-foreground transition-colors" style={{ fontWeight: '900', letterSpacing: '-0.02em' }}>
                  More Tools
                </h2>
              </div>
              {moreToolsOpen ? (
                <ChevronUp className="h-4 w-4 text-foreground/40 group-hover:text-foreground/60 transition-colors" />
              ) : (
                <ChevronDown className="h-4 w-4 text-foreground/40 group-hover:text-foreground/60 transition-colors" />
              )}
            </button>

            {moreToolsOpen && (
              <Card className="border border-foreground/10">
                <CardContent className="p-4">
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {additionalTools.map((tool) => {
                      const Icon = tool.icon;
                      return (
                        <Link key={tool.href} href={tool.href}>
                          <div className="group flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-foreground/5 transition-colors cursor-pointer">
                            <div className="p-2 rounded-lg bg-foreground/5 group-hover:bg-accent/10 transition-colors">
                              <Icon className="h-4 w-4 text-foreground/50 group-hover:text-accent transition-colors" />
                            </div>
                            <span className="text-xs font-bold uppercase tracking-wider text-foreground/60 group-hover:text-foreground text-center leading-tight" style={{ fontWeight: '900' }}>
                              {tool.label}
                            </span>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Sidebar - Right Column */}
        <div className="lg:col-span-4 space-y-6">
          {/* Recent Activity */}
          <Card className="border border-foreground/10">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-accent" />
                <CardTitle className="text-sm font-black uppercase tracking-wider text-foreground" style={{ fontWeight: '900' }}>
                  Recent Activity
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Recent Projects */}
              {recentProjects.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-foreground/50 mb-2" style={{ fontWeight: '900' }}>
                    Projects
                  </h3>
                  <div className="space-y-2">
                    {recentProjects.slice(0, 3).map((project) => (
                      <Link
                        key={project._id}
                        href={`/admin/client-projects/${project._id}`}
                        className="block p-2 rounded-lg hover:bg-foreground/5 transition-colors group"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate group-hover:text-accent transition-colors">
                              {project.title || project.clientName || 'Untitled Project'}
                            </p>
                            <p className="text-xs text-foreground/50 mt-0.5">
                              {formatDistanceToNow(new Date(project.updatedAt || project.createdAt), { addSuffix: true })}
                            </p>
                          </div>
                          <ChevronRight className="h-4 w-4 text-foreground/30 group-hover:text-accent shrink-0 transition-colors" />
                        </div>
                      </Link>
                    ))}
                  </div>
                  {recentProjects.length > 3 && (
                    <Link
                      href="/admin/client-projects"
                      className="text-xs text-accent hover:text-accent/80 font-bold uppercase tracking-wider inline-flex items-center gap-1 mt-2"
                    >
                      View all
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  )}
                </div>
              )}

              {/* Recent Deliveries */}
              {recentDeliveries.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-foreground/50 mb-2" style={{ fontWeight: '900' }}>
                    Deliveries
                  </h3>
                  <div className="space-y-2">
                    {recentDeliveries.slice(0, 3).map((delivery) => (
                      <Link
                        key={delivery._id}
                        href={`/admin/deliveries`}
                        className="block p-2 rounded-lg hover:bg-foreground/5 transition-colors group"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate group-hover:text-accent transition-colors">
                              {delivery.title || delivery.slug || 'Untitled Delivery'}
                            </p>
                            <p className="text-xs text-foreground/50 mt-0.5">
                              {formatDistanceToNow(new Date(delivery.createdAt || 0), { addSuffix: true })}
                            </p>
                          </div>
                          <ChevronRight className="h-4 w-4 text-foreground/30 group-hover:text-accent shrink-0 transition-colors" />
                        </div>
                      </Link>
                    ))}
                  </div>
                  {recentDeliveries.length > 3 && (
                    <Link
                      href="/admin/deliveries"
                      className="text-xs text-accent hover:text-accent/80 font-bold uppercase tracking-wider inline-flex items-center gap-1 mt-2"
                    >
                      View all
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  )}
                </div>
              )}

              {recentProjects.length === 0 && recentDeliveries.length === 0 && (
                <p className="text-sm text-foreground/50 text-center py-4">
                  No recent activity
                </p>
              )}
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card className="border border-foreground/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-black uppercase tracking-wider text-foreground" style={{ fontWeight: '900' }}>
                Quick Stats
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-foreground/60">Total Projects</span>
                <span className="text-sm font-bold text-foreground">{projects.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-foreground/60">Total Deliveries</span>
                <span className="text-sm font-bold text-foreground">{allDeliveries.length}</span>
              </div>
              {recentProjectsCount > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-foreground/60">New This Week</span>
                  <span className="text-sm font-bold text-accent">+{recentProjectsCount + recentDeliveriesCount}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
