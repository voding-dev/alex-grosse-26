"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, ExternalLink, Info, Image as ImageIcon, FileText, Video, Eye, EyeOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { StorageImage } from "@/components/storage-image";
import { Id } from "@/convex/_generated/dataModel";
import { useState } from "react";
import { PortalDashboard } from "@/components/portal-dashboard";
import { FeedbackDetailModal } from "@/components/feedback-detail-modal";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function FeedbackPage() {
  const { adminEmail } = useAdminAuth();
  const [selectedFeedback, setSelectedFeedback] = useState<any | null>(null);
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [expandedDashboards, setExpandedDashboards] = useState<Set<string>>(new Set());

  // Safely check if feedback function exists before calling
  const feedbackQuery = (api.feedback as any)?.getRecentFeedback;
  const recentFeedback = useQuery(
    feedbackQuery,
    adminEmail && feedbackQuery ? { email: adminEmail, limit: 100 } : ("skip" as const)
  );

  // Safely handle feedback data
  const feedbackArray = Array.isArray(recentFeedback) ? recentFeedback : [];

  // Group feedback by delivery
  const feedbackByDelivery = feedbackArray.reduce((acc: Record<string, any[]>, fb: any) => {
    const deliveryId = fb.deliveryId;
    if (!acc[deliveryId]) {
      acc[deliveryId] = [];
    }
    acc[deliveryId].push(fb);
    return acc;
  }, {});

  const deliveryIds = Object.keys(feedbackByDelivery);

  const handleFeedbackClick = (feedback: any) => {
    setSelectedFeedback(feedback);
    setFeedbackModalOpen(true);
  };

  const toggleDashboard = (deliveryId: string) => {
    const newExpanded = new Set(expandedDashboards);
    if (newExpanded.has(deliveryId)) {
      newExpanded.delete(deliveryId);
    } else {
      newExpanded.add(deliveryId);
    }
    setExpandedDashboards(newExpanded);
  };

  const handleAssetClick = (assetId: string) => {
    // Find feedback for this asset
    const assetFeedback = feedbackArray.find((fb: any) => fb.assetId === assetId);
    if (assetFeedback) {
      handleFeedbackClick(assetFeedback);
    }
  };

  const getDecisionBadge = (decision: string | null) => {
    if (!decision) return null;
    
    switch (decision) {
      case "approve":
        return (
          <span className="text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full bg-green-500/20 text-green-600 border border-green-500/30" style={{ fontWeight: '900' }}>
            APPROVED
          </span>
        );
      case "reject":
        return (
          <span className="text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full bg-red-500/20 text-red-600 border border-red-500/30" style={{ fontWeight: '900' }}>
            REJECTED
          </span>
        );
      case "changes":
        return (
          <span className="text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full bg-yellow-500/20 text-yellow-600 border border-yellow-500/30" style={{ fontWeight: '900' }}>
            NEEDS CHANGES
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 sm:py-12">
      <div className="mb-8 sm:mb-12 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex-1">
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight text-foreground mb-4" style={{ fontWeight: '900', letterSpacing: '-0.02em' }}>
          Client Feedback
        </h1>
        <p className="text-foreground/70 text-base sm:text-lg">
            Review client interactions (access, downloads, approvals, comments) across delivery portals.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-foreground/20 text-foreground/70 hover:text-accent hover:border-accent"
                  aria-label="How to read feedback"
                >
                  <Info className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-[320px] text-xs leading-relaxed">
                - Badges indicate decision per entry.
                <br />- "Per-asset" entries are feedback on a single file; "Project" entries are overall comments.
                <br />- Click the link icon to view the delivery as the client sees it.
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Link href="/admin/deliveries" className="w-full sm:w-auto">
            <Button variant="outline" className="w-full sm:w-auto font-black uppercase tracking-wider hover:bg-accent hover:text-background hover:border-accent transition-colors" style={{ fontWeight: '900' }}>
              Go to Deliveries
            </Button>
          </Link>
        </div>
      </div>

      {/* Info Banner */}
      <Card className="mb-8 sm:mb-12 border border-accent/30 bg-accent/5">
        <CardContent className="p-4 sm:p-6">
          <p className="text-sm text-foreground/80 leading-relaxed">
            <strong className="text-foreground font-black uppercase tracking-wider" style={{ fontWeight: '900' }}>Client Feedback</strong> is collected from your delivery portals. Clients can leave feedback on specific assets 
            or provide general project feedback. Each feedback item is linked to a delivery portal, which you can access from the 
            <Link href="/admin/deliveries" className="text-accent hover:text-accent/80 hover:underline mx-1 font-bold">Deliveries</Link>
            section.
          </p>
        </CardContent>
      </Card>

      {feedbackArray.length === 0 ? (
        <Card className="border border-foreground/20">
          <CardContent className="py-16 text-center">
            <MessageSquare className="mx-auto h-16 w-16 text-foreground/40 mb-6" />
            <p className="mb-4 text-xl font-black uppercase tracking-wider text-foreground" style={{ fontWeight: '900' }}>
              No feedback yet.
            </p>
            <p className="mb-8 text-sm text-foreground/70">
              {!feedbackQuery ? "Feedback functions are being deployed. Please wait for Convex to finish syncing." : "Client feedback will appear here when they comment on deliveries"}
            </p>
            <Link href="/admin/deliveries" className="inline-block">
              <Button variant="outline" className="font-black uppercase tracking-wider hover:bg-accent hover:text-background hover:border-accent transition-colors" style={{ fontWeight: '900' }}>
                View Deliveries
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {deliveryIds.map((deliveryId) => {
            const feedbackItems = feedbackByDelivery[deliveryId];
            const firstItem = feedbackItems[0];
            const delivery = firstItem.delivery;
            const project = firstItem.project;

            const isDashboardExpanded = expandedDashboards.has(deliveryId);

            return (
              <Card key={deliveryId} className="border border-foreground/20 hover:border-accent/50 transition-all hover:shadow-lg rounded-xl">
                <CardHeader className="pb-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
                        <Link 
                          href={`/dl/${delivery?.slug || ''}`} 
                          target="_blank"
                          className="text-lg sm:text-xl font-black uppercase tracking-wider hover:text-accent transition-colors break-all"
                          style={{ fontWeight: '900' }}
                        >
                          {delivery?.title || `/dl/${delivery?.slug || 'Unknown'}`}
                        </Link>
                        <Link href={`/dl/${delivery?.slug || ''}`} target="_blank">
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-accent/10">
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </Link>
                      </CardTitle>
                      <CardDescription className="text-sm sm:text-base text-foreground/70 break-words">
                        {project?.title || 'Unknown Project'} • {project?.clientName || 'Unknown Client'}
                      </CardDescription>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                      <span className="text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full bg-foreground/10 border border-foreground/20 text-foreground/80" style={{ fontWeight: '900' }}>
                        {feedbackItems.length} {feedbackItems.length === 1 ? 'ITEM' : 'ITEMS'}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleDashboard(deliveryId)}
                        className="font-black uppercase tracking-wider hover:bg-accent hover:text-background hover:border-accent transition-colors"
                        style={{ fontWeight: '900' }}
                      >
                        {isDashboardExpanded ? (
                          <>
                            <EyeOff className="h-4 w-4 mr-2" />
                            Hide Dashboard
                          </>
                        ) : (
                          <>
                            <Eye className="h-4 w-4 mr-2" />
                            View Dashboard
                          </>
                        )}
                        </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Portal Dashboard */}
                  {isDashboardExpanded && delivery?._id && (
                    <div className="mb-6 pb-6 border-b border-foreground/10">
                      <PortalDashboard
                        deliveryId={delivery._id as Id<"deliveries">}
                        onAssetClick={handleAssetClick}
                      />
                    </div>
                  )}

                  {/* Feedback Items */}
                  <Tabs defaultValue="feedback" className="w-full">
                    <TabsList className="mb-4">
                      <TabsTrigger value="feedback" className="font-black uppercase tracking-wider" style={{ fontWeight: '900' }}>
                        Feedback ({feedbackItems.length})
                      </TabsTrigger>
                    </TabsList>
                    <TabsContent value="feedback" className="space-y-4">
                  {feedbackItems.map((fb: any) => (
                    <div 
                      key={fb._id} 
                          onClick={() => handleFeedbackClick(fb)}
                          className="rounded-xl border border-foreground/10 bg-foreground/5 p-4 sm:p-5 hover:border-accent/30 transition-colors cursor-pointer"
                    >
                          <div className="flex items-start gap-4">
                            {/* Asset Thumbnail */}
                            {fb.assetId && (
                              <FeedbackAssetThumbnail assetId={fb.assetId} />
                            )}
                        <div className="flex-1 min-w-0">
                              <div className="mb-3 flex flex-wrap items-center gap-2.5">
                            {fb.decision && getDecisionBadge(fb.decision)}
                            {fb.assetId ? (
                                  <span className="text-xs font-black uppercase tracking-wider px-2 py-1 rounded bg-accent/10 border border-accent/20 text-accent" style={{ fontWeight: '900' }}>
                                    PER-ASSET
                                  </span>
                            ) : (
                                  <span className="text-xs font-black uppercase tracking-wider px-2 py-1 rounded bg-foreground/10 border border-foreground/20 text-foreground/80" style={{ fontWeight: '900' }}>
                                    PROJECT
                                  </span>
                            )}
                                <span className="text-xs text-foreground/60 font-medium">
                              {new Date(fb.createdAt).toLocaleDateString()} at {new Date(fb.createdAt).toLocaleTimeString()}
                            </span>
                          </div>
                              <p className="text-sm text-foreground/80 leading-relaxed">{fb.body}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Feedback Detail Modal */}
      {selectedFeedback && (
        <FeedbackDetailModal
          feedback={selectedFeedback}
          isOpen={feedbackModalOpen}
          onClose={() => {
            setFeedbackModalOpen(false);
            setSelectedFeedback(null);
          }}
        />
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
