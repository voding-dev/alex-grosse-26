"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Eye, Edit2, Calendar, Clock, FolderOpen, Tag } from "lucide-react";
import Link from "next/link";
import { AdminTabs, AdminTab } from "@/components/admin/admin-tabs";

export default function BlogManagementPage() {
  const [activeTab, setActiveTab] = useState<"all" | "published" | "drafts" | "scheduled" | "archived">("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Get all posts
  const allPosts = useQuery(api.blogPosts.list, {}) || [];
  const stats = useQuery(api.blogPosts.getStats) || { total: 0, published: 0, drafts: 0, scheduled: 0, archived: 0 };
  const categories = useQuery(api.blogCategories.list) || [];

  // Filter posts based on active tab
  const filteredPosts = allPosts.filter((post) => {
    // Filter by status
    if (activeTab !== "all") {
      const statusMap = {
        published: "published",
        drafts: "draft",
        scheduled: "scheduled",
        archived: "archived",
      };
      if (post.status !== statusMap[activeTab]) {
        return false;
      }
    }

    // Filter by search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      return (
        post.title.toLowerCase().includes(query) ||
        post.excerpt?.toLowerCase().includes(query)
      );
    }

    return true;
  });

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return "No date";
    const date = new Date(timestamp);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getStatusBadge = (status: string) => {
    const config = {
      draft: { label: "Draft", className: "bg-foreground/20 text-foreground" },
      published: { label: "Published", className: "bg-green-500/20 text-green-400 border-green-500/30" },
      scheduled: { label: "Scheduled", className: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
      archived: { label: "Archived", className: "bg-foreground/10 text-foreground/60" },
    };

    const { label, className } = config[status as keyof typeof config] || config.draft;

    return (
      <Badge className={`${className} border font-bold uppercase tracking-wider`}>
        {label}
      </Badge>
    );
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 sm:py-12">
      {/* Header */}
      <div className="mb-8 sm:mb-12">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight text-foreground mb-4" style={{ fontWeight: '900', letterSpacing: '-0.02em' }}>
              Blog Management
            </h1>
            <p className="text-foreground/70 text-base sm:text-lg">
              Create and manage blog posts with rich content, categories, and SEO optimization.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/blog/categories">
              <Button variant="outline" className="font-bold uppercase tracking-wider">
                <FolderOpen className="mr-2 h-4 w-4" />
                Categories
              </Button>
            </Link>
            <Link href="/admin/blog/tags">
              <Button variant="outline" className="font-bold uppercase tracking-wider">
                <Tag className="mr-2 h-4 w-4" />
                Tags
              </Button>
            </Link>
            <Link href="/admin/blog/new" className="w-full sm:w-auto">
              <Button className="w-full sm:w-auto font-black uppercase tracking-wider hover:bg-accent/90 transition-colors" style={{ backgroundColor: '#FFA617', fontWeight: '900' }}>
                <Plus className="mr-2 h-4 w-4" />
                New Post
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <Card className="border border-foreground/10 bg-foreground/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-black uppercase tracking-wider text-foreground/60" style={{ fontWeight: '900' }}>
              Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-black text-accent" style={{ fontWeight: '900' }}>
              {stats.total}
            </p>
          </CardContent>
        </Card>

        <Card className="border border-foreground/10 bg-foreground/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-black uppercase tracking-wider text-foreground/60" style={{ fontWeight: '900' }}>
              Published
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-black text-green-400" style={{ fontWeight: '900' }}>
              {stats.published}
            </p>
          </CardContent>
        </Card>

        <Card className="border border-foreground/10 bg-foreground/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-black uppercase tracking-wider text-foreground/60" style={{ fontWeight: '900' }}>
              Drafts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-black text-foreground" style={{ fontWeight: '900' }}>
              {stats.drafts}
            </p>
          </CardContent>
        </Card>

        <Card className="border border-foreground/10 bg-foreground/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-black uppercase tracking-wider text-foreground/60" style={{ fontWeight: '900' }}>
              Scheduled
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-black text-blue-400" style={{ fontWeight: '900' }}>
              {stats.scheduled}
            </p>
          </CardContent>
        </Card>

        <Card className="border border-foreground/10 bg-foreground/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-black uppercase tracking-wider text-foreground/60" style={{ fontWeight: '900' }}>
              Archived
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-black text-foreground/40" style={{ fontWeight: '900' }}>
              {stats.archived}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-foreground/40" />
          <Input
            placeholder="Search posts by title or excerpt..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-12"
          />
        </div>
      </div>

      {/* Tabs */}
      <AdminTabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as any)}
        tabs={[
          { value: "all", label: "All" },
          { value: "published", label: "Published" },
          { value: "drafts", label: "Drafts" },
          { value: "scheduled", label: "Scheduled" },
          { value: "archived", label: "Archived" },
        ]}
        maxWidth="full"
        gridCols={5}
        className="mb-6"
      >
        <div className="space-y-4">
          {filteredPosts.length === 0 ? (
            <Card className="border border-foreground/10">
              <CardContent className="p-12 text-center">
                <p className="text-foreground/60 mb-4">
                  {searchQuery ? "No posts match your search." : `No ${activeTab === "all" ? "" : activeTab} posts yet.`}
                </p>
                <Link href="/admin/blog/new">
                  <Button className="font-black uppercase tracking-wider" style={{ backgroundColor: '#FFA617', fontWeight: '900' }}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Your First Post
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            filteredPosts.map((post) => {
              const postCategories = categories.filter((cat) =>
                post.categoryIds?.includes(cat._id)
              );

              return (
                <Card key={post._id} className="border border-foreground/20 hover:border-accent/50 transition-colors">
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      {/* Post Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          {getStatusBadge(post.status)}
                          {post.featured && (
                            <Badge className="bg-accent/20 text-accent border border-accent/30 font-bold uppercase tracking-wider">
                              Featured
                            </Badge>
                          )}
                        </div>

                        <h3 className="text-xl font-black uppercase tracking-tight mb-2 truncate" style={{ fontWeight: '900' }}>
                          {post.title}
                        </h3>

                        {post.excerpt && (
                          <p className="text-sm text-foreground/70 mb-3 line-clamp-2">
                            {post.excerpt}
                          </p>
                        )}

                        <div className="flex flex-wrap gap-2 mb-2">
                          {postCategories.map((cat) => (
                            <Badge
                              key={cat._id}
                              style={{ backgroundColor: cat.color || "#FFA617" }}
                              className="text-black font-bold uppercase tracking-wider text-xs"
                            >
                              {cat.name}
                            </Badge>
                          ))}
                        </div>

                        <div className="flex items-center gap-4 text-xs text-foreground/60">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {post.status === "scheduled" && post.scheduledFor
                              ? `Scheduled: ${formatDate(post.scheduledFor)}`
                              : post.publishedAt
                              ? `Published: ${formatDate(post.publishedAt)}`
                              : `Created: ${formatDate(post.createdAt)}`}
                          </div>
                          {post.viewCount !== undefined && post.viewCount > 0 && (
                            <div className="flex items-center gap-1">
                              <Eye className="h-3 w-3" />
                              {post.viewCount} views
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2">
                        <Link href={`/blog/${post.slug}`} target="_blank">
                          <Button variant="outline" size="sm" className="font-bold uppercase tracking-wider">
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </Button>
                        </Link>
                        <Link href={`/admin/blog/${post._id}`}>
                          <Button size="sm" className="font-black uppercase tracking-wider" style={{ backgroundColor: '#FFA617', fontWeight: '900' }}>
                            <Edit2 className="h-4 w-4 mr-2" />
                            Edit
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </AdminTabs>
    </div>
  );
}

