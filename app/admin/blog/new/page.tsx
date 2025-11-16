"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useToast } from "@/components/ui/use-toast";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ResizableTextarea } from "@/components/ui/resizable-textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Plus } from "lucide-react";
import Link from "next/link";

export default function NewBlogPostPage() {
  const { adminEmail } = useAdminAuth();
  const { toast } = useToast();
  const router = useRouter();

  const createPost = useMutation(api.blogPosts.create);

  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    excerpt: "",
  });

  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!formData.title.trim()) {
      toast({
        title: "Missing title",
        description: "Please enter a title for your blog post.",
        variant: "destructive",
      });
      return;
    }

    // Generate slug from title if empty
    let slug = formData.slug;
    if (!slug && formData.title) {
      slug = formData.title
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
    }

    try {
      setCreating(true);
      const postId = await createPost({
        title: formData.title.trim(),
        slug,
        excerpt: formData.excerpt.trim() || undefined,
        status: "draft",
        email: adminEmail || undefined,
      });

      toast({
        title: "Post created",
        description: "Your blog post has been created successfully.",
      });

      // Navigate to the editor
      router.push(`/admin/blog/${postId}`);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create post",
        variant: "destructive",
      });
      setCreating(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8 sm:py-12">
      {/* Header */}
      <div className="mb-8 flex items-center gap-4">
        <Link href="/admin/blog">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight" style={{ fontWeight: '900' }}>
            New Blog Post
          </h1>
          <p className="text-foreground/70 text-base mt-1">
            Create a new blog post
          </p>
        </div>
      </div>

      <Card className="border border-foreground/20">
        <CardHeader>
          <CardTitle className="text-xl font-black uppercase tracking-wider" style={{ fontWeight: '900' }}>
            Basic Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label htmlFor="title" className="text-sm font-black uppercase tracking-wider mb-2 block" style={{ fontWeight: '900' }}>
              Title *
            </Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Enter post title"
              className="h-12 text-base"
            />
          </div>

          <div>
            <Label htmlFor="slug" className="text-sm font-black uppercase tracking-wider mb-2 block" style={{ fontWeight: '900' }}>
              URL Slug
            </Label>
            <Input
              id="slug"
              value={formData.slug}
              onChange={(e) => {
                const slug = e.target.value
                  .toLowerCase()
                  .replace(/[^a-z0-9-]/g, "-")
                  .replace(/-+/g, "-")
                  .replace(/^-|-$/g, "");
                setFormData({ ...formData, slug });
              }}
              placeholder="Leave empty to auto-generate from title"
              className="h-12 text-base font-mono"
            />
            <p className="mt-2 text-xs text-foreground/60">
              URL: /blog/{formData.slug || formData.title
                .toLowerCase()
                .replace(/[^a-z0-9-]/g, "-")
                .replace(/-+/g, "-")
                .replace(/^-|-$/g, "") || "post-url-slug"}
            </p>
          </div>

          <div>
            <Label htmlFor="excerpt" className="text-sm font-black uppercase tracking-wider mb-2 block" style={{ fontWeight: '900' }}>
              Excerpt (Optional)
            </Label>
            <ResizableTextarea
              id="excerpt"
              value={formData.excerpt}
              onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
              placeholder="Brief description for post listing pages..."
              minRows={3}
              maxRows={8}
            />
            <p className="mt-2 text-xs text-foreground/60">
              {formData.excerpt.length} / 160 characters
            </p>
          </div>

          <Button
            onClick={handleCreate}
            disabled={creating || !formData.title.trim()}
            className="w-full font-black uppercase tracking-wider"
            style={{ backgroundColor: '#FFA617', fontWeight: '900' }}
          >
            {creating ? (
              "Creating..."
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Create Post
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

