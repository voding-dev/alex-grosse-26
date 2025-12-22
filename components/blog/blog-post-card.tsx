"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import Link from "next/link";
import { Calendar, Clock, Eye, Heart, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface BlogPostCardProps {
  post: {
    _id: Id<"blogPosts">;
    title: string;
    slug: string;
    excerpt?: string;
    coverImageStorageId?: string;
    publishedAt?: number;
    categoryIds?: Array<Id<"blogCategories">>;
    tags?: string[];
    viewCount?: number;
    likeCount?: number;
  };
  featured?: boolean;
}

export function BlogPostCard({ post, featured = false }: BlogPostCardProps) {
  // Get cover image URL
  const coverImageUrl = useQuery(
    api.storageQueries.getUrl,
    post.coverImageStorageId
      ? { storageId: post.coverImageStorageId }
      : "skip"
  );

  // Get categories
  const allCategories = useQuery(api.blogCategories.list) || [];
  const postCategories = allCategories.filter((cat) =>
    post.categoryIds?.includes(cat._id)
  );

  // Get sections for accurate read time calculation
  const sections = useQuery(
    api.blogPostSections.listByPost,
    { blogPostId: post._id }
  ) || [];

  // Calculate read time from actual content (same logic as detail page)
  const totalWords = sections.reduce((acc, section) => {
    if (section.textContent) {
      // Strip HTML and count words
      const text = section.textContent.replace(/<[^>]*>/g, "");
      return acc + text.split(/\s+/).length;
    }
    return acc;
  }, 0);
  const readTime = Math.max(1, Math.ceil(totalWords / 200));

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <Link href={`/blog/${post.slug}`} className="block group">
      <div className="relative overflow-hidden bg-white border-2 border-black/10 hover:border-accent transition-all duration-300 hover:shadow-2xl rounded-lg h-full flex flex-col">
        {/* Image */}
        <div className="relative aspect-video overflow-hidden">
          {coverImageUrl ? (
            <img
              src={coverImageUrl}
              alt={post.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-accent/30 to-accent/10 flex items-center justify-center">
              <span className="text-3xl font-black uppercase text-accent/50" style={{ fontWeight: '900' }}>
                IC
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-6 flex flex-col flex-1">
          {/* Categories */}
          {postCategories.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {postCategories.slice(0, 2).map((cat) => (
                <Badge
                  key={cat._id}
                  style={{ backgroundColor: cat.color || "#586034" }}
                  className="text-white font-black uppercase tracking-wider text-xs px-3 py-1"
                >
                  {cat.name}
                </Badge>
              ))}
            </div>
          )}

          {/* Title */}
          <h3 className="text-xl sm:text-2xl font-black uppercase tracking-tight mb-3 group-hover:text-accent transition-colors line-clamp-2 text-black" style={{ fontWeight: '900', letterSpacing: '-0.01em' }}>
            {post.title}
          </h3>

          {/* Excerpt */}
          {post.excerpt && (
            <p className="text-sm sm:text-base text-black/70 mb-4 line-clamp-3 flex-1 font-medium">
              {post.excerpt}
            </p>
          )}

          {/* Meta */}
          <div className="flex items-center justify-between pt-4 border-t-2 border-black/5 mt-auto">
            <div className="flex items-center gap-3 text-xs text-black/60 flex-wrap">
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span className="font-medium">{formatDate(post.publishedAt)}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span className="font-medium">{readTime} min read</span>
              </div>
              {post.viewCount !== undefined && post.viewCount > 0 && (
                <div className="flex items-center gap-1">
                  <Eye className="h-4 w-4" />
                  <span className="font-medium">{post.viewCount}</span>
                </div>
              )}
              {post.likeCount !== undefined && post.likeCount > 0 && (
                <div className="flex items-center gap-1">
                  <Heart className="h-4 w-4 fill-current" />
                  <span className="font-medium">{post.likeCount}</span>
                </div>
              )}
            </div>
            <ArrowRight className="h-5 w-5 text-accent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex-shrink-0" />
          </div>
        </div>
      </div>
    </Link>
  );
}
