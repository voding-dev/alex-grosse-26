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
import { Briefcase, ArrowLeft, Save, Upload, Trash2, ChevronUp, ChevronDown } from "lucide-react";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { Id } from "@/convex/_generated/dataModel";
import { AssetUploader } from "@/components/asset-uploader";
import { AssetThumbnail } from "@/components/asset-thumbnail";

export default function EditProjectPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const projectId = params.id as string;
  const updateProject = useMutation(api.projects.update);
  const { adminEmail } = useAdminAuth();

  const project = useQuery(api.projects.get, { id: projectId as Id<"projects"> });
  const assets = useQuery(api.assets.listProject, project ? { projectId: project._id } : "skip");
  const deleteAsset = useMutation(api.assets.remove);
  const reorderAssets = useMutation(api.assets.reorder);
  const updateProjectCover = useMutation(api.projects.update);

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
    if (project) {
      setFormData({
        title: project.title || "",
        slug: project.slug || "",
        clientName: project.clientName || "",
        categories: project.categories || [],
        status: project.status || "draft",
        notesPublic: project.notesPublic || "",
        notesPrivate: project.notesPrivate || "",
      });
      setIsLoading(false);
    }
  }, [project]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title || !formData.slug || !formData.clientName) {
      toast({
        title: "Error",
        description: "Please fill in title, slug, and client name.",
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
      await updateProject({
        id: projectId as Id<"projects">,
        ...formData,
        email: adminEmail || undefined,
      });

      toast({
        title: "Project updated!",
        description: "Changes have been saved successfully.",
      });

      router.refresh();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update project.",
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
          <p className="text-foreground/60">Loading project...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8 sm:py-12">
        <div className="text-center py-16">
          <p className="text-foreground/60 mb-4">Project not found</p>
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
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight text-foreground mb-4" style={{ fontWeight: '900', letterSpacing: '-0.02em' }}>
          Edit Project
        </h1>
        <p className="text-foreground/70 text-base sm:text-lg">
          Edit project details and settings
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
        {/* Info Banner */}
        <Card className="border border-accent/30 bg-accent/5">
          <CardContent className="p-4 sm:p-6">
            <p className="text-sm text-foreground/80 leading-relaxed">
              <strong className="text-foreground font-black uppercase tracking-wider" style={{ fontWeight: '900' }}>Projects</strong> are for client delivery portals (PIN-gated file delivery). These are separate from portfolio items, which are for public website display.
            </p>
          </CardContent>
        </Card>

        {/* Basic Information */}
        <Card className="border border-foreground/20">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-black uppercase tracking-wider" style={{ fontWeight: '900' }}>
              Basic Information
            </CardTitle>
            <CardDescription className="text-base">
              Required information for the project
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
                placeholder="e.g., Client Deliverables - Brand Campaign"
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
                placeholder="client-deliverables-brand-campaign"
                required
                className="h-12 text-base"
              />
              <p className="mt-2 text-xs text-foreground/60">
                Used in the URL: /project/{formData.slug || "..."}
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
          </CardContent>
        </Card>

        {/* Categories */}
        <Card className="border border-foreground/20">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-black uppercase tracking-wider" style={{ fontWeight: '900' }}>
              Categories *
            </CardTitle>
            <CardDescription className="text-base">
              Select at least one category for this project
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
                      : "border-foreground/20 hover:border-accent/50 hover:bg-foreground/5"
                  }`}
                >
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Status */}
        <Card className="border border-foreground/20">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-black uppercase tracking-wider" style={{ fontWeight: '900' }}>
              Status
            </CardTitle>
            <CardDescription className="text-base">
              Set the status for this project
            </CardDescription>
          </CardHeader>
          <CardContent>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
              className="flex h-12 w-full rounded-md border border-foreground/20 bg-background px-3 py-2 text-base"
            >
              <option value="draft">Draft</option>
              <option value="review">Review</option>
              <option value="approved">Approved</option>
              <option value="delivered">Delivered</option>
              <option value="archived">Archived</option>
            </select>
            <p className="mt-2 text-xs text-foreground/60">
              Only "approved" or "delivered" projects appear on the public website
            </p>
          </CardContent>
        </Card>

        {/* Notes */}
        <Card className="border border-foreground/20">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-black uppercase tracking-wider" style={{ fontWeight: '900' }}>
              Notes
            </CardTitle>
            <CardDescription className="text-base">
              Optional notes for this project
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
            style={{ backgroundColor: '#FFA617', fontWeight: '900' }}
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
              Upload and manage assets for this project
            </p>
          </div>

          {/* Asset Uploader */}
          <Card className="border border-foreground/20">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl font-black uppercase tracking-wider" style={{ fontWeight: '900' }}>
                Upload Assets
              </CardTitle>
              <CardDescription className="text-base">
                Upload images, videos, or PDFs for this project
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AssetUploader 
                projectId={project._id}
                uploadType="project"
                onUploadComplete={() => router.refresh()}
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
                  Manage uploaded assets. First image will be used as cover.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {assets.map((asset, index) => {
                    const isCover = project.coverAssetId === asset._id;

                    return (
                      <div key={asset._id} className="relative group">
                        <div className={`aspect-square rounded-lg border-2 overflow-hidden ${isCover ? "border-accent" : "border-foreground/20"}`}>
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
                                  await updateProjectCover({
                                    id: project._id,
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

