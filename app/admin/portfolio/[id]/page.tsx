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
import { Image, ArrowLeft, Save, Upload, Trash2, ChevronUp, ChevronDown, ImageIcon, Video, FileText } from "lucide-react";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { Id } from "@/convex/_generated/dataModel";
import { AssetUploader } from "@/components/asset-uploader";
import { AssetThumbnail } from "@/components/asset-thumbnail";

export default function EditPortfolioPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const portfolioId = params.id as string;
  const updatePortfolio = useMutation(api.portfolio.update);
  const { adminEmail } = useAdminAuth();

  const portfolio = useQuery(api.portfolio.get, { id: portfolioId as Id<"portfolio"> });
  const assets = useQuery(api.assets.listPortfolio, portfolio ? { portfolioId: portfolio._id } : "skip");
  const deleteAsset = useMutation(api.assets.remove);
  const reorderAssets = useMutation(api.assets.reorder);
  const updatePortfolioCover = useMutation(api.portfolio.update);

  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    clientName: "",
    categories: [] as ("photo" | "video" | "design" | "mixed")[],
    status: "draft" as "draft" | "review" | "approved" | "delivered" | "archived",
    notesPublic: "",
    notesPrivate: "",
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (portfolio) {
      setFormData({
        title: portfolio.title || "",
        slug: portfolio.slug || "",
        clientName: portfolio.clientName || "",
        categories: portfolio.categories || [],
        status: portfolio.status || "draft",
        notesPublic: portfolio.notesPublic || "",
        notesPrivate: portfolio.notesPrivate || "",
      });
      setIsLoading(false);
    }
  }, [portfolio]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title || !formData.slug) {
      toast({
        title: "Error",
        description: "Please fill in title and slug.",
        variant: "destructive",
      });
      return;
    }

    if (formData.categories.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one category.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      await updatePortfolio({
        id: portfolioId as Id<"portfolio">,
        ...formData,
        email: adminEmail || undefined,
      });

      toast({
        title: "Portfolio item updated!",
        description: "Changes have been saved successfully.",
      });

      router.refresh();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update portfolio item.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const toggleCategory = (category: "photo" | "video" | "design" | "mixed") => {
    setFormData({
      ...formData,
      categories: formData.categories.includes(category)
        ? formData.categories.filter((c) => c !== category)
        : [...formData.categories, category],
    });
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8 sm:py-12">
        <div className="text-center py-16">
          <p style={{ color: '#666' }}>Loading portfolio item...</p>
        </div>
      </div>
    );
  }

  if (!portfolio) {
    return (
      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8 sm:py-12">
        <div className="text-center py-16">
          <p className="mb-4" style={{ color: '#666' }}>Portfolio item not found</p>
          <Link href="/admin/website-editor">
            <Button variant="outline">Back to Website Editor</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8 sm:py-12">
      <div className="mb-8 sm:mb-12">
        <Link href="/admin/website-editor" className="text-sm text-accent hover:text-accent/80 font-bold uppercase tracking-wider inline-flex items-center gap-1 group mb-4">
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
          Back to Website Editor
        </Link>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight mb-4" style={{ fontWeight: '900', letterSpacing: '-0.02em', color: '#1a1a1a' }}>
          Edit Portfolio Item
        </h1>
        <p className="text-base sm:text-lg" style={{ color: '#666' }}>
          Edit portfolio item details and settings
        </p>
      </div>

      <Tabs defaultValue="details" className="space-y-8">
        <TabsList className="grid w-full grid-cols-2 max-w-md border rounded-lg p-1.5 h-auto items-center gap-1" style={{ backgroundColor: '#fafafa', borderColor: '#e5e5e5' }}>
          <TabsTrigger 
            value="details" 
            className="font-bold uppercase tracking-wider data-[state=active]:bg-accent data-[state=active]:text-background transition-all rounded-md py-2 sm:py-3 px-2 sm:px-4 h-full flex items-center justify-center text-xs sm:text-sm"
            style={{ color: '#666' }}
          >
            Details
          </TabsTrigger>
          <TabsTrigger 
            value="assets" 
            className="font-bold uppercase tracking-wider data-[state=active]:bg-accent data-[state=active]:text-background transition-all rounded-md py-2 sm:py-3 px-2 sm:px-4 h-full flex items-center justify-center text-xs sm:text-sm"
            style={{ color: '#666' }}
          >
            Assets ({assets?.length || 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="details">
          <form onSubmit={handleSubmit} className="space-y-8">
        {/* Info Banner */}
        <Card className="border border-accent/30 bg-accent/5">
          <CardContent className="p-4 sm:p-6">
            <p className="text-sm leading-relaxed" style={{ color: '#555' }}>
              <strong className="font-black uppercase tracking-wider" style={{ fontWeight: '900', color: '#1a1a1a' }}>Portfolio Items</strong> appear in the Portfolio section on your public homepage. These are curated pieces for public display - separate from client delivery portals. Portfolio items must have design, photo, or video categories to appear in the Portfolio section.
            </p>
          </CardContent>
        </Card>

        {/* Basic Information */}
        <Card className="border" style={{ borderColor: '#e5e5e5', backgroundColor: '#fff' }}>
          <CardHeader className="pb-4">
            <CardTitle className="text-2xl font-black uppercase tracking-wider" style={{ fontWeight: '900' }}>
              Basic Information
            </CardTitle>
            <CardDescription className="text-base">
              Required information for the portfolio item
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label htmlFor="title" className="text-sm font-black uppercase tracking-wider mb-3 block" style={{ fontWeight: '900' }}>
                Title *
              </Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Brand Campaign Photography"
                required
                className="h-12 text-base"
              />
            </div>

            <div>
              <Label htmlFor="slug" className="text-sm font-black uppercase tracking-wider mb-3 block" style={{ fontWeight: '900' }}>
                URL Slug *
              </Label>
              <Input
                id="slug"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                placeholder="brand-campaign-photography"
                required
                className="h-12 text-base"
              />
              <p className="mt-2 text-xs" style={{ color: '#888' }}>
                Used in the URL: /portfolio/{formData.slug || "..."}
              </p>
            </div>

            <div>
              <Label htmlFor="clientName" className="text-sm font-black uppercase tracking-wider mb-3 block" style={{ fontWeight: '900' }}>
                Client Name
              </Label>
              <Input
                id="clientName"
                value={formData.clientName}
                onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                placeholder="Client Name"
                className="h-12 text-base"
              />
            </div>
          </CardContent>
        </Card>

        {/* Categories */}
        <Card className="border" style={{ borderColor: '#e5e5e5', backgroundColor: '#fff' }}>
          <CardHeader className="pb-4">
            <CardTitle className="text-2xl font-black uppercase tracking-wider" style={{ fontWeight: '900' }}>
              Categories *
            </CardTitle>
            <CardDescription className="text-base">
              Select at least one category. Portfolio items must have design, photo, or video to appear in the Portfolio section.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {(["photo", "video", "design", "mixed"] as const).map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => toggleCategory(category)}
                  className={`p-4 rounded-lg border-2 transition-all font-bold uppercase tracking-wider ${
                    formData.categories.includes(category)
                      ? "border-accent bg-accent/10 text-accent"
                      : "hover:border-accent/50"
                  }`}
                  style={formData.categories.includes(category) ? {} : { borderColor: '#e5e5e5', backgroundColor: '#fff', color: '#1a1a1a' }}
                >
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Status */}
        <Card className="border" style={{ borderColor: '#e5e5e5', backgroundColor: '#fff' }}>
          <CardHeader className="pb-4">
            <CardTitle className="text-2xl font-black uppercase tracking-wider" style={{ fontWeight: '900' }}>
              Status
            </CardTitle>
            <CardDescription className="text-base">
              Set the status for this portfolio item
            </CardDescription>
          </CardHeader>
          <CardContent>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
              className="flex h-12 w-full rounded-md border px-3 py-2 text-base"
              style={{ borderColor: '#e5e5e5', backgroundColor: '#fff', color: '#1a1a1a' }}
            >
              <option value="draft">Draft</option>
              <option value="review">Review</option>
              <option value="approved">Approved</option>
              <option value="delivered">Delivered</option>
              <option value="archived">Archived</option>
            </select>
            <p className="mt-2 text-xs" style={{ color: '#888' }}>
              Only "approved" or "delivered" items appear on the public website
            </p>
          </CardContent>
        </Card>

        {/* Notes */}
        <Card className="border" style={{ borderColor: '#e5e5e5', backgroundColor: '#fff' }}>
          <CardHeader className="pb-4">
            <CardTitle className="text-2xl font-black uppercase tracking-wider" style={{ fontWeight: '900' }}>
              Notes
            </CardTitle>
            <CardDescription className="text-base">
              Optional notes for this portfolio item
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label htmlFor="notesPublic" className="text-sm font-black uppercase tracking-wider mb-3 block" style={{ fontWeight: '900' }}>
                Public Notes
              </Label>
              <Textarea
                id="notesPublic"
                value={formData.notesPublic}
                onChange={(e) => setFormData({ ...formData, notesPublic: e.target.value })}
                placeholder="Notes visible to the public"
                rows={4}
                className="text-base"
              />
            </div>

            <div>
              <Label htmlFor="notesPrivate" className="text-sm font-black uppercase tracking-wider mb-3 block" style={{ fontWeight: '900' }}>
                Private Notes
              </Label>
              <Textarea
                id="notesPrivate"
                value={formData.notesPrivate}
                onChange={(e) => setFormData({ ...formData, notesPrivate: e.target.value })}
                placeholder="Private notes (admin only)"
                rows={4}
                className="text-base"
              />
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Button 
            type="submit" 
            disabled={isSaving}
            className="w-full sm:flex-1 font-black uppercase tracking-wider hover:bg-accent/90 transition-colors"
            style={{ backgroundColor: '#586034', fontWeight: '900' }}
          >
            {isSaving ? (
              <>
                <Save className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
          <Link href="/admin/website-editor" className="w-full sm:w-auto">
            <Button 
              type="button" 
              variant="outline"
              className="w-full sm:w-auto font-bold uppercase tracking-wider transition-colors"
              style={{ borderColor: '#e5e5e5' }}
            >
              Cancel
            </Button>
          </Link>
        </div>
      </form>
        </TabsContent>

        <TabsContent value="assets" className="space-y-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight mb-4" style={{ fontWeight: '900', letterSpacing: '-0.02em', color: '#1a1a1a' }}>
              Assets
            </h2>
            <p className="text-base sm:text-lg mb-8" style={{ color: '#666' }}>
              Upload and manage assets for this portfolio item
            </p>
          </div>

          {/* Asset Uploader */}
          <Card className="border" style={{ borderColor: '#e5e5e5', backgroundColor: '#fff' }}>
            <CardHeader className="pb-4">
              <CardTitle className="text-2xl font-black uppercase tracking-wider" style={{ fontWeight: '900' }}>
                Upload Assets
              </CardTitle>
              <CardDescription className="text-base">
                Upload images, videos, or PDFs for this portfolio item
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AssetUploader 
                portfolioId={portfolio._id}
                uploadType="portfolio"
                onUploadComplete={() => router.refresh()}
              />
            </CardContent>
          </Card>

          {/* Asset List */}
          {assets && assets.length > 0 && (
            <Card className="border" style={{ borderColor: '#e5e5e5', backgroundColor: '#fff' }}>
              <CardHeader className="pb-4">
                <CardTitle className="text-2xl font-black uppercase tracking-wider" style={{ fontWeight: '900' }}>
                  Assets ({assets.length})
                </CardTitle>
                <CardDescription className="text-base">
                  Manage uploaded assets. First image will be used as cover.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {assets.map((asset, index) => {
                    const isCover = portfolio.coverAssetId === asset._id;

                    return (
                      <div key={asset._id} className="relative group">
                        <div className={`aspect-square rounded-lg border-2 overflow-hidden ${isCover ? "border-accent" : ""}`} style={!isCover ? { borderColor: '#e5e5e5' } : {}}>
                          <AssetThumbnail
                            asset={asset}
                            className="w-full h-full object-cover"
                          />
                          {isCover && (
                            <div className="absolute top-2 left-2 bg-accent text-background px-2 py-1 rounded text-xs font-bold uppercase">
                              Cover
                            </div>
                          )}
                        </div>
                        <div className="mt-2 space-y-1">
                          <p className="text-xs font-medium truncate">{asset.filename}</p>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={async () => {
                                try {
                                  await updatePortfolioCover({
                                    id: portfolio._id,
                                    coverAssetId: asset._id,
                                    email: adminEmail || undefined,
                                  });
                                  toast({
                                    title: "Cover updated",
                                    description: "Cover image has been set.",
                                  });
                                  router.refresh();
                                } catch (error: any) {
                                  toast({
                                    title: "Error",
                                    description: error.message || "Failed to set cover.",
                                    variant: "destructive",
                                  });
                                }
                              }}
                              className="text-xs h-6 px-2"
                              disabled={isCover}
                            >
                              {isCover ? "Cover" : "Set Cover"}
                            </Button>
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
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {(!assets || assets.length === 0) && (
            <Card className="border" style={{ borderColor: '#e5e5e5', backgroundColor: '#fff' }}>
              <CardContent className="py-16 text-center">
                <Upload className="mx-auto h-16 w-16 mb-6" style={{ color: '#ccc' }} />
                <p className="mb-4 text-xl font-black uppercase tracking-wider" style={{ fontWeight: '900', color: '#1a1a1a' }}>
                  No assets yet
                </p>
                <p className="text-sm" style={{ color: '#666' }}>
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

