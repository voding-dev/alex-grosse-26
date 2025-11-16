"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Nav } from "@/components/nav";
import { BlogPostCard } from "@/components/blog/blog-post-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, X } from "lucide-react";

export default function BlogListingPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<Id<"blogCategories"> | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const postsPerPage = 9;

  const posts = useQuery(api.blogPosts.listPublished, {
    categoryId: selectedCategory || undefined,
    tag: selectedTag || undefined,
  });
  const categories = useQuery(api.blogCategories.list) || [];
  const popularTags = useQuery(api.blogTags.list) || [];

  // Filter posts by search
  const filteredPosts = posts?.filter((post) => {
    if (!searchQuery) return true;
    const searchLower = searchQuery.toLowerCase();
    return (
      post.title.toLowerCase().includes(searchLower) ||
      post.excerpt?.toLowerCase().includes(searchLower)
    );
  }) || [];

  // Separate featured and regular posts
  const featuredPosts = filteredPosts.filter((post) => post.featured);
  const regularPosts = filteredPosts.filter((post) => !post.featured);

  // Pagination
  const totalPages = Math.ceil(regularPosts.length / postsPerPage);
  const displayedPosts = regularPosts.slice((page - 1) * postsPerPage, page * postsPerPage);

  const handleCategoryFilter = (categoryId: Id<"blogCategories"> | null) => {
    setSelectedCategory(categoryId);
    setSelectedTag(null);
    setPage(1);
  };

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedCategory(null);
    setSelectedTag(null);
    setPage(1);
  };

  const hasFilters = searchQuery || selectedCategory || selectedTag;

  return (
    <main className="min-h-screen bg-background">
      <Nav />

        {/* Hero Section */}
        <section className="w-full pt-20 pb-0">
          <div className="bg-accent w-full px-0 overflow-hidden" style={{ paddingTop: '0', paddingBottom: '0' }}>
            <div className="w-full text-center">
              <h1 className="w-full font-black uppercase text-white" style={{ letterSpacing: '-0.02em', width: '100%', display: 'block', fontWeight: '900', lineHeight: '0.7', margin: '0', fontSize: 'clamp(4.5rem, 15vw, 26rem)' }}>
                BLOG
              </h1>
            </div>
          </div>
          <div className="bg-white w-full pt-8 sm:pt-10 md:pt-12 pb-6 sm:pb-8">
            <p className="text-center text-xl sm:text-2xl md:text-3xl text-black/70 max-w-3xl mx-auto px-4 font-medium leading-relaxed">
              Insights, tutorials, and stories from the creative process
            </p>
          </div>
        </section>

        <div className="bg-white w-full py-12 sm:py-16 md:py-20 lg:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
            {/* Search and Filters */}
            <div className="space-y-6">
              {/* Search */}
              <div className="max-w-3xl mx-auto">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-6 w-6 text-black/40" />
                  <Input
                    placeholder="Search posts..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setPage(1);
                    }}
                    className="pl-14 h-16 text-lg border-black/20 bg-white text-black placeholder:text-black/50 focus:border-accent"
                  />
                </div>
              </div>

              {/* Categories */}
              {categories.length > 0 && (
                <div className="flex flex-wrap gap-3 justify-center">
                  <Button
                    variant={selectedCategory === null ? "default" : "outline"}
                    onClick={() => handleCategoryFilter(null)}
                    className="font-black uppercase tracking-wider text-sm sm:text-base px-6 py-3 h-auto border-2"
                    style={{ 
                      fontWeight: '900', 
                      backgroundColor: selectedCategory === null ? '#FFA617' : 'transparent', 
                      color: selectedCategory === null ? 'white' : 'black', 
                      borderColor: '#000' 
                    }}
                  >
                    All
                  </Button>
                  {categories.map((cat) => (
                    <Button
                      key={cat._id}
                      variant={selectedCategory === cat._id ? "default" : "outline"}
                      onClick={() => handleCategoryFilter(cat._id)}
                      className="font-black uppercase tracking-wider text-sm sm:text-base px-6 py-3 h-auto border-2"
                      style={{ 
                        fontWeight: '900',
                        backgroundColor: selectedCategory === cat._id ? (cat.color || '#FFA617') : 'transparent',
                        color: selectedCategory === cat._id ? 'white' : 'black',
                        borderColor: cat.color || '#000'
                      }}
                    >
                      {cat.name}
                    </Button>
                  ))}
                </div>
              )}

              {/* Tags */}
              {popularTags.length > 0 && !selectedCategory && !searchQuery && (
                <div className="flex flex-wrap justify-center gap-2">
                  {popularTags.map((tag) => (
                    <Badge
                      key={tag._id}
                      onClick={() => {
                        setSelectedTag(selectedTag === tag.name ? null : tag.name);
                        setPage(1);
                      }}
                      className={`cursor-pointer transition-all duration-200 text-sm px-4 py-2 border-2 ${
                        selectedTag === tag.name
                          ? 'bg-accent text-white border-accent'
                          : 'bg-white text-black hover:bg-black/5 border-black/20'
                      } font-bold uppercase tracking-wider`}
                      style={selectedTag === tag.name ? { backgroundColor: '#FFA617', borderColor: '#FFA617' } : {}}
                    >
                      {tag.name}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Clear Filters */}
              {hasFilters && (
                <div className="text-center">
                  <Button
                    variant="outline"
                    onClick={clearFilters}
                    className="font-black uppercase tracking-wider border-2 border-black/20 text-black hover:bg-black/5 px-6 py-3 h-auto"
                    style={{ fontWeight: '900' }}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Clear Filters
                  </Button>
                </div>
              )}
            </div>

            {/* Featured Posts */}
            {featuredPosts.length > 0 && !hasFilters && (
              <div className="space-y-8">
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-black uppercase tracking-tight text-black" style={{ fontWeight: '900', letterSpacing: '-0.02em' }}>
                  Featured
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {featuredPosts.map((post) => (
                    <BlogPostCard key={post._id} post={post} />
                  ))}
                </div>
              </div>
            )}

            {/* All Posts */}
            {displayedPosts.length > 0 || featuredPosts.length > 0 ? (
              displayedPosts.length > 0 && (
                <div className="space-y-8">
                  <h2 className="text-3xl sm:text-4xl md:text-5xl font-black uppercase tracking-tight text-black" style={{ fontWeight: '900', letterSpacing: '-0.02em' }}>
                    {hasFilters ? "Search Results" : "Latest Posts"}
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {displayedPosts.map((post) => (
                      <BlogPostCard key={post._id} post={post} />
                    ))}
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex justify-center items-center gap-4 pt-8">
                      <Button
                        variant="outline"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="font-black uppercase tracking-wider px-8 py-4 h-auto text-base border-2 disabled:opacity-50"
                        style={{ fontWeight: '900', borderColor: '#000', color: 'black' }}
                      >
                        Previous
                      </Button>
                      <span className="text-base font-bold text-black/70 px-4">
                        Page {page} of {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        className="font-black uppercase tracking-wider px-8 py-4 h-auto text-base border-2 disabled:opacity-50"
                        style={{ fontWeight: '900', borderColor: '#000', color: 'black' }}
                      >
                        Next
                      </Button>
                    </div>
                  )}
                </div>
              )
            ) : (
              <div className="text-center py-20">
                <p className="text-xl text-black/50 font-medium">
                  {hasFilters ? "No posts match your filters." : "No blog posts yet."}
                </p>
              </div>
            )}
        </div>
      </div>
    </main>
  );
}
