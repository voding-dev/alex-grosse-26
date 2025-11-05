"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { Plus, Eye, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

export default function PageBuilderPage() {
  const { adminEmail } = useAdminAuth();
  const router = useRouter();
  const { toast } = useToast();
  
  // Landing Pages
  const landingPages = useQuery(api.landingPages.list) || [];
  const createLandingPage = useMutation(api.landingPages.create);
  const deleteLandingPage = useMutation(api.landingPages.remove);
  
  // Special pages (Portraits and Design) - these use existing editor pages
  const specialPages = [
    { id: "portraits", title: "Portraits", slug: "portraits", editorPath: "/admin/portraits", isSpecial: true },
    { id: "design", title: "Design", slug: "design", editorPath: "/admin/design", isSpecial: true },
  ];
  
  // Combine special pages with custom landing pages
  const allPages = [
    ...specialPages,
    ...landingPages.map(page => ({ 
      id: page._id, 
      title: page.title, 
      slug: page.slug, 
      editorPath: `/admin/landing-pages/${page._id}`,
      isSpecial: false 
    }))
  ];
  
  // Delete functions for special pages
  const deletePortraits = useMutation(api.portraits.deleteAll);
  const deleteDesign = useMutation(api.design.deleteAll);
  
  // Page Builder state
  const [createPageDialogOpen, setCreatePageDialogOpen] = useState(false);
  const [newPageTitle, setNewPageTitle] = useState("");
  const [newPageSlug, setNewPageSlug] = useState("");
  const [deletePageDialogOpen, setDeletePageDialogOpen] = useState(false);
  const [pageToDelete, setPageToDelete] = useState<{ id: string; title: string; isSpecial?: boolean } | null>(null);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 sm:py-12">
      <div className="mb-8 sm:mb-12">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight text-foreground mb-4" style={{ fontWeight: '900', letterSpacing: '-0.02em' }}>
              Page Builder
            </h1>
            <p className="text-foreground/70 text-base sm:text-lg">
              Create and manage independent landing pages like "Design" and "Portraits". Each page has its own hero carousel, gallery, and content.
            </p>
          </div>
          <Button 
            onClick={() => setCreatePageDialogOpen(true)}
            className="w-full sm:w-auto font-black uppercase tracking-wider hover:bg-accent/90 transition-colors" 
            style={{ backgroundColor: '#FFA617', fontWeight: '900' }}
          >
            <Plus className="mr-2 h-4 w-4" />
            New Landing Page
          </Button>
        </div>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {allPages.map((page) => (
          <Card key={page.id} className="group transition-all hover:bg-foreground/10 border border-foreground/20 hover:border-accent/50 hover:shadow-lg relative">
            <div className="cursor-pointer" onClick={() => router.push(page.editorPath)}>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-black uppercase tracking-wider mb-2" style={{ fontWeight: '900' }}>
                  {page.title}
                </CardTitle>
                <CardDescription className="text-base text-foreground/70">
                  /{page.slug}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-xs text-accent font-bold uppercase tracking-wider flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    View at /{page.slug}
                  </span>
                </div>
              </CardContent>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setPageToDelete({ id: page.id, title: page.title, isSpecial: page.isSpecial });
                setDeletePageDialogOpen(true);
              }}
              className="absolute bottom-4 right-4 z-10 text-foreground/40 hover:text-destructive hover:bg-destructive/10 rounded-full h-8 w-8"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </Card>
        ))}
      </div>

      {/* Create Page Dialog */}
      <Dialog open={createPageDialogOpen} onOpenChange={setCreatePageDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black uppercase tracking-wider" style={{ fontWeight: '900' }}>
              Create New Landing Page
            </DialogTitle>
            <DialogDescription className="text-base pt-2">
              Create a new landing page. This will be accessible at /[slug] and appear in the Website Editor dropdown.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="pageTitle" className="text-sm font-black uppercase tracking-wider mb-3 block" style={{ fontWeight: '900' }}>
                Page Title
              </Label>
              <Input
                id="pageTitle"
                value={newPageTitle}
                onChange={(e) => setNewPageTitle(e.target.value)}
                placeholder="e.g., Video Services"
                className="h-12 text-base"
              />
              <p className="mt-2 text-xs text-foreground/60">
                Display name for the page (shown in admin dropdown).
              </p>
            </div>
            <div>
              <Label htmlFor="pageSlug" className="text-sm font-black uppercase tracking-wider mb-3 block" style={{ fontWeight: '900' }}>
                URL Slug
              </Label>
              <Input
                id="pageSlug"
                value={newPageSlug}
                onChange={(e) => {
                  const slug = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
                  setNewPageSlug(slug);
                }}
                placeholder="e.g., video-services"
                className="h-12 text-base"
              />
              <p className="mt-2 text-xs text-foreground/60">
                URL-friendly identifier. Page will be accessible at /[slug]. Only lowercase letters, numbers, and hyphens allowed.
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setCreatePageDialogOpen(false);
                setNewPageTitle("");
                setNewPageSlug("");
              }}
              className="font-bold uppercase tracking-wider"
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!newPageTitle.trim() || !newPageSlug.trim()) {
                  toast({
                    title: "Error",
                    description: "Please provide both a title and slug.",
                    variant: "destructive",
                  });
                  return;
                }
                try {
                  const pageId = await createLandingPage({
                    title: newPageTitle.trim(),
                    slug: newPageSlug.trim(),
                    email: adminEmail || undefined,
                  });
                  toast({
                    title: "Page created",
                    description: "Landing page created successfully.",
                  });
                  setCreatePageDialogOpen(false);
                  setNewPageTitle("");
                  setNewPageSlug("");
                  router.push(`/admin/landing-pages/${pageId}`);
                } catch (error: any) {
                  toast({
                    title: "Error",
                    description: error.message || "Failed to create page.",
                    variant: "destructive",
                  });
                }
              }}
              className="font-black uppercase tracking-wider"
              style={{ backgroundColor: '#FFA617', fontWeight: '900' }}
            >
              Create Page
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Page Dialog */}
      <Dialog open={deletePageDialogOpen} onOpenChange={setDeletePageDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black uppercase tracking-wider text-destructive" style={{ fontWeight: '900' }}>
              ⚠️ PERMANENT DELETION
            </DialogTitle>
            <DialogDescription className="text-base pt-2">
              Are you absolutely sure you want to delete <strong>"{pageToDelete?.title}"</strong>?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="rounded-lg border-2 border-destructive bg-destructive/10 p-4">
              <p className="text-sm font-bold text-destructive uppercase tracking-wider mb-2" style={{ fontWeight: '900' }}>
                ⚠️ WARNING: THIS ACTION IS PERMANENT
              </p>
              <p className="text-sm text-foreground/80 leading-relaxed">
                This will permanently delete the page and <strong>all of its associated assets</strong> (hero carousel images, gallery images). 
                This action cannot be undone.
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setDeletePageDialogOpen(false);
                setPageToDelete(null);
              }}
              className="font-bold uppercase tracking-wider"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (!pageToDelete) return;
                try {
                  if (pageToDelete.isSpecial) {
                    // Delete special page (Portraits or Design)
                    if (pageToDelete.id === "portraits") {
                      await deletePortraits({ email: adminEmail || undefined });
                    } else if (pageToDelete.id === "design") {
                      await deleteDesign({ email: adminEmail || undefined });
                    }
                  } else {
                    // Delete custom landing page
                    await deleteLandingPage({
                      id: pageToDelete.id as any,
                      email: adminEmail || undefined,
                    });
                  }
                  toast({
                    title: "Page deleted",
                    description: `"${pageToDelete.title}" has been permanently deleted.`,
                  });
                  setDeletePageDialogOpen(false);
                  setPageToDelete(null);
                  router.refresh();
                } catch (error: any) {
                  toast({
                    title: "Error",
                    description: error.message || "Failed to delete page.",
                    variant: "destructive",
                  });
                }
              }}
              className="font-black uppercase tracking-wider"
              style={{ fontWeight: '900' }}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

