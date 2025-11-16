"use client";

import { use, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Nav } from "@/components/nav";
import { BlogSectionRenderer } from "@/components/blog/blog-section-renderer";
import { BlogPostCard } from "@/components/blog/blog-post-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Eye, Twitter, Linkedin, Link as LinkIcon, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";

export default function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { toast } = useToast();

  // Get post
  const post = useQuery(api.blogPosts.getBySlug, { slug });

  // Get sections
  const sections = useQuery(
    api.blogPostSections.listByPost,
    post ? { blogPostId: post._id } : "skip"
  ) || [];

  // Get categories
  const allCategories = useQuery(api.blogCategories.list) || [];
  const postCategories = allCategories.filter((cat) =>
    post?.categoryIds?.includes(cat._id)
  );

  // Get related posts (same category)
  const relatedPosts = useQuery(
    api.blogPosts.listPublished,
    post && post.categoryIds && post.categoryIds.length > 0
      ? { categoryId: post.categoryIds[0], limit: 3 }
      : "skip"
  ) || [];

  const filteredRelatedPosts = relatedPosts.filter((p) => p._id !== post?._id).slice(0, 3);

  // Get cover image URL
  const coverImageUrl = useQuery(
    api.storageQueries.getUrl,
    post?.coverImageStorageId ? { storageId: post.coverImageStorageId } : "skip"
  );

  // Increment view count
  const incrementViewCount = useMutation(api.blogPosts.incrementViewCount);

  useEffect(() => {
    if (post) {
      incrementViewCount({ id: post._id });
    }
  }, [post?._id, incrementViewCount]);

  if (post === null) {
    notFound();
  }

  if (!post) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-foreground/60">Loading...</p>
      </main>
    );
  }

  // Check if post should be visible
  const now = Date.now();
  const isVisible =
    post.status === "published" ||
    (post.status === "scheduled" && post.scheduledFor && post.scheduledFor <= now);

  if (!isVisible) {
    notFound();
  }

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Estimate read time
  const totalWords = sections.reduce((acc, section) => {
    if (section.textContent) {
      // Strip HTML and count words
      const text = section.textContent.replace(/<[^>]*>/g, "");
      return acc + text.split(/\s+/).length;
    }
    return acc;
  }, 0);
  const readTime = Math.max(1, Math.ceil(totalWords / 200));

  const shareUrl = typeof window !== "undefined" ? window.location.href : "";
  const shareTitle = post.title;

  const handleShare = (platform: string) => {
    let url = "";
    switch (platform) {
      case "twitter":
        url = `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareTitle)}`;
        break;
      case "linkedin":
        url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
        break;
      case "copy":
        navigator.clipboard.writeText(shareUrl);
        toast({
          title: "Link copied",
          description: "Post link copied to clipboard.",
        });
        return;
    }
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  // Generate JSON-LD structured data
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": post.seoTitle || post.title,
    "description": post.seoDescription || post.excerpt,
    "datePublished": post.publishedAt ? new Date(post.publishedAt).toISOString() : undefined,
    "dateModified": new Date(post.updatedAt).toISOString(),
    "author": {
      "@type": "Person",
      "name": post.authorName || "Ian Courtright",
    },
    "publisher": {
      "@type": "Organization",
      "name": "Ian Courtright",
    },
  };

  return (
    <main className="min-h-screen bg-white">
      <Nav />

      {/* Back to Blog Button */}
      <div className="bg-white w-full pt-24 sm:pt-28 pb-6 sm:pb-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Link href="/blog">
            <Button 
              className="font-black uppercase tracking-wider bg-black text-white hover:bg-accent border-2 border-black hover:border-accent transition-all px-6 sm:px-8 py-3 sm:py-4 h-auto text-sm sm:text-base"
              style={{ fontWeight: '900' }}
            >
              <ChevronLeft className="h-5 w-5 mr-2" />
              Back to Blog
            </Button>
          </Link>
        </div>
      </div>

      {/* Cover Image Hero */}
      {coverImageUrl && post.showCoverOnPost !== false && (
        <section className="w-full bg-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8 md:py-10">
            <div className="relative w-full rounded-xl sm:rounded-2xl overflow-hidden shadow-2xl" style={{ aspectRatio: '16/9' }}>
              <img
                src={coverImageUrl}
                alt={post.title}
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </section>
      )}

      <article className="bg-white w-full py-8 sm:py-12 md:py-16 lg:py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <header className="mb-12 sm:mb-16">
            {/* Categories */}
            {postCategories.length > 0 && (
              <div className="flex flex-wrap gap-2 sm:gap-3 mb-6 sm:mb-8">
                {postCategories.map((cat) => (
                  <Badge
                    key={cat._id}
                    style={{ backgroundColor: cat.color || "#FFA617" }}
                    className="text-white font-black uppercase tracking-wider text-sm sm:text-base px-4 sm:px-5 py-2 sm:py-2.5 shadow-md"
                  >
                    {cat.name}
                  </Badge>
                ))}
              </div>
            )}

            {/* Title */}
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-black uppercase text-black mb-6 sm:mb-8" style={{ fontWeight: '900', letterSpacing: '-0.02em', lineHeight: '1.1' }}>
              {post.title}
            </h1>

            {/* Excerpt */}
            {post.excerpt && (
              <p className="text-xl sm:text-2xl md:text-3xl text-black/70 mb-6 sm:mb-8 font-medium leading-relaxed">
                {post.excerpt}
              </p>
            )}

            {/* Meta */}
            <div className="flex flex-wrap items-center gap-3 sm:gap-4 md:gap-6 text-sm sm:text-base text-black/60 pt-6 sm:pt-8 pb-6 sm:pb-8 border-t-2 border-b-2 border-black/10">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="font-medium">{formatDate(post.publishedAt)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="font-medium">{readTime} min read</span>
              </div>
              {post.viewCount !== undefined && post.viewCount > 0 && (
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span className="font-medium">{post.viewCount} views</span>
                </div>
              )}
            </div>
          </header>

          {/* Content */}
          <div className="space-y-10 sm:space-y-12 mb-16 sm:mb-20 md:mb-24 text-black pt-6 sm:pt-8">
            {sections.map((section) => (
              <BlogSectionRenderer key={section._id} section={section} />
            ))}
          </div>

          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <div className="mb-12 sm:mb-16 pb-12 sm:pb-16 border-t-2 border-black/10 pt-10 sm:pt-12">
              <h3 className="text-lg sm:text-xl font-black uppercase tracking-wider mb-4 sm:mb-6 text-black" style={{ fontWeight: '900' }}>
                Tags
              </h3>
              <div className="flex flex-wrap gap-2 sm:gap-3">
                {post.tags.map((tag) => (
                  <Badge
                    key={tag}
                    className="bg-white text-black border-2 border-black font-bold uppercase tracking-wider text-sm sm:text-base px-4 sm:px-5 py-2 sm:py-2.5 hover:bg-black hover:text-white transition-all cursor-pointer"
                  >
                    #{tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Share */}
          <div className="mb-16 sm:mb-20 pb-12 sm:pb-16 border-t-2 border-black/10 pt-10 sm:pt-12">
            <h3 className="text-lg sm:text-xl font-black uppercase tracking-wider mb-4 sm:mb-6 text-black" style={{ fontWeight: '900' }}>
              Share this post
            </h3>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <Button
                onClick={() => handleShare("twitter")}
                className="font-black uppercase tracking-wider bg-black text-white hover:bg-accent border-2 border-black hover:border-accent transition-all px-5 sm:px-6 py-2.5 sm:py-3 h-auto text-sm sm:text-base"
                style={{ fontWeight: '900' }}
              >
                <Twitter className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                Twitter
              </Button>
              <Button
                onClick={() => handleShare("linkedin")}
                className="font-black uppercase tracking-wider bg-black text-white hover:bg-accent border-2 border-black hover:border-accent transition-all px-5 sm:px-6 py-2.5 sm:py-3 h-auto text-sm sm:text-base"
                style={{ fontWeight: '900' }}
              >
                <Linkedin className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                LinkedIn
              </Button>
              <Button
                onClick={() => handleShare("copy")}
                className="font-black uppercase tracking-wider bg-accent text-white hover:bg-black border-2 border-accent hover:border-black transition-all px-5 sm:px-6 py-2.5 sm:py-3 h-auto text-sm sm:text-base"
                style={{ fontWeight: '900' }}
              >
                <LinkIcon className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                Copy Link
              </Button>
              {post.authorName && (
                <div className="font-black text-black uppercase tracking-wider text-sm sm:text-base ml-2" style={{ fontWeight: '900' }}>
                  By {post.authorName}
                </div>
              )}
            </div>
          </div>
        </div>
      </article>

      {/* Related Posts */}
      {filteredRelatedPosts.length > 0 && (
        <section className="bg-white w-full py-12 sm:py-16 md:py-20 lg:py-24 border-t-4 border-black/5">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-10 sm:mb-12">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-black uppercase tracking-tight text-black mb-3 sm:mb-4" style={{ fontWeight: '900', letterSpacing: '-0.02em' }}>
                Keep Reading
              </h2>
              <p className="text-lg sm:text-xl text-black/60 font-medium">More stories you might enjoy</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
              {filteredRelatedPosts.map((relatedPost) => (
                <BlogPostCard key={relatedPost._id} post={relatedPost} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Bottom CTA */}
      <div className="bg-accent w-full py-12 sm:py-16 shadow-inner">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <h3 className="text-2xl sm:text-3xl md:text-4xl font-black uppercase tracking-tight text-white mb-4 sm:mb-6" style={{ fontWeight: '900', letterSpacing: '-0.01em' }}>
            Read More Stories
          </h3>
          <Link href="/blog">
            <Button 
              className="font-black uppercase tracking-wider bg-white text-black hover:bg-black hover:text-white border-2 border-white hover:border-black transition-all px-6 sm:px-8 py-3 sm:py-4 h-auto text-base sm:text-lg shadow-lg"
              style={{ fontWeight: '900' }}
            >
              <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6 mr-2" />
              Back to All Posts
            </Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
