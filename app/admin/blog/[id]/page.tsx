"use client";

import React, { useState, useEffect, use } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useToast } from "@/components/ui/use-toast";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ResizableTextarea } from "@/components/ui/resizable-textarea";
import { AdminTabs, TabsContent } from "@/components/admin/admin-tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BlogSectionList } from "@/components/blog/blog-section-list";
import { ArrowLeft, Save, Eye, Upload, X, Image as ImageIcon } from "lucide-react";
import Link from "next/link";
import { CustomDatePicker } from "@/components/ui/custom-date-picker";
import { CustomTimePicker } from "@/components/ui/custom-time-picker";
import { uploadImageToMediaLibrary } from "@/lib/upload-utils";
import { ImageUploadButton, MediaLibrarySelector } from "@/components/media-library";
import { UploadZone } from "@/components/upload-zone";

// Timezone utility functions
function dateTimeToTimestamp(dateStr: string, timeStr: string, timezone: string): number {
  try {
    // Parse the date and time components
    const [year, month, day] = dateStr.split('-').map(Number);
    const [hour, minute] = timeStr.split(':').map(Number);
    
    // Strategy: Create a date with these components in UTC, then figure out what offset
    // we need to apply to make it represent the same wall-clock time in the target timezone
    
    // Step 1: Create a UTC timestamp with these components
    const utcTimestamp = Date.UTC(year, month - 1, day, hour, minute, 0);
    
    // Step 2: See what this UTC time looks like in the target timezone
    const utcDate = new Date(utcTimestamp);
    const tzString = utcDate.toLocaleString('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    
    // Step 3: Parse what we got back
    const match = tzString.match(/(\d+)\/(\d+)\/(\d+), (\d+):(\d+):(\d+)/);
    if (!match) {
      throw new Error(`Failed to parse timezone string: ${tzString}`);
    }
    
    const [_, tzMonth, tzDay, tzYear, tzHour, tzMinute, tzSecond] = match.map(Number);
    
    // Step 4: Calculate the difference
    // If we want "14:30" in EST but UTC shows "19:30", we need to subtract 5 hours
    const wantedTime = hour * 60 + minute;
    const actualTime = tzHour * 60 + tzMinute;
    const daysDiff = (day - tzDay) + (month - tzMonth) * 31 + (year - tzYear) * 365;
    const minutesDiff = wantedTime - actualTime + (daysDiff * 24 * 60);
    
    // Step 5: Apply the correction
    const correctedTimestamp = utcTimestamp + (minutesDiff * 60 * 1000);
    
    return correctedTimestamp;
  } catch (error) {
    console.error('Error converting datetime to timestamp:', error);
    // Fallback to treating as local time
    return new Date(`${dateStr}T${timeStr}:00`).getTime();
  }
}

function timestampToDateTime(timestamp: number, timezone: string): { date: string; time: string } {
  try {
    const date = new Date(timestamp);
    
    // Format in target timezone
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    
    const parts = formatter.formatToParts(date);
    const year = parts.find(p => p.type === 'year')?.value;
    const month = parts.find(p => p.type === 'month')?.value;
    const day = parts.find(p => p.type === 'day')?.value;
    const hour = parts.find(p => p.type === 'hour')?.value;
    const minute = parts.find(p => p.type === 'minute')?.value;
    
    return {
      date: `${year}-${month}-${day}`,
      time: `${hour}:${minute}`
    };
  } catch (error) {
    console.error('Error converting timestamp to datetime:', error);
    // Fallback
    const date = new Date(timestamp);
    return {
      date: date.toISOString().split('T')[0],
      time: date.toTimeString().slice(0, 5)
    };
  }
}

export default function BlogPostEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { adminEmail, sessionToken } = useAdminAuth();
  const { toast } = useToast();
  const router = useRouter();

  const post = useQuery(api.blogPosts.get, { id: id as Id<"blogPosts"> });
  const sections = useQuery(api.blogPostSections.listByPost, post ? { blogPostId: post._id } : "skip") || [];
  const categories = useQuery(api.blogCategories.list) || [];
  const allTags = useQuery(api.blogTags.list) || [];
  const settings = useQuery(api.settings.getAll) || {};
  const siteTimezone = (settings?.siteTimezone as string) || "America/New_York";

  const updatePost = useMutation(api.blogPosts.update);
  const generateUploadUrl = useMutation(api.storageMutations.generateUploadUrl);
  const checkDuplicateMutation = useMutation(api.mediaLibrary.checkDuplicateMutation);
  const createMedia = useMutation(api.mediaLibrary.create);
  const addDisplayLocation = useMutation(api.mediaLibrary.addDisplayLocation);

  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    excerpt: "",
    status: "draft" as "draft" | "published" | "scheduled" | "archived",
    scheduledFor: null as number | null,
    scheduledDate: "", // yyyy-mm-dd format string
    scheduledTime: "", // HH:mm format string
    publishedAt: null as number | null,
    publishedDate: "", // yyyy-mm-dd format string
    publishedTime: "", // HH:mm format string
    useCustomPublishDate: false,
    featured: false,
    showCoverOnPost: true,
    authorName: "",
    categoryIds: [] as string[],
    tags: [] as string[],
    seoTitle: "",
    seoDescription: "",
  });

  const [uploading, setUploading] = useState(false);
  const [uploadingOg, setUploadingOg] = useState(false);
  const [newTag, setNewTag] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeTab, setActiveTab] = useState("content");
  const [coverLibraryOpen, setCoverLibraryOpen] = useState(false);
  const [ogLibraryOpen, setOgLibraryOpen] = useState(false);
  const [isDraggingCover, setIsDraggingCover] = useState(false);
  const [isDraggingOg, setIsDraggingOg] = useState(false);
  const coverFileInputRef = React.useRef<HTMLInputElement>(null);
  const ogFileInputRef = React.useRef<HTMLInputElement>(null);

  // Get image URLs
  const coverImageUrl = useQuery(
    api.storageQueries.getUrl,
    post?.coverImageStorageId ? { storageId: post.coverImageStorageId } : "skip"
  );

  const ogImageUrl = useQuery(
    api.storageQueries.getUrl,
    post?.ogImageStorageId ? { storageId: post.ogImageStorageId } : "skip"
  );

  useEffect(() => {
    if (post) {
      // Convert scheduledFor timestamp to date and time strings in site timezone
      let scheduledDate = "";
      let scheduledTime = "";
      if (post.scheduledFor) {
        const { date: tzDate, time: tzTime } = timestampToDateTime(post.scheduledFor, siteTimezone);
        scheduledDate = tzDate;
        scheduledTime = tzTime;
      }

      // Convert publishedAt timestamp to date and time strings in site timezone
      let publishedDate = "";
      let publishedTime = "";
      let useCustomPublishDate = false;
      if (post.publishedAt) {
        const { date: tzDate, time: tzTime } = timestampToDateTime(post.publishedAt, siteTimezone);
        publishedDate = tzDate;
        publishedTime = tzTime;
        useCustomPublishDate = true;
      }

      setFormData({
        title: post.title || "",
        slug: post.slug || "",
        excerpt: post.excerpt || "",
        status: post.status || "draft",
        scheduledFor: post.scheduledFor || null,
        scheduledDate,
        scheduledTime,
        publishedAt: post.publishedAt || null,
        publishedDate,
        publishedTime,
        useCustomPublishDate,
        featured: post.featured || false,
        showCoverOnPost: post.showCoverOnPost !== false, // Default to true
        authorName: post.authorName || "",
        categoryIds: (post.categoryIds || []).map(String),
        tags: post.tags || [],
        seoTitle: post.seoTitle || "",
        seoDescription: post.seoDescription || "",
      });
    }
  }, [post, siteTimezone]);

  const handleSave = async () => {
    try {
      // Generate slug from title if empty
      let slug = formData.slug;
      if (!slug && formData.title) {
        slug = formData.title
          .toLowerCase()
          .replace(/[^a-z0-9-]/g, "-")
          .replace(/-+/g, "-")
          .replace(/^-|-$/g, "");
      }

      // Calculate scheduledFor timestamp in site timezone
      let scheduledFor = formData.scheduledFor;
      let willAutoPublish = false;
      
      if (formData.status === "scheduled" && formData.scheduledDate && formData.scheduledTime) {
        scheduledFor = dateTimeToTimestamp(formData.scheduledDate, formData.scheduledTime, siteTimezone);
        
        // Check if this is in the past
        const now = Date.now();
        if (scheduledFor <= now) {
          willAutoPublish = true;
        }
        
        // Debug logging
        console.log('Scheduling details:', {
          date: formData.scheduledDate,
          time: formData.scheduledTime,
          timezone: siteTimezone,
          scheduledFor,
          scheduledForDate: new Date(scheduledFor).toISOString(),
          scheduledForInTz: new Date(scheduledFor).toLocaleString('en-US', { timeZone: siteTimezone }),
          now,
          nowDate: new Date(now).toISOString(),
          willAutoPublish,
          minutesUntilPublish: Math.round((scheduledFor - now) / 1000 / 60)
        });
      }

      // Calculate custom publishedAt timestamp if enabled
      let publishedAt: number | undefined = undefined;
      if (formData.useCustomPublishDate && formData.publishedDate && formData.publishedTime) {
        publishedAt = dateTimeToTimestamp(formData.publishedDate, formData.publishedTime, siteTimezone);
        console.log('Custom publish date:', {
          date: formData.publishedDate,
          time: formData.publishedTime,
          timezone: siteTimezone,
          publishedAt,
          publishedAtDate: new Date(publishedAt).toISOString(),
        });
      }

      await updatePost({
        id: id as Id<"blogPosts">,
        title: formData.title,
        slug,
        excerpt: formData.excerpt || undefined,
        status: formData.status,
        scheduledFor: scheduledFor || undefined,
        publishedAt, // Pass custom publish date
        featured: formData.featured,
        showCoverOnPost: formData.showCoverOnPost,
        authorName: formData.authorName || undefined,
        categoryIds: formData.categoryIds.length > 0 ? formData.categoryIds.map((id) => id as Id<"blogCategories">) : undefined,
        tags: formData.tags.length > 0 ? formData.tags : undefined,
        seoTitle: formData.seoTitle || undefined,
        seoDescription: formData.seoDescription || undefined,
        email: adminEmail || undefined,
      });

      if (willAutoPublish) {
        toast({
          title: "Post published",
          description: "The scheduled time was in the past, so the post was published immediately.",
        });
      } else if (formData.status === "scheduled") {
        toast({
          title: "Post scheduled",
          description: `Your blog post will be published automatically on ${formData.scheduledDate} at ${formData.scheduledTime} (${siteTimezone}).`,
        });
      } else {
        toast({
          title: "Post saved",
          description: "Your blog post has been updated successfully.",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save post",
        variant: "destructive",
      });
    }
  };

  const handleCoverImageUpload = async (file: File) => {
    if (!post) return;

    try {
      setUploading(true);

      const uploadResult = await uploadImageToMediaLibrary({
        file,
        sessionToken: sessionToken || undefined,
        displayLocation: {
          type: "blog_cover",
          entityId: post._id,
          entityName: post.title || "Blog Post Cover",
          subType: "blog",
        },
        generateUploadUrl,
        checkDuplicateMutation,
        getMedia: async () => null,
        addDisplayLocation: async (args) => {
          await addDisplayLocation(args);
        },
        createMedia: async (args) => {
          return await createMedia(args);
        },
      });

      await updatePost({
        id: post._id,
        coverImageStorageId: uploadResult.storageKey,
        email: adminEmail || undefined,
      });

      toast({
        title: "Cover image uploaded",
        description: "Cover image has been uploaded successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to upload cover image",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleOgImageUpload = async (file: File) => {
    if (!post) return;

    try {
      setUploadingOg(true);

      const uploadResult = await uploadImageToMediaLibrary({
        file,
        sessionToken: sessionToken || undefined,
        displayLocation: {
          type: "blog_og",
          entityId: post._id,
          entityName: post.title || "Blog Post OG Image",
          subType: "blog",
        },
        generateUploadUrl,
        checkDuplicateMutation,
        getMedia: async () => null,
        addDisplayLocation: async (args) => {
          await addDisplayLocation(args);
        },
        createMedia: async (args) => {
          return await createMedia(args);
        },
      });

      await updatePost({
        id: post._id,
        ogImageStorageId: uploadResult.storageKey,
        email: adminEmail || undefined,
      });

      toast({
        title: "OG image uploaded",
        description: "OG image has been uploaded successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to upload OG image",
        variant: "destructive",
      });
    } finally {
      setUploadingOg(false);
    }
  };

  const handleAddTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData({
        ...formData,
        tags: [...formData.tags, newTag.trim()],
      });
      setNewTag("");
    }
  };

  const handleRemoveTag = (tag: string) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter((t) => t !== tag),
    });
  };

  // Cover image drag and drop handlers
  const handleCoverDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingCover(true);
  };

  const handleCoverDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingCover(false);
  };

  const handleCoverDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleCoverDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingCover(false);

    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      handleCoverImageUpload(file);
    }
  };

  const handleCoverFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleCoverImageUpload(file);
    }
  };

  // OG image drag and drop handlers
  const handleOgDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOg(true);
  };

  const handleOgDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOg(false);
  };

  const handleOgDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleOgDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOg(false);

    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      handleOgImageUpload(file);
    }
  };

  const handleOgFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleOgImageUpload(file);
    }
  };

  if (!post) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-foreground/60">Loading...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 sm:py-12">
      {/* Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/admin/blog">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight" style={{ fontWeight: '900' }}>
              Edit Blog Post
            </h1>
            <p className="text-foreground/70 text-base mt-1">
              {post.title || "Untitled Post"}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/blog/${post.slug}`} target="_blank">
            <Button variant="outline" className="font-bold uppercase tracking-wider">
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </Button>
          </Link>
          <Button
            onClick={handleSave}
            className="font-black uppercase tracking-wider"
            style={{ backgroundColor: '#FFA617', fontWeight: '900' }}
          >
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <AdminTabs
        value={activeTab}
        onValueChange={setActiveTab}
        tabs={[
          { value: "content", label: "Content" },
          { value: "settings", label: "Settings" },
          { value: "seo", label: "SEO" },
        ]}
        maxWidth="md"
        gridCols={3}
      >

        {/* Content Tab */}
        <TabsContent value="content" className="space-y-6">
          <Card className="border border-foreground/20">
            <CardHeader>
              <CardTitle className="text-xl font-black uppercase tracking-wider" style={{ fontWeight: '900' }}>
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
                  URL Slug *
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
                  placeholder="post-url-slug"
                  className="h-12 text-base font-mono"
                />
                <p className="mt-2 text-xs text-foreground/60">
                  URL: /blog/{formData.slug || "post-url-slug"}
                </p>
              </div>

              <div>
                <Label htmlFor="excerpt" className="text-sm font-black uppercase tracking-wider mb-2 block" style={{ fontWeight: '900' }}>
                  Excerpt
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
            </CardContent>
          </Card>

          <Card className="border border-foreground/20">
            <CardHeader>
              <CardTitle className="text-xl font-black uppercase tracking-wider" style={{ fontWeight: '900' }}>
                Content Sections
              </CardTitle>
              <CardDescription>
                Drag sections to reorder. Click to expand and edit.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BlogSectionList
                key={refreshKey}
                blogPostId={post._id}
                sections={sections}
                onUpdate={() => setRefreshKey((k) => k + 1)}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <Card className="border border-foreground/20">
            <CardHeader>
              <CardTitle className="text-xl font-black uppercase tracking-wider" style={{ fontWeight: '900' }}>
                Publishing
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="status" className="text-sm font-black uppercase tracking-wider mb-2 block" style={{ fontWeight: '900' }}>
                  Status
                </Label>
                <Select value={formData.status} onValueChange={(value: any) => setFormData({ ...formData, status: value })}>
                  <SelectTrigger className="h-12">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.status === "scheduled" && (
                <>
                  <div>
                    <Label className="text-sm font-black uppercase tracking-wider mb-2 block" style={{ fontWeight: '900' }}>
                      Schedule Date
                    </Label>
                    <CustomDatePicker
                      value={formData.scheduledDate}
                      onChange={(date) => setFormData({ ...formData, scheduledDate: date })}
                    />
                  </div>

                  <div>
                    <Label className="text-sm font-black uppercase tracking-wider mb-2 block" style={{ fontWeight: '900' }}>
                      Schedule Time
                    </Label>
                    <CustomTimePicker
                      value={formData.scheduledTime}
                      onChange={(time) => setFormData({ ...formData, scheduledTime: time })}
                    />
                  </div>
                </>
              )}

              <div className="flex items-center gap-2">
                <Checkbox
                  id="featured"
                  checked={formData.featured}
                  onCheckedChange={(checked) => setFormData({ ...formData, featured: checked === true })}
                />
                <Label htmlFor="featured" className="text-sm font-medium cursor-pointer">
                  Featured Post (show at top of blog)
                </Label>
              </div>

              <div>
                <Label htmlFor="authorName" className="text-sm font-black uppercase tracking-wider mb-2 block" style={{ fontWeight: '900' }}>
                  Author Name
                </Label>
                <Input
                  id="authorName"
                  value={formData.authorName}
                  onChange={(e) => setFormData({ ...formData, authorName: e.target.value })}
                  placeholder="Ian Courtright"
                  className="h-12"
                />
              </div>

              <div className="pt-4 border-t border-foreground/10">
                <div className="flex items-center gap-2 mb-4">
                  <Checkbox
                    id="useCustomPublishDate"
                    checked={formData.useCustomPublishDate}
                    onCheckedChange={(checked) => {
                      const useCustom = checked === true;
                      const updates: any = { useCustomPublishDate: useCustom };
                      
                      // If enabling custom date and post is already published, pre-fill with current publishedAt
                      if (useCustom && post?.publishedAt) {
                        const { date: tzDate, time: tzTime } = timestampToDateTime(post.publishedAt, siteTimezone);
                        updates.publishedDate = tzDate;
                        updates.publishedTime = tzTime;
                      } else if (useCustom) {
                        // Pre-fill with current date/time
                        const now = new Date();
                        const year = now.getFullYear();
                        const month = String(now.getMonth() + 1).padStart(2, '0');
                        const day = String(now.getDate()).padStart(2, '0');
                        const hours = String(now.getHours()).padStart(2, '0');
                        const minutes = String(now.getMinutes()).padStart(2, '0');
                        updates.publishedDate = `${year}-${month}-${day}`;
                        updates.publishedTime = `${hours}:${minutes}`;
                      }
                      
                      setFormData({ ...formData, ...updates });
                    }}
                  />
                  <Label htmlFor="useCustomPublishDate" className="text-sm font-medium cursor-pointer">
                    Set custom publish date (for backdating)
                  </Label>
                </div>
                <p className="text-xs text-foreground/60 mb-4">
                  Enable this to set a custom publish date. Useful for backdating posts or scheduling exact publication timestamps.
                </p>

                {formData.useCustomPublishDate && (
                  <>
                    <div className="mb-3">
                      <Label className="text-sm font-black uppercase tracking-wider mb-2 block" style={{ fontWeight: '900' }}>
                        Custom Publish Date
                      </Label>
                      <CustomDatePicker
                        value={formData.publishedDate}
                        onChange={(date) => setFormData({ ...formData, publishedDate: date })}
                      />
                    </div>

                    <div>
                      <Label className="text-sm font-black uppercase tracking-wider mb-2 block" style={{ fontWeight: '900' }}>
                        Custom Publish Time
                      </Label>
                      <CustomTimePicker
                        value={formData.publishedTime}
                        onChange={(time) => setFormData({ ...formData, publishedTime: time })}
                      />
                    </div>

                    {formData.publishedDate && formData.publishedTime && (
                      <p className="text-xs text-foreground/60 mt-3 p-3 bg-accent/10 rounded border border-accent/20">
                        <strong className="font-bold">Preview:</strong> This post will show as published on{' '}
                        {new Date(dateTimeToTimestamp(formData.publishedDate, formData.publishedTime, siteTimezone)).toLocaleString('en-US', {
                          timeZone: siteTimezone,
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                          hour12: true,
                        })}
                        {' '}({siteTimezone})
                      </p>
                    )}
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border border-foreground/20">
            <CardHeader>
              <CardTitle className="text-xl font-black uppercase tracking-wider" style={{ fontWeight: '900' }}>
                Organization
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm font-black uppercase tracking-wider mb-2 block" style={{ fontWeight: '900' }}>
                  Categories
                </Label>
                <div className="space-y-2">
                  {categories.map((cat) => (
                    <div key={cat._id} className="flex items-center gap-2">
                      <Checkbox
                        id={`cat-${cat._id}`}
                        checked={formData.categoryIds.includes(String(cat._id))}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setFormData({
                              ...formData,
                              categoryIds: [...formData.categoryIds, String(cat._id)],
                            });
                          } else {
                            setFormData({
                              ...formData,
                              categoryIds: formData.categoryIds.filter((id) => id !== String(cat._id)),
                            });
                          }
                        }}
                      />
                      <Label htmlFor={`cat-${cat._id}`} className="text-sm cursor-pointer">
                        {cat.name}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-sm font-black uppercase tracking-wider mb-2 block" style={{ fontWeight: '900' }}>
                  Tags
                </Label>
                <div className="flex gap-2 mb-2">
                  <Input
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    placeholder="Add a tag..."
                    className="h-10"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddTag();
                      }
                    }}
                  />
                  <Button onClick={handleAddTag} size="sm">
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.tags.map((tag) => (
                    <Badge
                      key={tag}
                      className="bg-accent/20 text-foreground px-3 py-1.5 rounded-full text-sm flex items-center gap-2 font-bold uppercase tracking-wider border border-accent/30"
                    >
                      {tag}
                      <button
                        onClick={() => handleRemoveTag(tag)}
                        className="hover:text-destructive transition-colors"
                        type="button"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-foreground/20">
            <CardHeader>
              <CardTitle className="text-xl font-black uppercase tracking-wider" style={{ fontWeight: '900' }}>
                Cover Image
              </CardTitle>
              <CardDescription>
                This image will be displayed prominently on the blog listing and at the top of your post.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {coverImageUrl ? (
                <div>
                  <img src={coverImageUrl} alt="Cover" className="w-full rounded-lg mb-4 shadow-md" />
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setCoverLibraryOpen(true)}
                      className="font-bold uppercase tracking-wider"
                    >
                      <ImageIcon className="h-4 w-4 mr-2" />
                      Change Image
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={async () => {
                        try {
                          await updatePost({
                            id: post._id,
                            coverImageStorageId: "" as any,
                            email: adminEmail || undefined,
                          });
                          toast({
                            title: "Cover image removed",
                            description: "The cover image has been successfully removed.",
                          });
                        } catch (error: any) {
                          console.error("Remove cover image error:", error);
                          toast({
                            title: "Error",
                            description: error?.message || "Failed to remove cover image. Please try again.",
                            variant: "destructive",
                          });
                        }
                      }}
                      className="font-bold uppercase tracking-wider"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Remove Image
                    </Button>
                  </div>
                </div>
              ) : (
                <div>
                  <input
                    ref={coverFileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleCoverFileSelect}
                    className="hidden"
                  />
                  <UploadZone
                    onSelectFiles={() => coverFileInputRef.current?.click()}
                    onSelectFromLibrary={() => setCoverLibraryOpen(true)}
                    disabled={uploading}
                    isDragging={isDraggingCover}
                    onDragEnter={handleCoverDragEnter}
                    onDragLeave={handleCoverDragLeave}
                    onDragOver={handleCoverDragOver}
                    onDrop={handleCoverDrop}
                    title="Drag & drop cover image here"
                    description="Supports images"
                  />
                </div>
              )}

              <div className="pt-4 border-t border-foreground/10">
                <div className="flex items-center gap-2 mb-1">
                  <Checkbox
                    id="showCoverOnPost"
                    checked={formData.showCoverOnPost}
                    onCheckedChange={(checked) => setFormData({ ...formData, showCoverOnPost: checked === true })}
                  />
                  <Label htmlFor="showCoverOnPost" className="text-sm font-medium cursor-pointer">
                    Show cover image on post page
                  </Label>
                </div>
                <p className="text-xs text-foreground/60 ml-6">
                  Cover image will always show on blog cards. This controls whether it displays on the individual post page.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SEO Tab */}
        <TabsContent value="seo" className="space-y-6">
          <Card className="border border-foreground/20">
            <CardHeader>
              <CardTitle className="text-xl font-black uppercase tracking-wider" style={{ fontWeight: '900' }}>
                Search Engine Optimization
              </CardTitle>
              <CardDescription>
                Customize how this post appears in search results and social media.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="seoTitle" className="text-sm font-black uppercase tracking-wider mb-2 block" style={{ fontWeight: '900' }}>
                  SEO Title
                </Label>
                <Input
                  id="seoTitle"
                  value={formData.seoTitle}
                  onChange={(e) => setFormData({ ...formData, seoTitle: e.target.value })}
                  placeholder={formData.title || "Post title"}
                  className="h-12"
                />
                <p className="mt-2 text-xs text-foreground/60">
                  {formData.seoTitle.length || formData.title.length} / 60 characters
                </p>
              </div>

              <div>
                <Label htmlFor="seoDescription" className="text-sm font-black uppercase tracking-wider mb-2 block" style={{ fontWeight: '900' }}>
                  SEO Description
                </Label>
                <ResizableTextarea
                  id="seoDescription"
                  value={formData.seoDescription}
                  onChange={(e) => setFormData({ ...formData, seoDescription: e.target.value })}
                  placeholder={formData.excerpt || "Brief description of your post..."}
                  minRows={3}
                  maxRows={8}
                />
                <p className="mt-2 text-xs text-foreground/60">
                  {formData.seoDescription.length || formData.excerpt.length} / 160 characters
                </p>
              </div>

              <div>
                <Label className="text-sm font-black uppercase tracking-wider mb-2 block" style={{ fontWeight: '900' }}>
                  Open Graph Image (for social media)
                </Label>
                <CardDescription className="mb-4">
                  This image will be used when your post is shared on platforms like Facebook and Twitter. Recommended size: 1200×630px
                </CardDescription>
                {ogImageUrl ? (
                  <div>
                    <img src={ogImageUrl} alt="OG Image" className="w-full max-w-md rounded-lg mb-4 shadow-md" />
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setOgLibraryOpen(true)}
                        className="font-bold uppercase tracking-wider"
                      >
                        <ImageIcon className="h-4 w-4 mr-2" />
                        Change Image
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={async () => {
                          try {
                            await updatePost({
                              id: post._id,
                              ogImageStorageId: "" as any,
                              email: adminEmail || undefined,
                            });
                            toast({
                              title: "OG image removed",
                              description: "The Open Graph image has been successfully removed.",
                            });
                          } catch (error: any) {
                            console.error("Remove OG image error:", error);
                            toast({
                              title: "Error",
                              description: error?.message || "Failed to remove OG image. Please try again.",
                              variant: "destructive",
                            });
                          }
                        }}
                        className="font-bold uppercase tracking-wider"
                      >
                        <X className="h-4 w-4 mr-2" />
                        Remove Image
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <input
                      ref={ogFileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleOgFileSelect}
                      className="hidden"
                    />
                    <UploadZone
                      onSelectFiles={() => ogFileInputRef.current?.click()}
                      onSelectFromLibrary={() => setOgLibraryOpen(true)}
                      disabled={uploadingOg}
                      isDragging={isDraggingOg}
                      onDragEnter={handleOgDragEnter}
                      onDragLeave={handleOgDragLeave}
                      onDragOver={handleOgDragOver}
                      onDrop={handleOgDrop}
                      title="Drag & drop OG image here"
                      description="Recommended: 1200×630px"
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </AdminTabs>

      {/* Cover Image Media Library Selector */}
      <MediaLibrarySelector
        open={coverLibraryOpen}
        onOpenChange={setCoverLibraryOpen}
        onSelect={(items) => {
          if (items.length > 0) {
            updatePost({
              id: post._id,
              coverImageStorageId: items[0].storageKey,
              email: adminEmail || undefined,
            });
          }
        }}
        title="Select Cover Image"
        description="Choose an image from your media library for the blog post cover"
        multiple={false}
        mediaType="image"
        confirmButtonText="Set as Cover"
      />

      {/* OG Image Media Library Selector */}
      <MediaLibrarySelector
        open={ogLibraryOpen}
        onOpenChange={setOgLibraryOpen}
        onSelect={(items) => {
          if (items.length > 0) {
            updatePost({
              id: post._id,
              ogImageStorageId: items[0].storageKey,
              email: adminEmail || undefined,
            });
          }
        }}
        title="Select Open Graph Image"
        description="Choose an image from your media library for social media sharing (recommended: 1200×630px)"
        multiple={false}
        mediaType="image"
        confirmButtonText="Set as OG Image"
      />
    </div>
  );
}

