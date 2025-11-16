"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ResizableTextarea } from "@/components/ui/resizable-textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Edit2, Trash2, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function BlogCategoriesPage() {
  const { adminEmail } = useAdminAuth();
  const { toast } = useToast();

  const categories = useQuery(api.blogCategories.list) || [];
  const createCategory = useMutation(api.blogCategories.create);
  const updateCategory = useMutation(api.blogCategories.update);
  const deleteCategory = useMutation(api.blogCategories.remove);

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<any>(null);

  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    color: "#FFA617",
  });

  const resetForm = () => {
    setFormData({
      name: "",
      slug: "",
      description: "",
      color: "#FFA617",
    });
  };

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      toast({
        title: "Missing name",
        description: "Please enter a category name.",
        variant: "destructive",
      });
      return;
    }

    // Generate slug from name if empty
    let slug = formData.slug;
    if (!slug && formData.name) {
      slug = formData.name
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
    }

    try {
      await createCategory({
        name: formData.name.trim(),
        slug,
        description: formData.description.trim() || undefined,
        color: formData.color,
        email: adminEmail || undefined,
      });

      toast({
        title: "Category created",
        description: "Category has been created successfully.",
      });

      setCreateDialogOpen(false);
      resetForm();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create category",
        variant: "destructive",
      });
    }
  };

  const handleEdit = async () => {
    if (!selectedCategory || !formData.name.trim()) {
      return;
    }

    try {
      await updateCategory({
        id: selectedCategory._id,
        name: formData.name.trim(),
        slug: formData.slug.trim(),
        description: formData.description.trim() || undefined,
        color: formData.color,
        email: adminEmail || undefined,
      });

      toast({
        title: "Category updated",
        description: "Category has been updated successfully.",
      });

      setEditDialogOpen(false);
      setSelectedCategory(null);
      resetForm();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update category",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!selectedCategory) return;

    try {
      await deleteCategory({
        id: selectedCategory._id,
        email: adminEmail || undefined,
      });

      toast({
        title: "Category deleted",
        description: "Category has been deleted successfully.",
      });

      setDeleteDialogOpen(false);
      setSelectedCategory(null);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete category",
        variant: "destructive",
      });
    }
  };

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
              Blog Categories
            </h1>
            <p className="text-foreground/70 text-base mt-1">
              Organize your blog posts with categories
            </p>
          </div>
          <Button
            onClick={() => {
              resetForm();
              setCreateDialogOpen(true);
            }}
            className="font-black uppercase tracking-wider"
            style={{ backgroundColor: '#FFA617', fontWeight: '900' }}
          >
            <Plus className="mr-2 h-4 w-4" />
            New Category
          </Button>
        </div>
      </div>

      {/* Categories Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {categories.map((category) => (
          <Card key={category._id} className="border border-foreground/20 hover:border-accent/50 transition-colors">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: category.color || "#FFA617" }}
                />
                <CardTitle className="text-lg font-black uppercase tracking-wider flex-1" style={{ fontWeight: '900' }}>
                  {category.name}
                </CardTitle>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setSelectedCategory(category);
                      setFormData({
                        name: category.name,
                        slug: category.slug,
                        description: category.description || "",
                        color: category.color || "#FFA617",
                      });
                      setEditDialogOpen(true);
                    }}
                    className="h-8 w-8"
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setSelectedCategory(category);
                      setDeleteDialogOpen(true);
                    }}
                    className="h-8 w-8 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-foreground/60 mb-2">/{category.slug}</p>
              {category.description && (
                <p className="text-sm text-foreground/70 line-clamp-2">{category.description}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {categories.length === 0 && (
        <Card className="border border-foreground/10">
          <CardContent className="p-12 text-center">
            <p className="text-foreground/60 mb-4">No categories yet.</p>
            <Button
              onClick={() => {
                resetForm();
                setCreateDialogOpen(true);
              }}
              className="font-black uppercase tracking-wider"
              style={{ backgroundColor: '#FFA617', fontWeight: '900' }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Your First Category
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black uppercase tracking-wider" style={{ fontWeight: '900' }}>
              Create Category
            </DialogTitle>
            <DialogDescription className="text-base pt-2">
              Add a new category to organize your blog posts.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="create-name" className="text-sm font-black uppercase tracking-wider mb-2 block" style={{ fontWeight: '900' }}>
                Name *
              </Label>
              <Input
                id="create-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Tutorials"
                className="h-12"
              />
            </div>

            <div>
              <Label htmlFor="create-slug" className="text-sm font-black uppercase tracking-wider mb-2 block" style={{ fontWeight: '900' }}>
                Slug
              </Label>
              <Input
                id="create-slug"
                value={formData.slug}
                onChange={(e) => {
                  const slug = e.target.value
                    .toLowerCase()
                    .replace(/[^a-z0-9-]/g, "-")
                    .replace(/-+/g, "-")
                    .replace(/^-|-$/g, "");
                  setFormData({ ...formData, slug });
                }}
                placeholder="Leave empty to auto-generate"
                className="h-12 font-mono"
              />
            </div>

            <div>
              <Label htmlFor="create-description" className="text-sm font-black uppercase tracking-wider mb-2 block" style={{ fontWeight: '900' }}>
                Description
              </Label>
              <ResizableTextarea
                id="create-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description..."
                minRows={3}
                maxRows={8}
              />
            </div>

            <div>
              <Label htmlFor="create-color" className="text-sm font-black uppercase tracking-wider mb-2 block" style={{ fontWeight: '900' }}>
                Color
              </Label>
              <div className="flex gap-2">
                <Input
                  id="create-color"
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="h-12 w-20"
                />
                <Input
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  placeholder="#FFA617"
                  className="h-12 flex-1 font-mono"
                />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setCreateDialogOpen(false);
                resetForm();
              }}
              className="font-bold uppercase tracking-wider"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              className="font-black uppercase tracking-wider"
              style={{ backgroundColor: '#FFA617', fontWeight: '900' }}
            >
              Create Category
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black uppercase tracking-wider" style={{ fontWeight: '900' }}>
              Edit Category
            </DialogTitle>
            <DialogDescription className="text-base pt-2">
              Update category information.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="edit-name" className="text-sm font-black uppercase tracking-wider mb-2 block" style={{ fontWeight: '900' }}>
                Name *
              </Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Tutorials"
                className="h-12"
              />
            </div>

            <div>
              <Label htmlFor="edit-slug" className="text-sm font-black uppercase tracking-wider mb-2 block" style={{ fontWeight: '900' }}>
                Slug *
              </Label>
              <Input
                id="edit-slug"
                value={formData.slug}
                onChange={(e) => {
                  const slug = e.target.value
                    .toLowerCase()
                    .replace(/[^a-z0-9-]/g, "-")
                    .replace(/-+/g, "-")
                    .replace(/^-|-$/g, "");
                  setFormData({ ...formData, slug });
                }}
                placeholder="tutorials"
                className="h-12 font-mono"
              />
            </div>

            <div>
              <Label htmlFor="edit-description" className="text-sm font-black uppercase tracking-wider mb-2 block" style={{ fontWeight: '900' }}>
                Description
              </Label>
              <ResizableTextarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description..."
                minRows={3}
                maxRows={8}
              />
            </div>

            <div>
              <Label htmlFor="edit-color" className="text-sm font-black uppercase tracking-wider mb-2 block" style={{ fontWeight: '900' }}>
                Color
              </Label>
              <div className="flex gap-2">
                <Input
                  id="edit-color"
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="h-12 w-20"
                />
                <Input
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  placeholder="#FFA617"
                  className="h-12 flex-1 font-mono"
                />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setEditDialogOpen(false);
                setSelectedCategory(null);
                resetForm();
              }}
              className="font-bold uppercase tracking-wider"
            >
              Cancel
            </Button>
            <Button
              onClick={handleEdit}
              className="font-black uppercase tracking-wider"
              style={{ backgroundColor: '#FFA617', fontWeight: '900' }}
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black uppercase tracking-wider text-destructive" style={{ fontWeight: '900' }}>
              Delete Category
            </DialogTitle>
            <DialogDescription className="text-base pt-2">
              Are you sure you want to delete this category? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setSelectedCategory(null);
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
              Delete Category
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

