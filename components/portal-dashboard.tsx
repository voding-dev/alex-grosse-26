"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Card, CardContent } from "@/components/ui/card";
import { DeliveryGrid } from "@/components/delivery-grid";
import { MasonryGrid } from "@/components/masonry-grid";
import { Lightbox } from "@/components/lightbox";
import { useState, useMemo } from "react";
import { Grid3x3, LayoutGrid, Filter, CheckCircle, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface PortalDashboardProps {
  deliveryId: Id<"deliveries">;
  onAssetClick?: (assetId: string) => void;
}

type FilterType = "all" | "approved" | "with-feedback" | "no-feedback";

export function PortalDashboard({ deliveryId, onAssetClick }: PortalDashboardProps) {
  const [viewMode, setViewMode] = useState<"masonry" | "grid">("grid");
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [filter, setFilter] = useState<FilterType>("all");

  const delivery = useQuery(api.deliveries.get, { id: deliveryId });
  const assets = useQuery(api.assets.list, {});
  const feedback = useQuery(
    api.feedback.listByDelivery,
    deliveryId ? { deliveryId } : ("skip" as const)
  );

  // Filter assets for this delivery and sort by sortOrder (top to bottom)
  const filteredAssets = useMemo(() => {
    if (!delivery || !assets) return [];
    const allowedAssetIds = delivery.allowedAssetIds;
    if (!allowedAssetIds || allowedAssetIds.length === 0) {
      return [];
    }
    const filtered = (assets || []).filter((asset) => allowedAssetIds.includes(asset._id));
    // Sort by sortOrder ascending (top to bottom)
    return filtered.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  }, [delivery, assets]);

  // Group feedback by asset
  const feedbackByAsset = useMemo(() => {
    return (feedback || []).reduce((acc: Record<string, any[]>, fb: any) => {
      if (fb.assetId) {
        if (!acc[fb.assetId]) {
          acc[fb.assetId] = [];
        }
        acc[fb.assetId].push(fb);
      }
      return acc;
    }, {});
  }, [feedback]);

  // Get project-level feedback
  const projectFeedback = useMemo(() => {
    return (feedback || []).filter((fb: any) => !fb.assetId);
  }, [feedback]);

  // Get latest decision for each asset
  const assetStatus = useMemo(() => {
    const status: Record<string, { hasFeedback: boolean; isApproved: boolean; latestDecision?: string; feedbackCount: number }> = {};
    
    filteredAssets.forEach((asset) => {
      const assetFeedback = feedbackByAsset[asset._id] || [];
      const latestFeedback = assetFeedback.sort((a: any, b: any) => b.createdAt - a.createdAt)[0];
      
      status[asset._id] = {
        hasFeedback: assetFeedback.length > 0,
        isApproved: latestFeedback?.decision === "approve",
        latestDecision: latestFeedback?.decision,
        feedbackCount: assetFeedback.length,
      };
    });
    
    return status;
  }, [filteredAssets, feedbackByAsset]);

  // Filter assets based on selected filter
  const filteredAssetsByStatus = useMemo(() => {
    if (filter === "all") return filteredAssets;
    
    return filteredAssets.filter((asset) => {
      const status = assetStatus[asset._id];
      if (filter === "approved") {
        return status.isApproved;
      }
      if (filter === "with-feedback") {
        return status.hasFeedback;
      }
      if (filter === "no-feedback") {
        return !status.hasFeedback;
      }
      return true;
    });
  }, [filteredAssets, assetStatus, filter]);

  // Convert filtered assets to masonry grid format
  const masonryItems = useMemo(() => {
    if (!delivery) return [];
    return filteredAssetsByStatus
      .filter((asset) => asset.type !== "other")
      .map((asset) => ({
        id: asset._id,
        storageId: delivery.watermark && asset.previewKey ? asset.previewKey : asset.storageKey,
        alt: asset.filename,
        type: asset.type as "image" | "video" | "pdf",
        aspectRatio: asset.width && asset.height ? asset.width / asset.height : undefined,
        hasFeedback: assetStatus[asset._id]?.hasFeedback || false,
        isApproved: assetStatus[asset._id]?.isApproved || false,
        feedbackCount: assetStatus[asset._id]?.feedbackCount || 0,
      }));
  }, [filteredAssetsByStatus, delivery, assetStatus]);

  // Convert filtered assets to grid format
  const gridItems = useMemo(() => {
    if (!delivery) return [];
    return filteredAssetsByStatus.map((asset) => ({
      id: asset._id,
      storageId: delivery.watermark && asset.previewKey ? asset.previewKey : asset.storageKey,
      filename: asset.filename,
      type: asset.type,
      hasFeedback: assetStatus[asset._id]?.hasFeedback || false,
      isApproved: assetStatus[asset._id]?.isApproved || false,
      feedbackCount: assetStatus[asset._id]?.feedbackCount || 0,
    }));
  }, [filteredAssetsByStatus, delivery, assetStatus]);

  // Early return after all hooks are called
  if (!delivery) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-foreground/60">Loading delivery...</p>
      </div>
    );
  }

  const handleGridItemClick = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const handleAssetClick = (assetId: string) => {
    onAssetClick?.(assetId);
  };

  return (
    <div className="space-y-6">
      {/* View Toggle and Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-lg font-black uppercase tracking-wider text-foreground mb-2" style={{ fontWeight: '900' }}>
            Delivery Assets
          </h3>
          <p className="text-sm text-foreground/60">
            {filteredAssetsByStatus.length} of {filteredAssets.length} {filteredAssets.length === 1 ? "asset" : "assets"}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Filter Buttons */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-foreground/60" />
            <Button
              variant={filter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("all")}
              className="font-black uppercase tracking-wider text-xs"
              style={{ fontWeight: '900' }}
            >
              All
            </Button>
            <Button
              variant={filter === "approved" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("approved")}
              className="font-black uppercase tracking-wider text-xs"
              style={{ fontWeight: '900' }}
            >
              <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
              Approved
            </Button>
            <Button
              variant={filter === "with-feedback" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("with-feedback")}
              className="font-black uppercase tracking-wider text-xs"
              style={{ fontWeight: '900' }}
            >
              <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
              With Feedback
            </Button>
            <Button
              variant={filter === "no-feedback" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("no-feedback")}
              className="font-black uppercase tracking-wider text-xs"
              style={{ fontWeight: '900' }}
            >
              No Feedback
            </Button>
          </div>
          {/* View Toggle */}
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === "grid" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("grid")}
              className="font-black uppercase tracking-wider"
              style={{ fontWeight: '900' }}
            >
              <Grid3x3 className="h-4 w-4 mr-2" />
              Grid
            </Button>
            <Button
              variant={viewMode === "masonry" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("masonry")}
              className="font-black uppercase tracking-wider"
              style={{ fontWeight: '900' }}
            >
              <LayoutGrid className="h-4 w-4 mr-2" />
              Gallery
            </Button>
          </div>
        </div>
      </div>

      {/* Assets Display */}
      {filteredAssetsByStatus.length > 0 ? (
        <div>
          {viewMode === "grid" ? (
            <DeliveryGrid
              items={gridItems}
              selectable={false}
              onItemClick={handleGridItemClick}
              onFeedbackClick={handleAssetClick}
              showFeedbackStatus={true}
            />
          ) : (
            <MasonryGrid 
              items={masonryItems}
              selectable={false}
              onFeedbackClick={handleAssetClick}
              showFeedbackStatus={true}
            />
          )}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-foreground/60">No assets match the selected filter.</p>
          </CardContent>
        </Card>
      )}

      {/* Lightbox for Grid View */}
      {lightboxOpen && viewMode === "grid" && masonryItems.length > 0 && (
        <Lightbox
          images={masonryItems.map((item) => ({
            id: item.id,
            storageId: item.storageId,
            alt: item.alt || "",
            type: item.type,
          }))}
          currentIndex={lightboxIndex}
          onClose={() => setLightboxOpen(false)}
          onNext={() => setLightboxIndex((prev) => (prev + 1) % masonryItems.length)}
          onPrev={() => setLightboxIndex((prev) => (prev - 1 + masonryItems.length) % masonryItems.length)}
        />
      )}

      {/* Project-Level Feedback */}
      {projectFeedback.length > 0 && (
        <Card className="border border-foreground/20 rounded-xl">
          <CardContent className="p-6">
            <h3 className="text-lg font-black uppercase tracking-wider text-foreground mb-4" style={{ fontWeight: '900' }}>
              Project-Level Feedback
            </h3>
            <div className="space-y-4">
              {projectFeedback.map((fb: any) => (
                <div
                  key={fb._id}
                  className="rounded-xl border border-foreground/10 bg-foreground/5 p-4 hover:border-accent/30 transition-colors"
                >
                  <div className="flex items-start gap-3 mb-3">
                    {fb.decision && (
                      <Badge
                        className={`font-black uppercase tracking-wider ${
                          fb.decision === "approve"
                            ? "bg-green-500/20 text-green-600 border-green-500/30"
                            : fb.decision === "reject"
                            ? "bg-red-500/20 text-red-600 border-red-500/30"
                            : "bg-yellow-500/20 text-yellow-600 border-yellow-500/30"
                        }`}
                        style={{ fontWeight: '900' }}
                      >
                        {fb.decision.toUpperCase()}
                      </Badge>
                    )}
                    <span className="text-xs text-foreground/60 font-medium">
                      {format(new Date(fb.createdAt), "MMM d, yyyy 'at' h:mm a")}
                    </span>
                  </div>
                  <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">{fb.body}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

