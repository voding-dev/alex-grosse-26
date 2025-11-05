"use client";

import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { use } from "react";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { useSearchParams } from "next/navigation";
import { Download, Calendar, AlertCircle, CreditCard, MessageSquare, Send } from "lucide-react";
import { MasonryGrid } from "@/components/masonry-grid";
import { Textarea } from "@/components/ui/textarea";

export default function DeliveryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [pin, setPin] = useState(searchParams.get("pin") || "");
  const [isVerified, setIsVerified] = useState(false);
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set());
  const [projectFeedback, setProjectFeedback] = useState("");
  const [assetFeedback, setAssetFeedback] = useState<Record<string, string>>({});

  const delivery = useQuery(api.deliveries.getBySlug, { slug });
  const verifyPin = useMutation(api.deliveries.verifyPin);
  const createFeedback = useMutation(api.feedback.create);
  const downloadAsset = useAction(api.storage.getSignedDownloadUrl);
  
  // Always call these hooks, but conditionally query
  const assets = useQuery(api.assets.list, {});
  const feedback = useQuery(
    api.feedback.listByDelivery,
    delivery?._id && isVerified ? { deliveryId: delivery._id } : ("skip" as const)
  );

  useEffect(() => {
    if (pin && delivery && !isVerified) {
      handleVerify();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin, delivery]);

  const handleVerify = async () => {
    if (!pin) {
      toast({
        title: "PIN required",
        description: "Please enter a PIN to access this delivery.",
        variant: "destructive",
      });
      return;
    }

    try {
      const result = await verifyPin({ slug, pin });
      if (result.success) {
        setIsVerified(true);
        toast({
          title: "Access granted",
          description: "You can now view and download your files.",
        });
      }
    } catch (error: any) {
      toast({
        title: "Access denied",
        description: error.message || "Invalid PIN",
        variant: "destructive",
      });
    }
  };

  if (!delivery) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  if (!isVerified) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Enter PIN</CardTitle>
            <CardDescription>Please enter your PIN to access this delivery</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="Enter PIN"
              onKeyDown={(e) => e.key === "Enter" && handleVerify()}
            />
            <Button onClick={handleVerify} className="w-full">
              Access Delivery
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Deliveries are now standalone - no project needed
  const filteredAssets =
    assets?.filter((asset) => delivery.allowedAssetIds.includes(asset._id)) || [];

  // Calculate expiration status
  const now = Date.now();
  const isExpired = delivery.expiresAt && delivery.expiresAt < now;
  const isPaidStorage = delivery.storageSubscriptionStatus === "active" && 
                        delivery.storageSubscriptionExpiresAt && 
                        delivery.storageSubscriptionExpiresAt > now;
  const expiresAtDate = delivery.expiresAt ? new Date(delivery.expiresAt) : null;
  const daysUntilExpiry = expiresAtDate && !isPaidStorage
    ? Math.ceil((delivery.expiresAt! - now) / (1000 * 60 * 60 * 24))
    : null;

  const handleSubscribeToStorage = async () => {
    toast({
      title: "Storage Subscription",
      description: "Monthly storage subscription feature coming soon. Contact admin to extend storage.",
    });
  };

  const toggleAsset = (assetId: string) => {
    const newSet = new Set(selectedAssets);
    if (newSet.has(assetId)) {
      newSet.delete(assetId);
    } else {
      newSet.add(assetId);
    }
    setSelectedAssets(newSet);
  };

  const handleDownload = async (assetId: string) => {
    try {
      const asset = filteredAssets.find((a) => a._id === assetId);
      if (!asset) return;

      // Get URL from Convex storage
      const url = await downloadAsset({ storageKey: asset.storageKey });
      if (url) {
        // Open URL in new tab to trigger download
        window.open(url, '_blank');
      } else {
        toast({
          title: "Error",
          description: "Failed to get download URL.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to download file.",
        variant: "destructive",
      });
    }
  };

  const handleDownloadSelected = async () => {
    if (selectedAssets.size === 0) return;
    
    toast({
      title: "Download started",
      description: `Downloading ${selectedAssets.size} file(s)...`,
    });
    // TODO: Create ZIP download
  };

  const handleDownloadAll = async () => {
    toast({
      title: "Download started",
      description: `Downloading all ${filteredAssets.length} files...`,
    });
    // TODO: Create ZIP download
  };

  const handleSubmitProjectFeedback = async () => {
    if (!projectFeedback.trim()) {
      toast({
        title: "Error",
        description: "Please enter feedback.",
        variant: "destructive",
      });
      return;
    }

    try {
      await createFeedback({
        deliveryId: delivery._id,
        body: projectFeedback,
        decision: undefined,
      });
      
      toast({
        title: "Feedback submitted",
        description: "Thank you for your feedback. We'll review it soon.",
      });
      
      setProjectFeedback("");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit feedback.",
        variant: "destructive",
      });
    }
  };

  const handleSubmitAssetFeedback = async (assetId: string, decision: "approve" | "changes" | "reject") => {
    const feedbackText = assetFeedback[assetId] || decision;

    try {
      await createFeedback({
        deliveryId: delivery._id,
        assetId: assetId as any,
        body: feedbackText,
        decision,
      });
      
      toast({
        title: "Feedback submitted",
        description: "Thank you for your feedback.",
      });
      
      setAssetFeedback({ ...assetFeedback, [assetId]: "" });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit feedback.",
        variant: "destructive",
      });
    }
  };

  // Convert assets to masonry grid format
  // Filter out assets with type "other" as MasonryGrid only supports "image" | "video" | "pdf"
  const masonryItems = filteredAssets
    .filter((asset) => asset.type !== "other")
    .map((asset) => ({
      id: asset._id,
      src: delivery.watermark && asset.previewKey ? asset.previewKey : asset.storageKey,
      alt: asset.filename,
      type: asset.type as "image" | "video" | "pdf",
      aspectRatio: asset.width && asset.height ? asset.width / asset.height : undefined,
    }));

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-6 py-12">
        {/* Expiration Warning */}
        {!isPaidStorage && (isExpired || (daysUntilExpiry !== null && daysUntilExpiry <= 7)) && (
          <Card className={`mb-8 ${
            isExpired 
              ? "border-red-200 bg-red-50/50 dark:border-red-900 dark:bg-red-950/20" 
              : "border-yellow-200 bg-yellow-50/50 dark:border-yellow-900 dark:bg-yellow-950/20"
          }`}>
            <CardContent className="py-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <AlertCircle className={`h-5 w-5 mt-0.5 ${
                    isExpired ? "text-red-600" : "text-yellow-600"
                  }`} />
                  <div>
                    <h3 className={`font-medium ${
                      isExpired ? "text-red-900 dark:text-red-200" : "text-yellow-900 dark:text-yellow-200"
                    }`}>
                      {isExpired ? "Storage Expired" : "Storage Expiring Soon"}
                    </h3>
                    <p className={`text-sm mt-1 ${
                      isExpired ? "text-red-700 dark:text-red-300" : "text-yellow-700 dark:text-yellow-300"
                    }`}>
                      {isExpired 
                        ? `Your free storage expired on ${expiresAtDate?.toLocaleDateString()}. Files are no longer accessible.`
                        : `Your free storage expires in ${daysUntilExpiry} day${daysUntilExpiry !== 1 ? 's' : ''} (${expiresAtDate?.toLocaleDateString()}). Download your files or subscribe to monthly storage to keep them accessible.`
                      }
                    </p>
                  </div>
                </div>
                {!isExpired && (
                  <Button 
                    onClick={handleSubscribeToStorage}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <CreditCard className="mr-2 h-4 w-4" />
                    Subscribe to Storage
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Delivery Header */}
        <div className="mb-12">
          <h1 className="mb-2 text-4xl font-light">{delivery.title}</h1>
          <p className="text-lg text-foreground/60">{delivery.clientName}</p>
          {delivery.notesPublic && (
            <p className="mt-4 text-foreground/80 whitespace-pre-line">{delivery.notesPublic}</p>
          )}
        </div>

        {/* Download Actions */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-2xl font-light">Your Files</h2>
          <div className="flex gap-2">
            {delivery.allowZip && (
              <>
                {selectedAssets.size > 0 && (
                  <Button onClick={handleDownloadSelected} variant="outline">
                    <Download className="mr-2 h-4 w-4" />
                    Download Selected ({selectedAssets.size})
                  </Button>
                )}
                <Button onClick={handleDownloadAll} variant="outline">
                  <Download className="mr-2 h-4 w-4" />
                  Download All
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Masonry Grid */}
        {masonryItems.length > 0 ? (
          <div className="mb-12">
            <MasonryGrid 
              items={masonryItems} 
              selectable={delivery.allowZip}
              selectedIds={selectedAssets}
              onToggleSelect={toggleAsset}
            />
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-foreground/60">No assets available.</p>
            </CardContent>
          </Card>
        )}

        {/* Delivery-Level Feedback */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Delivery Feedback
            </CardTitle>
            <CardDescription>
              Share your overall feedback for this delivery
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={projectFeedback}
              onChange={(e) => setProjectFeedback(e.target.value)}
              placeholder="Enter your feedback about this delivery..."
              rows={4}
            />
            <Button onClick={handleSubmitProjectFeedback}>
              <Send className="mr-2 h-4 w-4" />
              Submit Feedback
            </Button>
            {feedback?.filter((f) => !f.assetId).map((f) => (
              <div key={f._id} className="rounded-md border border-foreground/10 bg-foreground/5 p-3">
                <p className="text-sm text-foreground/80">{f.body}</p>
                <p className="mt-1 text-xs text-foreground/60">
                  {new Date(f.createdAt).toLocaleDateString()}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Asset-Level Feedback */}
        {filteredAssets.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Feedback on Individual Files</CardTitle>
              <CardDescription>
                Review and provide feedback on each file
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {filteredAssets.map((asset) => {
                  const assetFb = feedback?.filter((f) => f.assetId === asset._id);
                  return (
                    <div key={asset._id} className="rounded-md border border-foreground/10 p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">{asset.filename}</h4>
                          <p className="text-sm text-foreground/60">
                            {asset.type} • {asset.size ? `${(asset.size / 1024 / 1024).toFixed(2)} MB` : "Unknown size"}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownload(asset._id)}
                        >
                          <Download className="mr-2 h-3 w-3" />
                          Download
                        </Button>
                      </div>
                      <div className="mb-3 flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSubmitAssetFeedback(asset._id, "approve")}
                        >
                          Approve
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSubmitAssetFeedback(asset._id, "changes")}
                        >
                          Needs Changes
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSubmitAssetFeedback(asset._id, "reject")}
                        >
                          Reject
                        </Button>
                      </div>
                      <Textarea
                        value={assetFeedback[asset._id] || ""}
                        onChange={(e) => setAssetFeedback({ ...assetFeedback, [asset._id]: e.target.value })}
                        placeholder="Add a comment..."
                        rows={2}
                        className="mb-2"
                      />
                      {assetFb && assetFb.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {assetFb.map((f) => (
                            <div key={f._id} className="rounded-md bg-foreground/5 p-2">
                              <div className="flex items-center gap-2">
                                <span className={`text-xs font-medium ${
                                  f.decision === "approve" ? "text-green-600" :
                                  f.decision === "reject" ? "text-red-600" :
                                  "text-yellow-600"
                                }`}>
                                  {f.decision?.toUpperCase()}
                                </span>
                                <span className="text-xs text-foreground/60">
                                  {new Date(f.createdAt).toLocaleDateString()}
                                </span>
                              </div>
                              <p className="mt-1 text-sm text-foreground/80">{f.body}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
