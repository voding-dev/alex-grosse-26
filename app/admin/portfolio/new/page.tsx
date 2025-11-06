"use client";

import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";
import Link from "next/link";
import { Image, Plus, ArrowLeft } from "lucide-react";
import { useAdminAuth } from "@/hooks/useAdminAuth";

export default function NewPortfolioPage() {
  const router = useRouter();
  const { toast } = useToast();
  const createPortfolio = useMutation(api.portfolio.create);
  const { adminEmail } = useAdminAuth();

  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    clientName: "",
    categories: [] as ("photo" | "video" | "design" | "mixed")[],
    status: "draft" as "draft" | "review" | "approved" | "delivered" | "archived",
    notesPublic: "",
    notesPrivate: "",
  });

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

    try {
      const portfolioId = await createPortfolio({
        ...formData,
        email: adminEmail || undefined,
      });

      toast({
        title: "Portfolio item created!",
        description: "You can now add assets and edit this portfolio item.",
      });

      router.push(`/admin/portfolio/${portfolioId}`);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create portfolio item.",
        variant: "destructive",
      });
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

  // Auto-generate slug from title
  const handleTitleChange = (title: string) => {
    setFormData({
      ...formData,
      title,
      slug: title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, ""),
    });
  };

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8 sm:py-12">
      <div className="mb-8 sm:mb-12">
        <Link href="/admin/website-editor" className="text-sm text-accent hover:text-accent/80 font-bold uppercase tracking-wider inline-flex items-center gap-1 group mb-4">
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
          Back to Website Editor
        </Link>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight text-foreground mb-4" style={{ fontWeight: '900', letterSpacing: '-0.02em' }}>
          Create Portfolio Item
        </h1>
        <p className="text-foreground/70 text-base sm:text-lg">
          Create a new portfolio item for your public website (Portfolio section)
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Info Banner */}
        <Card className="border border-accent/30 bg-accent/5">
          <CardContent className="p-4 sm:p-6">
            <p className="text-sm text-foreground/80 leading-relaxed">
              <strong className="text-foreground font-black uppercase tracking-wider" style={{ fontWeight: '900' }}>Portfolio Items</strong> appear in the Portfolio section on your public homepage. These are curated pieces for public display - separate from client delivery portals.
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
                onChange={(e) => handleTitleChange(e.target.value)}
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
              <p className="mt-2 text-xs text-foreground/60">
                Used in the URL: /portfolio/{formData.slug || "..."}
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
              Set the initial status for this portfolio item
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
              Only "approved" or "delivered" items appear on the public website
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
            className="w-full sm:flex-1 font-black uppercase tracking-wider hover:bg-accent/90 transition-colors"
            style={{ backgroundColor: '#FFA617', fontWeight: '900' }}
          >
            <Image className="mr-2 h-4 w-4" />
            Create Portfolio Item
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
    </div>
  );
}








