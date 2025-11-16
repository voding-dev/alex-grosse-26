"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Trash2 } from "lucide-react";
import Link from "next/link";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function BlogTagsPage() {
  const { adminEmail } = useAdminAuth();
  const { toast } = useToast();

  const tags = useQuery(api.blogTags.list) || [];
  const removeTag = useMutation(api.blogTags.remove);
  const removeUnusedTags = useMutation(api.blogTags.removeUnused);
  const updateUseCounts = useMutation(api.blogTags.updateUseCounts);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [selectedTag, setSelectedTag] = useState<any>(null);
  const [updating, setUpdating] = useState(false);

  const handleDelete = async () => {
    if (!selectedTag) return;

    try {
      await removeTag({
        id: selectedTag._id,
        email: adminEmail || undefined,
      });

      toast({
        title: "Tag deleted",
        description: "Tag has been deleted successfully.",
      });

      setDeleteDialogOpen(false);
      setSelectedTag(null);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete tag",
        variant: "destructive",
      });
    }
  };

  const handleBulkDelete = async () => {
    try {
      const count = await removeUnusedTags({
        email: adminEmail || undefined,
      });

      toast({
        title: "Tags deleted",
        description: `${count} unused tag(s) have been deleted.`,
      });

      setBulkDeleteDialogOpen(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete unused tags",
        variant: "destructive",
      });
    }
  };

  const handleUpdateCounts = async () => {
    try {
      setUpdating(true);
      await updateUseCounts({
        email: adminEmail || undefined,
      });

      toast({
        title: "Counts updated",
        description: "Tag use counts have been updated.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update counts",
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  const sortedTags = [...tags].sort((a, b) => (b.useCount || 0) - (a.useCount || 0));
  const unusedTags = tags.filter((tag) => (tag.useCount || 0) === 0);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 sm:py-12">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <Link href="/admin/blog">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight" style={{ fontWeight: '900' }}>
              Blog Tags
            </h1>
            <p className="text-foreground/70 text-base mt-1">
              Manage tags for your blog posts
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleUpdateCounts}
              disabled={updating}
              className="font-bold uppercase tracking-wider"
            >
              {updating ? "Updating..." : "Update Counts"}
            </Button>
            {unusedTags.length > 0 && (
              <Button
                variant="destructive"
                onClick={() => setBulkDeleteDialogOpen(true)}
                className="font-bold uppercase tracking-wider"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Unused ({unusedTags.length})
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Info Card */}
      <Card className="border border-accent/30 bg-accent/5 mb-6">
        <CardContent className="p-6">
          <p className="text-sm text-foreground/80">
            <strong className="font-black uppercase tracking-wider" style={{ fontWeight: '900' }}>Note:</strong> Tags are automatically created when you add them to blog posts. The use count shows how many posts currently use each tag.
          </p>
        </CardContent>
      </Card>

      {/* Tags List */}
      <div className="space-y-4">
        {sortedTags.length === 0 ? (
          <Card className="border border-foreground/10">
            <CardContent className="p-12 text-center">
              <p className="text-foreground/60">No tags yet. Tags will appear here when you add them to blog posts.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {sortedTags.map((tag) => (
              <Card key={tag._id} className={`border ${(tag.useCount || 0) === 0 ? 'border-foreground/10 opacity-60' : 'border-foreground/20'} hover:border-accent/50 transition-colors`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className="bg-accent/20 text-foreground border border-accent/30 font-bold uppercase tracking-wider">
                          {tag.name}
                        </Badge>
                      </div>
                      <p className="text-xs text-foreground/60">
                        /{tag.slug}
                      </p>
                      <p className="text-xs text-foreground/60 mt-1">
                        Used in {tag.useCount || 0} post{(tag.useCount || 0) !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setSelectedTag(tag);
                        setDeleteDialogOpen(true);
                      }}
                      className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black uppercase tracking-wider text-destructive" style={{ fontWeight: '900' }}>
              Delete Tag
            </DialogTitle>
            <DialogDescription className="text-base pt-2">
              Are you sure you want to delete the tag "{selectedTag?.name}"? This will remove it from all posts that use it.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setSelectedTag(null);
              }}
              className="font-bold uppercase tracking-wider"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              className="font-black uppercase tracking-wider"
              style={{ fontWeight: '900' }}
            >
              Delete Tag
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Dialog */}
      <Dialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black uppercase tracking-wider text-destructive" style={{ fontWeight: '900' }}>
              Delete Unused Tags
            </DialogTitle>
            <DialogDescription className="text-base pt-2">
              Are you sure you want to delete all {unusedTags.length} unused tag(s)? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="max-h-40 overflow-y-auto space-y-1">
              {unusedTags.map((tag) => (
                <Badge key={tag._id} variant="outline" className="mr-1 mb-1">
                  {tag.name}
                </Badge>
              ))}
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setBulkDeleteDialogOpen(false)}
              className="font-bold uppercase tracking-wider"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleBulkDelete}
              className="font-black uppercase tracking-wider"
              style={{ fontWeight: '900' }}
            >
              Delete All Unused
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


