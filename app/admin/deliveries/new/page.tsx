"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";
import Link from "next/link";
import { Package, Info, Image as ImageIcon, Video, FileText, Check, Upload } from "lucide-react";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { AssetUploader } from "@/components/asset-uploader";
import { Id } from "@/convex/_generated/dataModel";

export default function NewDeliveryPage() {
  const router = useRouter();
  const { toast } = useToast();
  const createDelivery = useMutation(api.deliveries.create);
  const { adminEmail } = useAdminAuth();

  const [formData, setFormData] = useState({
    title: "",
    clientName: "",
    slug: "",
    pin: "",
    expiresAt: "",
    notesPublic: "",
    selectedAssetIds: [] as string[],
  });

  // Get uploaded assets for this delivery (will be populated after delivery is created)
  // For now, we'll use a state to track uploaded asset IDs before delivery creation
  const [uploadedAssetIds, setUploadedAssetIds] = useState<string[]>([]);

  // Calculate default expiration (30 days from now)
  const defaultExpirationDate = new Date();
  defaultExpirationDate.setDate(defaultExpirationDate.getDate() + 30);
  const defaultExpirationString = defaultExpirationDate.toISOString().split('T')[0];

  // Get all assets to select from (we'll show recently uploaded ones)
  // In a better implementation, we could track which assets were just uploaded
  const allAssets = useQuery(api.assets.list, {});

  // Filter to show recently uploaded assets or allow filtering
  const recentAssets = allAssets?.slice(0, 100) || []; // Show recent assets

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.slug || !formData.pin || !formData.title || !formData.clientName) {
      toast({
        title: "Error",
        description: "Please fill in title, client name, delivery slug, and PIN.",
        variant: "destructive",
      });
      return;
    }

    if (formData.selectedAssetIds.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one asset.",
        variant: "destructive",
      });
      return;
    }

    try {
      const expiresAt = formData.expiresAt 
        ? new Date(formData.expiresAt).getTime()
        : undefined;

      const deliveryId = await createDelivery({
        title: formData.title,
        clientName: formData.clientName,
        slug: formData.slug,
        pin: formData.pin,
        expiresAt,
        watermark: true,
        allowZip: true,
        allowedAssetIds: formData.selectedAssetIds as any[],
        notesPublic: formData.notesPublic || undefined,
        email: adminEmail || undefined,
      });

      const deliveryUrl = `${window.location.origin}/dl/${formData.slug}`;

      toast({
        title: "Delivery portal created!",
        description: "Copy the link and PIN to send to your client.",
      });

      router.push(`/admin/deliveries?created=${formData.slug}`);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create delivery.",
        variant: "destructive",
      });
    }
  };

  const toggleAsset = (assetId: string) => {
    if (formData.selectedAssetIds.includes(assetId)) {
      setFormData({
        ...formData,
        selectedAssetIds: formData.selectedAssetIds.filter((id) => id !== assetId),
      });
    } else {
      setFormData({
        ...formData,
        selectedAssetIds: [...formData.selectedAssetIds, assetId],
      });
    }
  };

  const selectAllAssets = () => {
    if (recentAssets) {
      setFormData({
        ...formData,
        selectedAssetIds: recentAssets.map((a) => a._id),
      });
    }
  };

  const deselectAllAssets = () => {
    setFormData({
      ...formData,
      selectedAssetIds: [],
    });
  };

  const getAssetIcon = (type: string) => {
    switch (type) {
      case "image":
        return <ImageIcon className="h-4 w-4" />;
      case "video":
        return <Video className="h-4 w-4" />;
      case "pdf":
        return <FileText className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const handleUploadComplete = () => {
    // Refresh assets list after upload
    // In a real implementation, we'd track which assets were just uploaded
    router.refresh();
  };

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8 sm:py-12">
      <div className="mb-8 sm:mb-12">
        <Link href="/admin/deliveries" className="text-sm text-accent hover:text-accent/80 font-bold uppercase tracking-wider inline-flex items-center gap-1 group mb-4">
          <span className="group-hover:-translate-x-1 transition-transform">←</span>
          Back to Deliveries
        </Link>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight text-foreground mb-4" style={{ fontWeight: '900', letterSpacing: '-0.02em' }}>
          Create Delivery Portal
        </h1>
        <p className="text-foreground/70 text-base sm:text-lg">
          Create a PIN-gated portal to send files to clients (like Pixieset)
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Info Banner */}
        <Card className="border border-accent/30 bg-accent/5">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 mt-0.5 text-accent flex-shrink-0" />
              <div className="text-sm text-foreground/80 leading-relaxed">
                <p className="font-black uppercase tracking-wider mb-3 text-foreground" style={{ fontWeight: '900' }}>
                  How this works:
                </p>
                <ol className="ml-4 list-decimal space-y-2">
                  <li>Enter delivery details (title, client name, slug, PIN)</li>
                  <li>Upload assets directly or select from existing assets</li>
                  <li>Choose which assets to include in the delivery</li>
                  <li>Copy the link and PIN to send to your client via email</li>
                  <li>Client enters PIN to view, download, and provide feedback</li>
                </ol>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Step 1: Delivery Details */}
        <Card className="border border-foreground/20">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-black uppercase tracking-wider" style={{ fontWeight: '900' }}>
              Step 1: Delivery Details
            </CardTitle>
            <CardDescription className="text-base">
              Enter the basic information for this delivery portal
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label htmlFor="title" className="text-sm font-black uppercase tracking-wider mb-3 block" style={{ fontWeight: '900' }}>
                Delivery Title *
              </Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Brand Campaign - Final Deliverables"
                required
                className="h-12 text-base"
              />
              <p className="mt-2 text-xs text-foreground/60">
                A descriptive title for this delivery
              </p>
            </div>

            <div>
              <Label htmlFor="clientName" className="text-sm font-black uppercase tracking-wider mb-3 block" style={{ fontWeight: '900' }}>
                Client Name *
              </Label>
              <Input
                id="clientName"
                value={formData.clientName}
                onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                placeholder="Client Name"
                required
                className="h-12 text-base"
              />
            </div>

            <div>
              <Label htmlFor="slug" className="text-sm font-black uppercase tracking-wider mb-3 block" style={{ fontWeight: '900' }}>
                Delivery URL Slug *
              </Label>
              <Input
                id="slug"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                placeholder="client-name-finals-2024"
                required
                className="h-12 text-base"
              />
              <p className="mt-2 text-xs text-foreground/60">
                Client will access at: /dl/{formData.slug || "..."}
              </p>
            </div>

            <div>
              <Label htmlFor="pin" className="text-sm font-black uppercase tracking-wider mb-3 block" style={{ fontWeight: '900' }}>
                PIN Code *
              </Label>
              <Input
                id="pin"
                type="password"
                value={formData.pin}
                onChange={(e) => setFormData({ ...formData, pin: e.target.value })}
                placeholder="Enter PIN for client access"
                required
                className="h-12 text-base"
              />
              <p className="mt-2 text-xs text-foreground/60">
                Client will need this PIN to access the delivery portal
              </p>
            </div>

            <div>
              <Label htmlFor="notesPublic" className="text-sm font-black uppercase tracking-wider mb-3 block" style={{ fontWeight: '900' }}>
                Public Notes (Optional)
              </Label>
              <Textarea
                id="notesPublic"
                value={formData.notesPublic}
                onChange={(e) => setFormData({ ...formData, notesPublic: e.target.value })}
                placeholder="Optional notes visible to the client"
                rows={3}
                className="text-base"
              />
            </div>

            <div>
              <Label htmlFor="expiresAt" className="text-sm font-black uppercase tracking-wider mb-3 block" style={{ fontWeight: '900' }}>
                Expiration Date (Free Storage)
              </Label>
              <Input
                id="expiresAt"
                type="date"
                value={formData.expiresAt || defaultExpirationString}
                onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                min={defaultExpirationString}
                className="h-12 text-base"
              />
              <p className="mt-2 text-xs text-foreground/60">
                Files expire on this date. Defaults to 30 days. Clients can subscribe for extended storage.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Step 2: Upload Assets */}
        <Card className="border border-foreground/20">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-black uppercase tracking-wider" style={{ fontWeight: '900' }}>
              Step 2: Upload Assets
            </CardTitle>
            <CardDescription className="text-base">
              Upload files for this delivery (you can also select from existing assets below)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AssetUploader 
              uploadType="delivery"
              onUploadComplete={handleUploadComplete}
            />
            <p className="mt-4 text-xs text-foreground/60">
              Note: After uploading, refresh the page or wait a moment, then select the uploaded assets below.
            </p>
          </CardContent>
        </Card>

        {/* Step 3: Select Assets */}
        <Card className="border border-foreground/20">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-black uppercase tracking-wider" style={{ fontWeight: '900' }}>
              Step 3: Select Assets
            </CardTitle>
            <CardDescription className="text-base">
              Choose which files to include in the delivery portal
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
              <div className="flex gap-2 flex-wrap">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={selectAllAssets}
                  className="font-bold uppercase tracking-wider hover:bg-accent hover:text-background hover:border-accent transition-colors"
                >
                  Select All
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={deselectAllAssets}
                  className="font-bold uppercase tracking-wider hover:bg-accent hover:text-background hover:border-accent transition-colors"
                >
                  Deselect All
                </Button>
              </div>
              <span className="text-sm text-foreground/60 font-bold uppercase tracking-wider sm:ml-auto">
                {formData.selectedAssetIds.length} selected
              </span>
            </div>

            {recentAssets && recentAssets.length > 0 ? (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {recentAssets.map((asset) => (
                  <div
                    key={asset._id}
                    onClick={() => toggleAsset(asset._id)}
                    className={`flex items-center gap-3 rounded-lg border p-4 cursor-pointer transition-all ${
                      formData.selectedAssetIds.includes(asset._id)
                        ? "border-accent bg-accent/10"
                        : "border-foreground/10 hover:bg-foreground/5 hover:border-accent/30"
                    }`}
                  >
                    <div className={`flex h-6 w-6 items-center justify-center rounded border-2 ${
                      formData.selectedAssetIds.includes(asset._id)
                        ? "border-accent bg-accent"
                        : "border-foreground/20"
                    }`}>
                      {formData.selectedAssetIds.includes(asset._id) && (
                        <Check className="h-4 w-4 text-background" />
                      )}
                    </div>
                    <div className="flex items-center gap-3 flex-1">
                      <div className="text-accent">
                        {getAssetIcon(asset.type)}
                      </div>
                      <div>
                        <p className="text-sm font-bold">{asset.filename}</p>
                        <p className="text-xs text-foreground/60">
                          {asset.type} • {asset.size ? `${(asset.size / 1024 / 1024).toFixed(2)} MB` : "Unknown size"}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-foreground/60">No assets available. Upload assets using the uploader above.</p>
            )}
          </CardContent>
        </Card>

        {/* Submit */}
        {formData.selectedAssetIds.length > 0 && (
          <div className="flex flex-col sm:flex-row gap-4">
            <Button 
              type="submit" 
              className="w-full sm:flex-1 font-black uppercase tracking-wider hover:bg-accent/90 transition-colors"
              style={{ backgroundColor: '#FFA617', fontWeight: '900' }}
            >
              <Package className="mr-2 h-4 w-4" />
              Create Delivery Portal
            </Button>
            <Link href="/admin/deliveries" className="w-full sm:w-auto">
              <Button 
                type="button" 
                variant="outline"
                className="w-full sm:w-auto font-bold uppercase tracking-wider hover:bg-foreground/10 transition-colors"
              >
                Cancel
              </Button>
            </Link>
          </div>
        )}
      </form>
    </div>
  );
}
