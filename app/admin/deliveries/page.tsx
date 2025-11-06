"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus, Package, Calendar, AlertCircle, Copy, ExternalLink, MessageSquare, Eye, EyeOff, Key, RefreshCw, Edit, Image as ImageIcon, FileText, Video } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useState } from "react";
import { Id } from "@/convex/_generated/dataModel";
import { StorageImage } from "@/components/storage-image";

export default function DeliveriesPage() {
  const { adminEmail } = useAdminAuth();
  const { toast } = useToast();
  const [visiblePins, setVisiblePins] = useState<Record<string, boolean>>({});
  const [resettingPin, setResettingPin] = useState<Record<string, boolean>>({});
  const resetPin = useMutation(api.deliveries.resetPin);
  const updateDelivery = useMutation(api.deliveries.update);

  const allDeliveries = useQuery(
    api.deliveries.listAll,
    adminEmail ? { email: adminEmail } : ("skip" as const)
  ) || [];

  // Add page header description
  // This will be shown in the component return
  
  // Safely check if feedback function exists before calling
  const feedbackQuery = (api.feedback as any)?.getRecentFeedback;
  const recentFeedback = useQuery(
    feedbackQuery,
    adminEmail && feedbackQuery ? { email: adminEmail, limit: 50 } : ("skip" as const)
  );

  // Safely handle feedback data
  const feedbackArray = Array.isArray(recentFeedback) ? recentFeedback : [];

  // Group deliveries by status
  const activeDeliveries = allDeliveries.filter((d) => {
    const now = Date.now();
    const isFreeExpired = d.expiresAt && d.expiresAt < now;
    const isPaidActive = d.storageSubscriptionStatus === "active" && 
                         d.storageSubscriptionExpiresAt && 
                         d.storageSubscriptionExpiresAt > now;
    return !isFreeExpired || isPaidActive;
  });

  const expiredDeliveries = allDeliveries.filter((d) => {
    const now = Date.now();
    const isFreeExpired = d.expiresAt && d.expiresAt < now;
    const isPaidActive = d.storageSubscriptionStatus === "active" && 
                         d.storageSubscriptionExpiresAt && 
                         d.storageSubscriptionExpiresAt > now;
    return isFreeExpired && !isPaidActive;
  });

  // Count unread feedback per delivery
  const feedbackCountByDelivery = feedbackArray.reduce((acc: Record<string, number>, fb: any) => {
    const id = fb.deliveryId;
    acc[id] = (acc[id] || 0) + 1;
    return acc;
  }, {});

  const copyDeliveryLink = (slug: string) => {
    const url = `${window.location.origin}/dl/${slug}`;
    navigator.clipboard.writeText(url);
    toast({
      title: "Link copied",
      description: "Delivery link copied to clipboard.",
    });
  };

  const copyPin = (pin: string, deliveryTitle: string) => {
    navigator.clipboard.writeText(pin);
    toast({
      title: "PIN copied",
      description: `PIN for ${deliveryTitle} copied to clipboard.`,
    });
  };

  const togglePinVisibility = (deliveryId: string) => {
    setVisiblePins(prev => ({
      ...prev,
      [deliveryId]: !prev[deliveryId],
    }));
  };

  const handleResetPin = async (deliveryId: Id<"deliveries">, deliveryTitle: string) => {
    if (!confirm(`Are you sure you want to reset the PIN for "${deliveryTitle}"? The current PIN will no longer work.`)) {
      return;
    }

    setResettingPin(prev => ({ ...prev, [deliveryId]: true }));
    try {
      const result = await resetPin({
        id: deliveryId,
        email: adminEmail || undefined,
      });

      // Make the new PIN visible
      setVisiblePins(prev => ({ ...prev, [deliveryId]: true }));

      toast({
        title: "PIN reset!",
        description: `New PIN for ${deliveryTitle}: ${result.pin}. It has been copied to clipboard.`,
      });

      // Copy new PIN to clipboard
      navigator.clipboard.writeText(result.pin);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to reset PIN.",
        variant: "destructive",
      });
    } finally {
      setResettingPin(prev => ({ ...prev, [deliveryId]: false }));
    }
  };

  const handleChangePin = async (deliveryId: Id<"deliveries">, newPin: string, deliveryTitle: string) => {
    if (!newPin || newPin.length < 4) {
      toast({
        title: "Error",
        description: "PIN must be at least 4 characters.",
        variant: "destructive",
      });
      return;
    }

    try {
      await updateDelivery({
        id: deliveryId,
        pin: newPin,
        email: adminEmail || undefined,
      });

      // Make the new PIN visible
      setVisiblePins(prev => ({ ...prev, [deliveryId]: true }));

      toast({
        title: "PIN updated!",
        description: `PIN for ${deliveryTitle} has been updated.`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update PIN.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 sm:py-12">
      <div className="mb-8 sm:mb-12 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex-1">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight text-foreground mb-4" style={{ fontWeight: '900', letterSpacing: '-0.02em' }}>
            Client Deliverables
          </h1>
          <p className="text-foreground/70 text-base sm:text-lg">
            Manage PIN-gated delivery portals for client file sharing and feedback. This is separate from your public website portfolio.
          </p>
        </div>
        <Link href="/admin/deliveries/new" className="w-full sm:w-auto">
          <Button className="w-full sm:w-auto font-black uppercase tracking-wider hover:bg-accent/90 transition-colors" style={{ backgroundColor: '#FFA617', fontWeight: '900' }}>
            <Plus className="mr-2 h-4 w-4" />
            Create Portal
          </Button>
        </Link>
      </div>

      {/* Info Banner */}
      <Card className="mb-8 sm:mb-12 border border-accent/30 bg-accent/5">
        <CardContent className="p-4 sm:p-6">
          <p className="text-sm text-foreground/80 leading-relaxed">
            <strong className="text-foreground font-black uppercase tracking-wider" style={{ fontWeight: '900' }}>Client Deliverables</strong> are completely separate from your public website portfolio. 
            These PIN-gated portals allow you to send work-in-progress files to clients for review and feedback. 
            Clients don't need accounts - just a PIN. This system is independent of what appears on your public site (managed under Portfolio/Projects).
          </p>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="mb-8 sm:mb-12 grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="border border-foreground/20 hover:border-accent/50 transition-colors">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-black uppercase tracking-wider text-foreground/60" style={{ fontWeight: '900' }}>
              Active Portals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-5xl font-black text-foreground" style={{ fontWeight: '900' }}>
              {activeDeliveries.length}
            </div>
          </CardContent>
        </Card>
        <Card className="border border-foreground/20 hover:border-accent/50 transition-colors">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-black uppercase tracking-wider text-foreground/60" style={{ fontWeight: '900' }}>
              Recent Feedback
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-5xl font-black text-foreground mb-3" style={{ fontWeight: '900' }}>
              {feedbackArray.length}
            </div>
            {feedbackArray.length > 0 && (
              <Link href="#feedback" className="text-sm text-accent hover:text-accent/80 font-bold uppercase tracking-wider inline-flex items-center gap-1 group">
                View all
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </Link>
            )}
          </CardContent>
        </Card>
        <Card className="border border-foreground/20 hover:border-accent/50 transition-colors">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-black uppercase tracking-wider text-foreground/60" style={{ fontWeight: '900' }}>
              Expired
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-5xl font-black text-foreground" style={{ fontWeight: '900' }}>
              {expiredDeliveries.length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Deliveries */}
      {activeDeliveries.length > 0 && (
        <div className="mb-8 sm:mb-12">
          <h2 className="mb-6 sm:mb-8 text-xl sm:text-2xl font-black uppercase tracking-tight text-foreground" style={{ fontWeight: '900', letterSpacing: '-0.02em' }}>
            Active Delivery Portals
          </h2>
          <div className="space-y-4">
            {activeDeliveries.map((delivery) => {
              const now = Date.now();
              const isExpired = delivery.expiresAt && delivery.expiresAt < now;
              const isPaidStorage = delivery.storageSubscriptionStatus === "active" && 
                                    delivery.storageSubscriptionExpiresAt && 
                                    delivery.storageSubscriptionExpiresAt > now;
              const expiresAtDate = delivery.expiresAt ? new Date(delivery.expiresAt) : null;
              const paidExpiresAtDate = delivery.storageSubscriptionExpiresAt 
                ? new Date(delivery.storageSubscriptionExpiresAt) 
                : null;
              const daysUntilExpiry = expiresAtDate && !isPaidStorage
                ? Math.ceil((delivery.expiresAt! - now) / (1000 * 60 * 60 * 24))
                : null;
              const feedbackCount = feedbackCountByDelivery[delivery._id] || 0;
              const deliveryUrl = `/dl/${delivery.slug}`;
              const fullUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}${deliveryUrl}`;
              
              return (
                <Card 
                  key={delivery._id}
                  className={`border transition-all hover:shadow-xl rounded-xl ${
                    daysUntilExpiry !== null && daysUntilExpiry <= 7 
                      ? "border-accent/50 bg-accent/5 hover:border-accent" 
                      : "border-foreground/20 bg-background hover:border-accent/50"
                  }`}
                >
                  <CardContent className="p-6 sm:p-8">
                    <div className="flex flex-col lg:flex-row gap-6">
                      {/* Asset Thumbnails Section */}
                      <DeliveryAssetThumbnails deliveryId={delivery._id} allowedAssetIds={delivery.allowedAssetIds || []} />
                      
                      <div className="flex flex-col sm:flex-row items-start sm:items-start sm:justify-between gap-6 flex-1">
                        <div className="flex-1 space-y-5 w-full">
                          <div>
                            <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-3">
                              <h3 className="font-black uppercase tracking-wider text-lg sm:text-xl break-all text-foreground" style={{ fontWeight: '900' }}>
                                {fullUrl}
                              </h3>
                              {feedbackCount > 0 && (
                                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent text-xs font-black text-background shrink-0" style={{ fontWeight: '900' }}>
                                  {feedbackCount}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-foreground/70 font-medium">
                              {(delivery.allowedAssetIds || []).length} assets • Created {new Date(delivery.originalDeliveryDate || delivery.createdAt).toLocaleDateString()}
                            </p>
                          </div>

                          {/* PIN Section */}
                        <div className="rounded-xl border border-foreground/20 bg-foreground/5 p-4 sm:p-5">
                          <div className="flex items-center justify-between gap-3 mb-3">
                            <div className="flex items-center gap-2.5">
                              <Key className="h-4 w-4 text-accent" />
                              <span className="text-xs font-black uppercase tracking-wider text-foreground/90" style={{ fontWeight: '900' }}>PIN</span>
                              {!delivery.pinPlaintext && (
                                <span className="text-xs text-yellow-500/80 font-medium">(Needs reset)</span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5">
                              {delivery.pinPlaintext ? (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => togglePinVisibility(delivery._id)}
                                    className="h-8 w-8 p-0 hover:bg-accent/10"
                                  >
                                    {visiblePins[delivery._id] ? (
                                      <EyeOff className="h-4 w-4" />
                                    ) : (
                                      <Eye className="h-4 w-4" />
                                    )}
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => copyPin(delivery.pinPlaintext || "", delivery.title)}
                                    className="h-8 w-8 p-0 hover:bg-accent/10"
                                  >
                                    <Copy className="h-4 w-4" />
                                  </Button>
                                </>
                              ) : null}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleResetPin(delivery._id, delivery.title)}
                                disabled={resettingPin[delivery._id]}
                                className="h-8 w-8 p-0 hover:bg-accent/10"
                                title={delivery.pinPlaintext ? "Reset PIN" : "Set PIN (no PIN stored)"}
                              >
                                {resettingPin[delivery._id] ? (
                                  <RefreshCw className="h-4 w-4 animate-spin" />
                                ) : (
                                  <RefreshCw className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </div>
                          {!delivery.pinPlaintext ? (
                            <div className="px-4 py-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                              <span className="text-xs text-yellow-500/90 font-medium">
                                PIN not stored. Click reset to generate a new PIN and view it here.
                              </span>
                            </div>
                          ) : visiblePins[delivery._id] ? (
                            <div className="flex items-center gap-2">
                              <code className="flex-1 px-4 py-3 bg-background border border-foreground/20 rounded-lg font-mono text-base font-bold text-foreground tracking-wider">
                                {delivery.pinPlaintext}
                              </code>
                            </div>
                          ) : (
                            <div className="px-4 py-3 bg-background border border-foreground/20 rounded-lg">
                              <span className="text-xs text-foreground/50 font-medium">Click eye icon to reveal PIN</span>
                            </div>
                          )}
                        </div>

                        {/* Storage Status */}
                        <div className="flex flex-wrap gap-2.5 text-xs sm:text-sm">
                          {isPaidStorage && paidExpiresAtDate && (
                            <div className="flex items-center gap-2 rounded-full bg-accent/20 border border-accent/30 px-4 py-2 text-xs font-black uppercase tracking-wider text-accent" style={{ fontWeight: '900' }}>
                              <Calendar className="h-3.5 w-3.5" />
                              Paid until {paidExpiresAtDate.toLocaleDateString()}
                            </div>
                          )}
                          {!isPaidStorage && expiresAtDate && (
                            <div className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-black uppercase tracking-wider ${
                              daysUntilExpiry !== null && daysUntilExpiry <= 7
                                ? "bg-accent/20 border border-accent/30 text-accent"
                                : "bg-foreground/10 border border-foreground/20 text-foreground/80"
                            }`} style={{ fontWeight: '900' }}>
                              <Calendar className="h-3.5 w-3.5" />
                              {daysUntilExpiry !== null && daysUntilExpiry <= 7
                                ? `Expires in ${daysUntilExpiry} day${daysUntilExpiry !== 1 ? 's' : ''}`
                                : `Expires ${expiresAtDate.toLocaleDateString()}`
                              }
                            </div>
                          )}
                          {feedbackCount > 0 && (
                            <div className="flex items-center gap-2 rounded-full bg-accent/20 border border-accent/30 px-4 py-2 text-xs font-black uppercase tracking-wider text-accent" style={{ fontWeight: '900' }}>
                              <MessageSquare className="h-3.5 w-3.5" />
                              {feedbackCount} feedback
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-2.5 w-full sm:w-auto shrink-0">
                        <Link href={`/admin/deliveries/${delivery._id}`} className="w-full sm:w-auto">
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full sm:w-auto font-black uppercase tracking-wider hover:bg-accent hover:text-background hover:border-accent transition-colors"
                            style={{ fontWeight: '900' }}
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </Button>
                        </Link>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            copyDeliveryLink(delivery.slug);
                          }}
                          className="w-full sm:w-auto font-black uppercase tracking-wider hover:bg-accent hover:text-background hover:border-accent transition-colors"
                          style={{ fontWeight: '900' }}
                        >
                          <Copy className="mr-2 h-4 w-4" />
                          Copy Link
                        </Button>
                        <Link href={deliveryUrl} target="_blank" className="w-full sm:w-auto">
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="w-full sm:w-auto font-black uppercase tracking-wider hover:bg-accent hover:text-background hover:border-accent transition-colors"
                            style={{ fontWeight: '900' }}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Expired Deliveries */}
      {expiredDeliveries.length > 0 && (
        <div className="mb-8 sm:mb-12">
          <h2 className="mb-6 sm:mb-8 text-xl sm:text-2xl font-black uppercase tracking-tight text-foreground" style={{ fontWeight: '900', letterSpacing: '-0.02em' }}>
            Expired Deliveries
          </h2>
          <div className="space-y-4">
            {expiredDeliveries.map((delivery) => {
              const expiresAtDate = delivery.expiresAt ? new Date(delivery.expiresAt) : null;
              const deliveryUrl = `/dl/${delivery.slug}`;
              
              return (
                <Card 
                  key={delivery._id}
                  className="border border-foreground/20 bg-foreground/5 hover:border-foreground/30 transition-all rounded-xl"
                >
                  <CardContent className="p-6 sm:p-8">
                    <div className="flex flex-col sm:flex-row items-start sm:items-start sm:justify-between gap-6">
                      <div className="flex-1 w-full">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-3">
                          <AlertCircle className="h-5 w-5 text-foreground/60 shrink-0" />
                          <h3 className="font-black uppercase tracking-wider text-lg sm:text-xl text-foreground/80 break-all" style={{ fontWeight: '900' }}>
                            {deliveryUrl}
                          </h3>
                        </div>
                        <p className="text-sm text-foreground/70 font-medium">
                          {(delivery.allowedAssetIds || []).length} assets • Expired {expiresAtDate?.toLocaleDateString()}
                        </p>
                        
                        {/* PIN Section for Expired */}
                        {delivery.pinPlaintext && (
                          <div className="mt-4 rounded-xl border border-foreground/20 bg-foreground/5 p-4 sm:p-5">
                            <div className="flex items-center justify-between gap-3 mb-3">
                              <div className="flex items-center gap-2.5">
                                <Key className="h-4 w-4 text-foreground/60" />
                                <span className="text-xs font-black uppercase tracking-wider text-foreground/60" style={{ fontWeight: '900' }}>PIN</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => togglePinVisibility(delivery._id)}
                                  className="h-8 w-8 p-0 hover:bg-accent/10"
                                >
                                  {visiblePins[delivery._id] ? (
                                    <EyeOff className="h-4 w-4" />
                                  ) : (
                                    <Eye className="h-4 w-4" />
                                  )}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => copyPin(delivery.pinPlaintext || "", delivery.title)}
                                  className="h-8 w-8 p-0 hover:bg-accent/10"
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                            {visiblePins[delivery._id] ? (
                              <code className="block px-4 py-3 bg-background border border-foreground/20 rounded-lg font-mono text-base font-bold text-foreground tracking-wider">
                                {delivery.pinPlaintext}
                              </code>
                            ) : (
                              <div className="px-4 py-3 bg-background border border-foreground/20 rounded-lg">
                                <span className="text-xs text-foreground/50 font-medium">Click eye icon to reveal PIN</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2.5 w-full sm:w-auto shrink-0">
                        <Link href={`/admin/deliveries/${delivery._id}`} className="w-full sm:w-auto">
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full sm:w-auto font-black uppercase tracking-wider hover:bg-accent hover:text-background hover:border-accent transition-colors"
                            style={{ fontWeight: '900' }}
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </Button>
                        </Link>
                        <Link href={deliveryUrl} target="_blank" className="w-full sm:w-auto">
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="w-full sm:w-auto font-black uppercase tracking-wider hover:bg-accent hover:text-background hover:border-accent transition-colors"
                            style={{ fontWeight: '900' }}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent Feedback */}
      {feedbackArray.length > 0 && (
        <div id="feedback" className="mb-8 sm:mb-12">
          <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-foreground" style={{ fontWeight: '900', letterSpacing: '-0.02em' }}>
              Recent Client Feedback
            </h2>
            <Link href="/admin/feedback" className="w-full sm:w-auto">
              <Button variant="outline" size="sm" className="w-full sm:w-auto font-bold uppercase tracking-wider hover:bg-accent hover:text-background hover:border-accent transition-colors">
                View All Feedback
              </Button>
            </Link>
          </div>
          <div className="space-y-4">
            {feedbackArray.slice(0, 10).map((fb: any) => (
              <Card key={fb._id} className="border border-foreground/20 hover:border-accent/50 transition-all hover:shadow-lg">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-start gap-4">
                    {/* Asset Thumbnail */}
                    {fb.assetId && (
                      <FeedbackAssetThumbnail assetId={fb.assetId} />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="mb-3 flex flex-wrap items-center gap-2 sm:gap-3">
                        {fb.decision && (
                          <span className={`text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full ${
                            fb.decision === "approve" ? "bg-accent/20 text-accent border border-accent/30" :
                            fb.decision === "reject" ? "bg-red-500/20 text-red-400 border border-red-500/30" :
                            "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                          }`} style={{ fontWeight: '900' }}>
                            {fb.decision.toUpperCase()}
                          </span>
                        )}
                        <span className="text-xs text-foreground/60 font-medium">
                          {new Date(fb.createdAt).toLocaleDateString()} at {new Date(fb.createdAt).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-sm text-foreground/80 leading-relaxed mb-3">{fb.body}</p>
                      <p className="text-xs text-foreground/60 font-medium">
                        Delivery: /dl/{fb.delivery?.slug || "Unknown"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {allDeliveries.length === 0 && (
        <Card className="border border-foreground/20">
          <CardContent className="py-16 text-center">
            <Package className="mx-auto h-16 w-16 text-foreground/40 mb-6" />
            <p className="mb-4 text-xl font-black uppercase tracking-wider text-foreground" style={{ fontWeight: '900' }}>
              No delivery portals yet.
            </p>
            <p className="mb-8 text-sm text-foreground/70">
              Create your first PIN-gated portal to send files to clients
            </p>
            <Link href="/admin/deliveries/new">
              <Button className="font-black uppercase tracking-wider hover:bg-accent/90 transition-colors" style={{ backgroundColor: '#FFA617', fontWeight: '900' }}>
                <Plus className="mr-2 h-4 w-4" />
                Create Delivery Portal
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Component to display delivery asset thumbnails
function DeliveryAssetThumbnails({ deliveryId, allowedAssetIds }: { deliveryId: Id<"deliveries">; allowedAssetIds: Id<"assets">[] }) {
  const allAssets = useQuery(api.assets.list, {});
  const deliveryAssets = allAssets?.filter((asset) => allowedAssetIds.includes(asset._id)) || [];
  const imageAssets = deliveryAssets.filter((asset) => asset.type === "image").slice(0, 4);
  
  if (imageAssets.length === 0) {
    return (
      <div className="w-full lg:w-48 h-48 rounded-xl border border-foreground/20 bg-foreground/5 flex items-center justify-center shrink-0">
        <Package className="h-8 w-8 text-foreground/40" />
      </div>
    );
  }

  return (
    <div className="w-full lg:w-48 h-48 rounded-xl border border-foreground/20 bg-foreground/5 overflow-hidden shrink-0">
      {imageAssets.length === 1 ? (
        <div className="w-full h-full">
          <StorageImage
            storageId={imageAssets[0].previewKey || imageAssets[0].storageKey}
            alt={imageAssets[0].filename}
            className="w-full h-full object-cover"
          />
        </div>
      ) : imageAssets.length === 2 ? (
        <div className="grid grid-cols-2 h-full gap-0.5">
          {imageAssets.map((asset) => (
            <div key={asset._id} className="w-full h-full">
              <StorageImage
                storageId={asset.previewKey || asset.storageKey}
                alt={asset.filename}
                className="w-full h-full object-cover"
              />
            </div>
          ))}
        </div>
      ) : imageAssets.length === 3 ? (
        <div className="grid grid-cols-2 h-full gap-0.5">
          <div className="row-span-2">
            <StorageImage
              storageId={imageAssets[0].previewKey || imageAssets[0].storageKey}
              alt={imageAssets[0].filename}
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <StorageImage
              storageId={imageAssets[1].previewKey || imageAssets[1].storageKey}
              alt={imageAssets[1].filename}
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <StorageImage
              storageId={imageAssets[2].previewKey || imageAssets[2].storageKey}
              alt={imageAssets[2].filename}
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 h-full gap-0.5">
          {imageAssets.slice(0, 4).map((asset) => (
            <div key={asset._id} className="w-full h-full relative">
              <StorageImage
                storageId={asset.previewKey || asset.storageKey}
                alt={asset.filename}
                className="w-full h-full object-cover"
              />
              {asset === imageAssets[3] && deliveryAssets.length > 4 && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <span className="text-white font-black text-sm" style={{ fontWeight: '900' }}>
                    +{deliveryAssets.length - 4}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Component to display asset thumbnail for feedback
function FeedbackAssetThumbnail({ assetId }: { assetId: Id<"assets"> }) {
  const asset = useQuery(api.assets.get, assetId ? { id: assetId } : ("skip" as const));
  
  if (!asset) {
    return (
      <div className="w-24 h-24 rounded-lg border border-foreground/20 bg-foreground/5 flex items-center justify-center shrink-0">
        <ImageIcon className="h-6 w-6 text-foreground/40" />
      </div>
    );
  }

  const storageId = asset.previewKey || asset.storageKey;
  
  if (asset.type === "image" && storageId) {
    return (
      <div className="w-24 h-24 rounded-lg border border-foreground/20 bg-foreground/5 overflow-hidden shrink-0">
        <StorageImage
          storageId={storageId}
          alt={asset.filename}
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  if (asset.type === "video") {
    return (
      <div className="w-24 h-24 rounded-lg border border-foreground/20 bg-foreground/5 flex items-center justify-center shrink-0">
        <Video className="h-8 w-8 text-foreground/40" />
      </div>
    );
  }

  return (
    <div className="w-24 h-24 rounded-lg border border-foreground/20 bg-foreground/5 flex items-center justify-center shrink-0">
      <FileText className="h-8 w-8 text-foreground/40" />
    </div>
  );
}
