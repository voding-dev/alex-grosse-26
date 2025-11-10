"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";
import Link from "next/link";
import { Package, Upload, Trash2, ChevronUp, ChevronDown } from "lucide-react";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { AssetUploader } from "@/components/asset-uploader";
import { AssetThumbnail } from "@/components/asset-thumbnail";
import { Id } from "@/convex/_generated/dataModel";

export default function EditDeliveryPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const deliveryId = params.id as string;
  const updateDelivery = useMutation(api.deliveries.update);
  const { adminEmail } = useAdminAuth();

  const delivery = useQuery(api.deliveries.get, { id: deliveryId as Id<"deliveries"> });
  // Get assets specifically for this delivery
  const assets = useQuery(api.assets.list, delivery ? { deliveryId: delivery._id, uploadType: "delivery" } : "skip");
  const deleteAsset = useMutation(api.assets.remove);
  const reorderAssets = useMutation(api.assets.reorder);

  const [formData, setFormData] = useState({
    title: "",
    clientName: "",
    slug: "",
    pin: "",
    expiresAt: "",
    notesPublic: "",
  });

  const [requirePin, setRequirePin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (delivery) {
      const expiresAtDate = delivery.expiresAt ? new Date(delivery.expiresAt).toISOString().split('T')[0] : "";
      setFormData({
        title: delivery.title || "",
        clientName: delivery.clientName || "",
        slug: delivery.slug || "",
        pin: delivery.pinPlaintext || "",
        expiresAt: expiresAtDate,
        notesPublic: delivery.notesPublic || "",
      });
      setRequirePin(!!delivery.pinHash);
      setIsLoading(false);
    }
  }, [delivery]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.slug || !formData.title || !formData.clientName) {
      toast({
        title: "Error",
        description: "Please fill in title, client name, and delivery slug.",
        variant: "destructive",
      });
      return;
    }

    if (requirePin && !formData.pin) {
      toast({
        title: "Error",
        description: "Please enter a PIN or uncheck 'Require PIN'.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const expiresAt = formData.expiresAt 
        ? new Date(formData.expiresAt).getTime()
        : undefined;

      // Get all asset IDs for this delivery
      const assetIds = assets ? assets.map(a => a._id) : [];
      
      await updateDelivery({
        id: deliveryId as Id<"deliveries">,
        title: formData.title,
        clientName: formData.clientName,
        slug: formData.slug,
        pin: requirePin ? formData.pin : undefined,
        expiresAt,
        allowedAssetIds: assetIds,
        notesPublic: formData.notesPublic || undefined,
        email: adminEmail || undefined,
      });

      toast({
        title: "Delivery portal updated!",
        description: "Changes have been saved successfully.",
      });

      router.push(`/admin/deliveries`);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update delivery.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };


  const handleUploadComplete = () => {
    router.refresh();
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8 sm:py-12">
        <div className="text-center py-16">
          <p className="text-foreground/60">Loading delivery portal...</p>
        </div>
      </div>
    );
  }

  if (!delivery) {
    return (
      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8 sm:py-12">
        <div className="text-center py-16">
          <p className="text-foreground/60 mb-4">Delivery portal not found.</p>
          <Link href="/admin/deliveries">
            <Button variant="outline">Back to Deliveries</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8 sm:py-12">
      <div className="mb-8 sm:mb-12">
        <Link href="/admin/deliveries" className="text-sm text-accent hover:text-accent/80 font-bold uppercase tracking-wider inline-flex items-center gap-1 group mb-4">
          <span className="group-hover:-translate-x-1 transition-transform">←</span>
          Back to Deliveries
        </Link>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight text-foreground mb-4" style={{ fontWeight: '900', letterSpacing: '-0.02em' }}>
          Edit Delivery Portal
        </h1>
        <p className="text-foreground/70 text-base sm:text-lg">
          Update delivery portal details and assets
        </p>
      </div>

      <Tabs defaultValue="details" className="space-y-8">
        <TabsList className="grid w-full grid-cols-2 max-w-md bg-foreground/5 border border-foreground/20 rounded-lg p-1.5 h-auto items-center gap-1">
          <TabsTrigger 
            value="details" 
            className="font-bold uppercase tracking-wider data-[state=active]:bg-accent data-[state=active]:text-background data-[state=inactive]:text-foreground/60 hover:text-foreground transition-all rounded-md py-2 sm:py-3 px-2 sm:px-4 h-full flex items-center justify-center text-xs sm:text-sm"
          >
            Details
          </TabsTrigger>
          <TabsTrigger 
            value="assets" 
            className="font-bold uppercase tracking-wider data-[state=active]:bg-accent data-[state=active]:text-background data-[state=inactive]:text-foreground/60 hover:text-foreground transition-all rounded-md py-2 sm:py-3 px-2 sm:px-4 h-full flex items-center justify-center text-xs sm:text-sm"
          >
            Assets ({assets?.length || 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="details">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Delivery Details */}
            <Card className="border border-foreground/20">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl font-black uppercase tracking-wider" style={{ fontWeight: '900' }}>
                  Delivery Details
                </CardTitle>
                <CardDescription className="text-base">
                  Update the basic information for this delivery portal
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
              {delivery && formData.slug !== delivery.slug && (
                <p className="mt-2 text-xs text-yellow-500/80 font-medium">
                  ⚠️ Changing the slug will break existing links. Make sure to update any shared links.
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="pin" className="text-sm font-black uppercase tracking-wider mb-3 block" style={{ fontWeight: '900' }}>
                Require PIN
              </Label>
              <div className="flex items-center gap-3">
                <input
                  id="requirePin"
                  type="checkbox"
                  checked={requirePin}
                  onChange={(e) => setRequirePin(e.target.checked)}
                  className="h-4 w-4"
                />
                <Label htmlFor="requirePin" className="text-sm font-medium">Require PIN to access</Label>
              </div>
              {requirePin && (
                <div className="mt-3">
                  <Input
                    id="pin"
                    type="password"
                    value={formData.pin}
                    onChange={(e) => setFormData({ ...formData, pin: e.target.value })}
                    placeholder="Enter PIN for client access"
                    className="h-12 text-base"
                  />
                  <p className="mt-2 text-xs text-foreground/60">
                    Client will need this PIN to access the delivery portal
                  </p>
                </div>
              )}
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
                value={formData.expiresAt}
                onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                className="h-12 text-base"
              />
              <p className="mt-2 text-xs text-foreground/60">
                Files expire on this date. Clients can subscribe for extended storage.
              </p>
            </div>
          </CardContent>
        </Card>

            {/* Submit */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Button 
                type="submit" 
                disabled={isSaving}
                className="w-full sm:flex-1 font-black uppercase tracking-wider hover:bg-accent/90 transition-colors"
                style={{ backgroundColor: '#FFA617', fontWeight: '900' }}
              >
                <Package className="mr-2 h-4 w-4" />
                {isSaving ? "Saving..." : "Save Changes"}
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
          </form>
        </TabsContent>

        <TabsContent value="assets" className="space-y-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-foreground mb-4" style={{ fontWeight: '900', letterSpacing: '-0.02em' }}>
              Assets
            </h2>
            <p className="text-foreground/70 text-base sm:text-lg mb-8">
              Upload and manage assets for this delivery
            </p>
          </div>

          {/* Asset Uploader */}
          <Card className="border border-foreground/20">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl font-black uppercase tracking-wider" style={{ fontWeight: '900' }}>
                Upload Assets
              </CardTitle>
              <CardDescription className="text-base">
                Upload images, videos, or PDFs for this delivery
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AssetUploader 
                deliveryId={deliveryId as Id<"deliveries">}
                uploadType="delivery"
                onUploadComplete={handleUploadComplete}
              />
            </CardContent>
          </Card>

          {/* Asset List */}
          {assets && assets.length > 0 && (
            <Card className="border border-foreground/20">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl font-black uppercase tracking-wider" style={{ fontWeight: '900' }}>
                  Assets ({assets.length})
                </CardTitle>
                <CardDescription className="text-base">
                  Manage uploaded assets for this delivery
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {assets.map((asset, index) => (
                    <div key={asset._id} className="relative group">
                      <div className="aspect-square rounded-lg border-2 border-foreground/20 overflow-hidden">
                        <AssetThumbnail
                          asset={asset}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="mt-2 space-y-1">
                        <p className="text-xs font-medium truncate">{asset.filename}</p>
                        <div className="flex items-center gap-2">
                          {index > 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={async () => {
                                const newOrder = [...assets];
                                [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
                                try {
                                  await reorderAssets({
                                    assetIds: newOrder.map(a => a._id),
                                    email: adminEmail || undefined,
                                  });
                                  router.refresh();
                                } catch (error: any) {
                                  toast({
                                    title: "Error",
                                    description: error.message || "Failed to reorder.",
                                    variant: "destructive",
                                  });
                                }
                              }}
                              className="text-xs h-6 px-2"
                            >
                              <ChevronUp className="h-3 w-3" />
                            </Button>
                          )}
                          {index < assets.length - 1 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={async () => {
                                const newOrder = [...assets];
                                [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
                                try {
                                  await reorderAssets({
                                    assetIds: newOrder.map(a => a._id),
                                    email: adminEmail || undefined,
                                  });
                                  router.refresh();
                                } catch (error: any) {
                                  toast({
                                    title: "Error",
                                    description: error.message || "Failed to reorder.",
                                    variant: "destructive",
                                  });
                                }
                              }}
                              className="text-xs h-6 px-2"
                            >
                              <ChevronDown className="h-3 w-3" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={async () => {
                              try {
                                await deleteAsset({
                                  id: asset._id,
                                  email: adminEmail || undefined,
                                });
                                toast({
                                  title: "Asset deleted",
                                  description: "Asset has been removed.",
                                });
                                router.refresh();
                              } catch (error: any) {
                                toast({
                                  title: "Error",
                                  description: error.message || "Failed to delete asset.",
                                  variant: "destructive",
                                });
                              }
                            }}
                            className="text-xs h-6 px-2 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {(!assets || assets.length === 0) && (
            <Card className="border border-foreground/20">
              <CardContent className="py-16 text-center">
                <Upload className="mx-auto h-16 w-16 text-foreground/40 mb-6" />
                <p className="mb-4 text-xl font-black uppercase tracking-wider text-foreground" style={{ fontWeight: '900' }}>
                  No assets yet
                </p>
                <p className="text-sm text-foreground/70">
                  Upload assets using the uploader above
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

