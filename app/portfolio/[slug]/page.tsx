"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Nav } from "@/components/nav";
import { CloseButton } from "@/components/close-button";
import Link from "next/link";
import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MasonryGrid } from "@/components/masonry-grid";
import { MasonryImage } from "@/components/masonry-image";
import Image from "next/image";
import { getVideoThumbnailUrl } from "@/lib/video-utils";
import { notFound } from "next/navigation";

export default function PortfolioPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const router = useRouter();
  const portfolioItem = useQuery(api.portfolio.getBySlug, { slug });
  const assets = useQuery(api.assets.listPortfolio, portfolioItem ? { portfolioId: portfolioItem._id } : "skip");

  // Hooks must be called before any conditional returns
  const [currentIndex, setCurrentIndex] = useState(0);

  // Convert assets to masonry grid format
  // Note: src will be storageId - we need to convert it to URL in the component
  const masonryItems = (assets || [])
    .filter((asset) => asset.type !== "other") // Filter out "other" type items
    .map((asset) => ({
      id: asset._id,
      storageId: asset.videoUrl ? undefined : (asset.previewKey || asset.storageKey), // Only include storageId for non-external videos
      videoUrl: asset.videoUrl, // YouTube/Vimeo URL for embedded videos
      alt: asset.filename,
      type: asset.type as "video" | "image" | "pdf", // Type assertion since we filtered out "other"
      aspectRatio: asset.width && asset.height ? asset.width / asset.height : undefined,
    }));

  // Get all images and videos for hero carousel (both types show thumbnails)
  const heroItems = masonryItems.filter(item => item.type === "image" || (item.type === "video" && item.videoUrl));

  useEffect(() => {
    if (heroItems.length === 0) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % heroItems.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [heroItems.length]);

  // Handle ESC key to navigate back to home
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        // Use requestAnimationFrame to check after lightbox handler has had a chance to run
        requestAnimationFrame(() => {
          // Check if a lightbox is currently open (lightbox has z-50 class and bg-white)
          const lightbox = document.querySelector('.fixed.inset-0.z-50.bg-white');
          // Only navigate back if no lightbox is open
          if (!lightbox) {
            router.push("/");
          }
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [router]);

  // Handle loading state
  if (portfolioItem === undefined) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-foreground/70">Loading...</p>
        </div>
      </main>
    );
  }

  // Only show approved/delivered portfolio items publicly
  if (!portfolioItem || (portfolioItem.status !== "approved" && portfolioItem.status !== "delivered")) {
    notFound();
  }

  return (
    <>
      <Nav />
      <CloseButton />
      <main className="min-h-screen bg-background pt-16">
        {/* Hero Section with Carousel */}
        <section className="relative h-[60vh] w-full overflow-hidden bg-black">
          {heroItems.length > 0 ? (
            <>
              {heroItems.map((item, idx) => {
                // Get thumbnail URL for videos or use storageId for images
                const thumbnailUrl = item.type === "video" && item.videoUrl
                  ? getVideoThumbnailUrl(item.videoUrl)
                  : null;
                
                return (
                  <div
                    key={item.id}
                    className={`absolute inset-0 transition-opacity duration-1000 ${
                      idx === currentIndex ? "opacity-100" : "opacity-0"
                    }`}
                  >
                    {item.type === "video" && thumbnailUrl ? (
                      // Video thumbnail
                      <img
                        src={thumbnailUrl}
                        alt={item.alt || portfolioItem.title}
                        className="h-full w-full object-cover"
                      />
                    ) : item.storageId ? (
                      // Image from storage
                      <MasonryImage
                        storageId={item.storageId}
                        alt={item.alt || portfolioItem.title}
                        className="h-full w-full object-cover"
                      />
                    ) : null}
                    <div className="absolute inset-0 bg-black/50" />
                  </div>
                );
              })}
            </>
          ) : (
            <div className="absolute inset-0 bg-black/80" />
          )}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <h1 className="mb-2 text-5xl font-bold uppercase tracking-tight text-white md:text-6xl lg:text-7xl">
                {portfolioItem.title}
              </h1>
            </div>
          </div>
        </section>

        {/* Image Grid Section */}
        <section className="bg-white py-12">
          <div className="w-full px-4 sm:px-6 lg:px-8">
          {masonryItems.length > 0 ? (
            <MasonryGrid items={masonryItems} />
          ) : (
              <p className="text-center text-foreground/60">No images available.</p>
          )}
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-background py-8">
          <div className="mx-auto max-w-7xl px-6">
            <div className="flex flex-col items-center justify-center gap-4">
              <div className="flex items-center">
                <Image
                  src="/ic-wordmark-white.svg"
                  alt="Ian Courtright"
                  width={600}
                  height={150}
                  className="h-8 w-auto object-contain"
                />
              </div>
              <p className="text-sm text-white/60">
                © {new Date().getFullYear()} IAN COURTRIGHT. ALL RIGHTS RESERVED.
              </p>
            </div>
          </div>
        </footer>
      </main>
    </>
  );
}


