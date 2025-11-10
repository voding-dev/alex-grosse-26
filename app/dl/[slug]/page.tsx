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
import { Download, Calendar, AlertCircle, CreditCard, MessageSquare, Send, CheckCircle, MousePointerClick, MousePointer2, X, Sparkles, AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Image from "next/image";
import Link from "next/link";
import { Checkbox } from "@/components/ui/checkbox";
import { MasonryGrid } from "@/components/masonry-grid";
import { DeliveryGrid } from "@/components/delivery-grid";
import { Lightbox } from "@/components/lightbox";
import { Textarea } from "@/components/ui/textarea";
import { AssetFeedbackModal } from "@/components/asset-feedback-modal";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Info, Grid3x3, LayoutGrid } from "lucide-react";

export default function DeliveryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [pin, setPin] = useState(searchParams.get("pin") || "");
  const [isVerified, setIsVerified] = useState(false);
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set());
  const [projectFeedback, setProjectFeedback] = useState("");
  const [assetFeedback, setAssetFeedback] = useState<Record<string, string>>({});
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [selectedAssetForFeedback, setSelectedAssetForFeedback] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"masonry" | "grid">("grid");
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [showQuickTip, setShowQuickTip] = useState(true);
  const [pinErrorOpen, setPinErrorOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Detect if device is mobile/touch
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile('ontouchstart' in window || window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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
    if (!delivery) return;
    // Auto-verify if delivery has no PIN requirement
    if (!delivery.pinHash) {
      setIsVerified(true);
      return;
    }
    // Don't verify on every keystroke - verification is handled in onChange
    // This prevents errors from incomplete PINs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [delivery]);

  const handleVerify = async () => {
    // Don't verify if PIN is too short (incomplete)
    if (!pin || pin.length < 4) {
      return;
    }

    try {
      const result = await verifyPin({ slug, pin: pin || undefined });
      if (result.success) {
        setIsVerified(true);
        toast({
          title: "Access granted",
          description: "You can now view and download your files.",
        });
      }
    } catch (error: any) {
      // Only show error popup if PIN is complete (4+ characters)
      // This prevents showing errors for incomplete PINs while typing
      if (pin && pin.length >= 4) {
        setPinErrorOpen(true);
      }
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
      <div className="flex min-h-screen flex-col bg-background">
        {/* Subtle Branding Header */}
        <header className="sticky top-0 z-40 border-b border-foreground/10 bg-background/80 backdrop-blur-xl supports-backdrop-filter:bg-background/60">
          <div className="mx-auto max-w-7xl px-6 py-4">
            <div className="flex items-center justify-center">
              <Link href="/" className="flex flex-col items-center gap-2 group transition-opacity hover:opacity-80">
                <Image
                  src="/ic-wordmark-white.svg"
                  alt="COURTRIGHT"
                  width={200}
                  height={50}
                  className="h-8 w-auto object-contain opacity-60 group-hover:opacity-80 transition-opacity"
                />
                <span className="text-xs font-black uppercase tracking-wider text-foreground/60 group-hover:text-foreground/80 transition-colors" style={{ fontWeight: '900' }}>
                  Delivery Portal
                </span>
              </Link>
            </div>
          </div>
        </header>

        <div className="flex flex-1 items-center justify-center px-6 py-12">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-center">{delivery.pinHash ? "Enter PIN" : "One moment"}</CardTitle>
              <CardDescription className="text-center">
                {delivery.pinHash ? "Please enter your PIN to access this project" : "Verifying access..."}
              </CardDescription>
            </CardHeader>
          {delivery.pinHash && (
            <CardContent className="space-y-4">
              <Input
                type="password"
                value={pin}
                onChange={(e) => {
                  const newPin = e.target.value.replace(/\D/g, ''); // Only allow digits
                  setPin(newPin);
                  // Auto-verify when PIN reaches 4 digits
                  if (newPin.length === 4 && !isVerified) {
                    // Small delay to let the state update
                    setTimeout(() => {
                      handleVerify();
                    }, 100);
                  }
                }}
                placeholder="Enter 4-digit PIN"
                maxLength={4}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && pin.length >= 4) {
                    handleVerify();
                  }
                }}
              />
              <Button 
                onClick={handleVerify} 
                className="w-full"
                disabled={!pin || pin.length < 4}
              >
                Access Delivery
              </Button>
            </CardContent>
          )}
        </Card>
        </div>

        {/* Wrong PIN Error Dialog */}
        <Dialog open={pinErrorOpen} onOpenChange={setPinErrorOpen}>
          <DialogContent className="sm:max-w-md rounded-xl border border-foreground/20">
            <DialogHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-full bg-red-500/20 border border-red-500/30">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                </div>
                <DialogTitle className="text-xl font-black uppercase tracking-wider" style={{ fontWeight: '900' }}>
                  Wrong PIN
                </DialogTitle>
              </div>
              <DialogDescription className="text-base text-foreground/80">
                The PIN you entered is incorrect. Please try again.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4">
              <Button
                onClick={() => {
                  setPinErrorOpen(false);
                  setPin("");
                }}
                className="w-full font-black uppercase tracking-wider hover:bg-accent/90 transition-all hover:scale-105 shadow-lg"
                style={{ backgroundColor: '#FFA617', fontWeight: '900' }}
              >
                Try Again
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Subtle Branding Footer */}
        <footer className="border-t border-foreground/10 py-8">
          <div className="mx-auto max-w-7xl px-6">
            <div className="flex flex-col items-center justify-center gap-3">
              <Link href="/" className="flex items-center gap-2 group transition-opacity hover:opacity-80">
                <Image
                  src="/ic-brandmark-white.svg"
                  alt="Ian Courtright"
                  width={24}
                  height={24}
                  className="h-6 w-6 object-contain opacity-40 group-hover:opacity-60 transition-opacity"
                />
              </Link>
              <p className="text-xs text-foreground/40 font-medium">
                Secure delivery portal by Ian Courtright
              </p>
            </div>
          </div>
        </footer>
      </div>
    );
  }

  // Deliveries are now standalone - no project needed
  const filteredAssets =
    assets?.filter((asset) => (delivery.allowedAssetIds || []).includes(asset._id)) || [];

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

  const handleSelectAll = () => {
    if (selectedAssets.size === filteredAssets.length) {
      // Deselect all
      setSelectedAssets(new Set());
    } else {
      // Select all
      const allIds = new Set(filteredAssets.map((asset) => asset._id));
      setSelectedAssets(allIds);
    }
  };

  const isAllSelected = filteredAssets.length > 0 && selectedAssets.size === filteredAssets.length;
  const isSomeSelected = selectedAssets.size > 0 && selectedAssets.size < filteredAssets.length;

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

  const handleSubmitAssetFeedback = async (assetId: string, decision: "approve" | "changes" | "reject", comment: string) => {
    const feedbackText = comment || decision;

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
      setFeedbackModalOpen(false);
      setSelectedAssetForFeedback(null);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit feedback.",
        variant: "destructive",
      });
    }
  };

  const handleBulkApprove = async () => {
    if (selectedAssets.size === 0) {
      toast({
        title: "Error",
        description: "Please select at least one asset to approve.",
        variant: "destructive",
      });
      return;
    }

    try {
      const approvePromises = Array.from(selectedAssets).map((assetId) =>
        createFeedback({
          deliveryId: delivery._id,
          assetId: assetId as any,
          body: "Bulk approved",
          decision: "approve",
        })
      );

      await Promise.all(approvePromises);
      
      toast({
        title: "Assets approved",
        description: `${selectedAssets.size} asset(s) have been approved.`,
      });
      
      setSelectedAssets(new Set());
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to approve assets.",
        variant: "destructive",
      });
    }
  };

  const handleOpenFeedbackModal = (assetId: string) => {
    setSelectedAssetForFeedback(assetId);
    setFeedbackModalOpen(true);
  };

  // Convert assets to masonry grid format
  // Filter out assets with type "other" as MasonryGrid only supports "image" | "video" | "pdf"
  const masonryItems = filteredAssets
    .filter((asset) => asset.type !== "other")
    .map((asset) => ({
      id: asset._id,
      storageId: delivery.watermark && asset.previewKey ? asset.previewKey : asset.storageKey,
      alt: asset.filename,
      type: asset.type as "image" | "video" | "pdf",
      aspectRatio: asset.width && asset.height ? asset.width / asset.height : undefined,
    }));

  // Convert assets to grid format
  const gridItems = filteredAssets.map((asset) => ({
    id: asset._id,
    storageId: delivery.watermark && asset.previewKey ? asset.previewKey : asset.storageKey,
    filename: asset.filename,
    type: asset.type,
  }));

  const handleGridItemClick = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const handleDownloadClick = async (assetId: string) => {
    const asset = filteredAssets.find((a) => a._id === assetId);
    if (!asset) return;

    try {
      const url = await downloadAsset({ storageKey: asset.storageKey });
      if (!url) {
        toast({
          title: "Error",
          description: "Failed to get download URL.",
          variant: "destructive",
        });
        return;
      }
      const link = document.createElement("a");
      link.href = url;
      link.download = asset.filename || "download";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to download file.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Subtle Branding Header */}
      <header className="sticky top-0 z-40 border-b border-foreground/10 bg-background/80 backdrop-blur-xl supports-backdrop-filter:bg-background/60">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="flex items-center justify-center">
            <Link href="/" className="flex flex-col items-center gap-2 group transition-opacity hover:opacity-80">
              <Image
                src="/ic-wordmark-white.svg"
                alt="COURTRIGHT"
                width={200}
                height={50}
                className="h-8 w-auto object-contain opacity-60 group-hover:opacity-80 transition-opacity"
              />
              <span className="text-xs font-black uppercase tracking-wider text-foreground/60 group-hover:text-foreground/80 transition-colors" style={{ fontWeight: '900' }}>
                Delivery Portal
              </span>
            </Link>
          </div>
        </div>
      </header>

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
        <div className="mb-6">
          <h1 className="mb-2 text-4xl sm:text-5xl font-light text-foreground">{delivery.title}</h1>
          <p className="text-lg text-foreground/60 mb-4">{delivery.clientName}</p>
          {delivery.notesPublic && (
            <div className="mb-4 p-4 rounded-xl border border-foreground/20 bg-foreground/5 backdrop-blur-sm">
              <p className="text-sm text-foreground/70 leading-relaxed whitespace-pre-line">{delivery.notesPublic}</p>
            </div>
          )}
        </div>

        {/* Quick Tip Banner */}
        {showQuickTip && (
          <div className="mb-6 p-4 rounded-xl border-2 border-accent/40 bg-accent/10 backdrop-blur-sm relative">
            <button
              onClick={() => setShowQuickTip(false)}
              className="absolute top-3 right-3 p-1 rounded-full hover:bg-accent/20 transition-colors"
              aria-label="Dismiss tip"
            >
              <X className="h-4 w-4 text-foreground/60" />
            </button>
            <div className="flex items-start gap-3 pr-8">
              <Sparkles className="h-5 w-5 text-accent mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-black uppercase tracking-wider text-foreground mb-1" style={{ fontWeight: '900' }}>
                  Quick Tip
                </p>
                <div className="text-xs text-foreground/70 leading-relaxed">
                  {isMobile ? (
                    <p>
                      <strong className="font-black">Mobile:</strong> Tap any file once to see feedback and download buttons. Tap again to view full screen.
                    </p>
                  ) : (
                    <p>
                      <strong className="font-black">Desktop:</strong> Hover over any file to see feedback and download buttons. Click to view full screen.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Primary Actions Bar */}
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <div className={`flex items-center gap-3 px-5 py-3 rounded-xl border-2 transition-all ${
            isAllSelected 
              ? "border-accent bg-accent/10 shadow-lg shadow-accent/20" 
              : "border-foreground/20 bg-foreground/5 backdrop-blur-sm hover:border-foreground/40"
          }`}>
            <Checkbox
              checked={isAllSelected}
              onCheckedChange={handleSelectAll}
              className="h-5 w-5 border-2 border-foreground/40 data-[state=checked]:bg-accent data-[state=checked]:border-accent shadow-lg"
            />
            <div className="flex items-center gap-2">
              <CheckCircle className={`h-4 w-4 ${isAllSelected ? "text-accent" : "text-foreground/40"}`} />
              <span className="text-sm font-black uppercase tracking-wider text-foreground" style={{ fontWeight: '900' }}>
                Select All Files
              </span>
            </div>
            {selectedAssets.size > 0 && (
              <span className="text-xs font-medium text-accent bg-accent/20 px-2 py-1 rounded-full">
                {selectedAssets.size} selected
              </span>
            )}
          </div>
          
          {selectedAssets.size > 0 && (
            <>
              <Button 
                onClick={handleBulkApprove} 
                className="font-black uppercase tracking-wider bg-green-600 hover:bg-green-700 text-white border-2 border-green-600 hover:border-green-700 shadow-lg transition-all hover:scale-105"
                style={{ fontWeight: '900' }}
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Approve Selected ({selectedAssets.size})
              </Button>
              {delivery.allowZip && (
                <Button 
                  onClick={handleDownloadSelected} 
                  className="font-black uppercase tracking-wider bg-background text-foreground border-2 border-foreground/30 hover:bg-foreground hover:text-background shadow-lg transition-all hover:scale-105"
                  style={{ fontWeight: '900' }}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download Selected ({selectedAssets.size})
                </Button>
              )}
            </>
          )}
        </div>

        {/* Interaction Hints */}
        <div className="mb-6 flex flex-wrap items-center gap-3">
          {/* Desktop: Hover hint */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="hidden md:flex items-center gap-2 px-4 py-2 rounded-xl border border-accent/30 bg-accent/5 backdrop-blur-sm cursor-help">
                  <MousePointer2 className="h-4 w-4 text-accent" />
                  <span className="text-xs font-black uppercase tracking-wider text-foreground" style={{ fontWeight: '900' }}>
                    Hover for actions
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-xs leading-relaxed">
                  Move your cursor over any file to see feedback and download options appear.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Mobile: Tap hint */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex md:hidden items-center gap-2 px-4 py-2 rounded-xl border border-accent/30 bg-accent/5 backdrop-blur-sm cursor-help">
                  <MousePointerClick className="h-4 w-4 text-accent" />
                  <span className="text-xs font-black uppercase tracking-wider text-foreground" style={{ fontWeight: '900' }}>
                    Tap for actions
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-xs leading-relaxed">
                  Tap any file once to see feedback and download buttons. Tap again to view full screen.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl border border-accent/30 bg-accent/5 backdrop-blur-sm cursor-help">
                  <MousePointerClick className="h-4 w-4 text-accent" />
                  <span className="text-xs font-black uppercase tracking-wider text-foreground" style={{ fontWeight: '900' }}>
                    {isMobile ? 'Tap to enlarge' : 'Click to enlarge'}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-xs leading-relaxed">
                  {isMobile 
                    ? 'Tap any file again (after seeing buttons) to open it in full screen for detailed review.'
                    : 'Click any file to open it in full screen for detailed review.'
                  }
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Files Section Header */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-light">Your Files</h2>
            <div className="flex items-center gap-1 border-2 border-foreground/20 rounded-xl p-1 bg-background/50 backdrop-blur-sm">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => setViewMode("grid")}
                      className={`p-2.5 rounded-lg transition-all ${
                        viewMode === "grid"
                          ? "bg-accent text-background shadow-lg scale-105"
                          : "hover:bg-foreground/10 text-foreground/70 hover:text-foreground"
                      }`}
                      style={viewMode === "grid" ? { backgroundColor: '#FFA617' } : {}}
                    >
                      <Grid3x3 className="h-4 w-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Grid view (4 columns)</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => setViewMode("masonry")}
                      className={`p-2.5 rounded-lg transition-all ${
                        viewMode === "masonry"
                          ? "bg-accent text-background shadow-lg scale-105"
                          : "hover:bg-foreground/10 text-foreground/70 hover:text-foreground"
                      }`}
                      style={viewMode === "masonry" ? { backgroundColor: '#FFA617' } : {}}
                    >
                      <LayoutGrid className="h-4 w-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Gallery view (2 columns)</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {delivery.allowZip && (
              <Button 
                onClick={handleDownloadAll} 
                className="font-black uppercase tracking-wider bg-background text-foreground border-2 border-foreground/30 hover:bg-foreground hover:text-background shadow-lg transition-all hover:scale-105"
                style={{ fontWeight: '900' }}
              >
                <Download className="mr-2 h-4 w-4" />
                Download All
              </Button>
            )}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-foreground/20 text-foreground/70 hover:text-accent hover:border-accent transition-colors"
                    aria-label="How to provide feedback"
                  >
                    <Info className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="max-w-[320px] text-xs leading-relaxed">
                  <p className="font-black uppercase tracking-wider mb-2" style={{ fontWeight: '900' }}>Quick Guide</p>
                  <ul className="space-y-1">
                    <li>• Hover files for actions</li>
                    <li>• Click to view full screen</li>
                    <li>• Select multiple for bulk actions</li>
                    <li>• Use feedback section below for project comments</li>
                  </ul>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {/* Grid or Masonry View */}
        {filteredAssets.length > 0 ? (
          <div className="mb-12">
            {viewMode === "grid" ? (
              <DeliveryGrid
                items={gridItems}
                selectable={true}
                selectedIds={selectedAssets}
                onToggleSelect={toggleAsset}
                onItemClick={handleGridItemClick}
                onFeedbackClick={handleOpenFeedbackModal}
                onDownloadClick={handleDownloadClick}
              />
            ) : (
              <MasonryGrid 
                items={masonryItems} 
                selectable={true}
                selectedIds={selectedAssets}
                onToggleSelect={toggleAsset}
                onFeedbackClick={handleOpenFeedbackModal}
                onDownloadClick={handleDownloadClick}
              />
            )}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-foreground/60">No assets available.</p>
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
            onFeedbackClick={masonryItems[lightboxIndex] ? () => handleOpenFeedbackModal(masonryItems[lightboxIndex].id) : undefined}
          />
        )}

        {/* Delivery-Level Feedback */}
        <Card className="mb-8 border border-foreground/20 rounded-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl font-black uppercase tracking-wider" style={{ fontWeight: '900' }}>
              <MessageSquare className="h-5 w-5 text-accent" />
              Delivery Feedback
            </CardTitle>
            <CardDescription className="text-base">
              Share your overall feedback for this delivery
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={projectFeedback}
              onChange={(e) => setProjectFeedback(e.target.value)}
              placeholder="Enter your feedback about this delivery..."
              rows={4}
              className="text-base"
            />
            <Button 
              onClick={handleSubmitProjectFeedback}
              className="font-black uppercase tracking-wider hover:bg-accent/90 transition-all hover:scale-105 shadow-lg"
              style={{ backgroundColor: '#FFA617', fontWeight: '900' }}
            >
              <Send className="mr-2 h-4 w-4" />
              Submit Feedback
            </Button>
            {feedback?.filter((f) => !f.assetId).map((f) => (
              <div key={f._id} className="rounded-xl border border-foreground/10 bg-foreground/5 p-4 hover:border-accent/30 transition-colors">
                <p className="text-sm text-foreground/80 leading-relaxed mb-2">{f.body}</p>
                <p className="text-xs text-foreground/60 font-medium">
                  {new Date(f.createdAt).toLocaleDateString()} at {new Date(f.createdAt).toLocaleTimeString()}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Asset Feedback Modal */}
        {selectedAssetForFeedback && (
          <AssetFeedbackModal
            assetId={selectedAssetForFeedback}
            assetName={filteredAssets.find((a) => a._id === selectedAssetForFeedback)?.filename || "Asset"}
            isOpen={feedbackModalOpen}
            onClose={() => {
              setFeedbackModalOpen(false);
              setSelectedAssetForFeedback(null);
            }}
            onSubmitFeedback={handleSubmitAssetFeedback}
            onDownload={handleDownload}
            existingFeedback={feedback?.filter((f) => f.assetId === selectedAssetForFeedback) || []}
          />
        )}
      </div>

      {/* Subtle Branding Footer */}
      <footer className="mt-16 border-t border-foreground/10 py-8">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex flex-col items-center justify-center gap-3">
            <Link href="/" className="flex items-center gap-2 group transition-opacity hover:opacity-80">
              <Image
                src="/ic-brandmark-white.svg"
                alt="Ian Courtright"
                width={24}
                height={24}
                className="h-6 w-6 object-contain opacity-40 group-hover:opacity-60 transition-opacity"
              />
            </Link>
            <p className="text-xs text-foreground/40 font-medium">
              Secure delivery portal by Ian Courtright
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
