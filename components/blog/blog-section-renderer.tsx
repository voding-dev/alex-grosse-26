"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { BookingModal } from "@/components/booking-modal";
import { ExternalLink } from "lucide-react";
import { Lightbox } from "@/components/lightbox";

interface BlogSectionRendererProps {
  section: {
    _id: string;
    type: "text" | "image" | "gallery" | "cta_booking" | "cta_stripe";
    textContent?: string;
    imageStorageId?: string;
    imageAlt?: string;
    imageCaption?: string;
    imageWidth?: number;
    imageHeight?: number;
    galleryImages?: Array<{
      storageId: string;
      alt?: string;
      caption?: string;
    }>;
    ctaHeading?: string;
    ctaDescription?: string;
    bookingToken?: string;
    stripeUrl?: string;
  };
}

export function BlogSectionRenderer({ section }: BlogSectionRendererProps) {
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // Get image URL for image sections
  const imageUrl = useQuery(
    api.storageQueries.getUrl,
    section.type === "image" && section.imageStorageId
      ? { storageId: section.imageStorageId }
      : "skip"
  );

  // Get gallery image URLs
  const galleryUrls = useQuery(
    api.storageQueries.getUrls,
    section.type === "gallery" && section.galleryImages
      ? { storageIds: section.galleryImages.map((img) => img.storageId) }
      : "skip"
  );

  if (section.type === "text") {
    const proseClasses = [
      "prose prose-lg max-w-none",
      "prose-headings:font-black prose-headings:uppercase prose-headings:tracking-tight prose-headings:text-black",
      "prose-h1:text-4xl sm:prose-h1:text-5xl md:prose-h1:text-6xl prose-h1:mb-8 prose-h1:mt-16 prose-h1:leading-tight",
      "prose-h2:text-3xl sm:prose-h2:text-4xl md:prose-h2:text-5xl prose-h2:mb-6 prose-h2:mt-12 prose-h2:leading-tight",
      "prose-h3:text-2xl sm:prose-h3:text-3xl md:prose-h3:text-4xl prose-h3:mb-5 prose-h3:mt-10 prose-h3:leading-snug",
      "prose-p:text-lg prose-p:leading-relaxed prose-p:mb-6 prose-p:text-black/80",
      "prose-a:text-accent prose-a:font-bold prose-a:no-underline hover:prose-a:text-accent/80 hover:prose-a:underline",
      "prose-strong:text-black prose-strong:font-black",
      "prose-blockquote:border-l-4 prose-blockquote:border-accent prose-blockquote:pl-6 prose-blockquote:italic prose-blockquote:text-black/70 prose-blockquote:text-xl",
      "prose-code:bg-black/5 prose-code:text-black prose-code:px-2 prose-code:py-1 prose-code:rounded prose-code:font-semibold",
      "prose-ul:list-disc prose-ul:pl-6 prose-ul:text-black/80",
      "prose-ol:list-decimal prose-ol:pl-6 prose-ol:text-black/80",
      "prose-li:mb-2"
    ].join(" ");

    return (
      <div className="blog-text-section">
        <style jsx>{`
          .blog-text-section :global(ul),
          .blog-text-section :global(ol) {
            list-style-position: outside !important;
            margin-left: 1.5rem !important;
            margin-bottom: 1.5rem !important;
          }
          .blog-text-section :global(ul) {
            list-style-type: disc !important;
          }
          .blog-text-section :global(ol) {
            list-style-type: decimal !important;
          }
          .blog-text-section :global(li) {
            display: list-item !important;
            margin-bottom: 0.5rem !important;
          }
          .blog-text-section :global(li p) {
            margin-bottom: 0.25rem !important;
          }
        `}</style>
        <div
          className={proseClasses}
          dangerouslySetInnerHTML={{ __html: section.textContent || "" }}
        />
      </div>
    );
  }

  if (section.type === "image") {
    if (!imageUrl) {
      return (
        <div className="animate-pulse bg-black/5 rounded-xl h-96 w-full" />
      );
    }

    return (
      <figure className="my-12">
        <div
          className="relative w-full rounded-xl overflow-hidden cursor-pointer hover:opacity-95 transition-all shadow-lg hover:shadow-2xl"
          onClick={() => {
            setLightboxIndex(0);
            setLightboxOpen(true);
          }}
        >
          <Image
            src={imageUrl}
            alt={section.imageAlt || ""}
            width={section.imageWidth || 1200}
            height={section.imageHeight || 800}
            className="w-full h-auto"
          />
        </div>
        {section.imageCaption && (
          <figcaption className="mt-4 text-base text-black/60 text-center italic font-medium">
            {section.imageCaption}
          </figcaption>
        )}
        
        {lightboxOpen && (
          <Lightbox
            images={[{ id: section._id, src: imageUrl, alt: section.imageAlt || "", type: "image" as const }]}
            currentIndex={0}
            onClose={() => setLightboxOpen(false)}
            onNext={() => {}}
            onPrev={() => {}}
          />
        )}
      </figure>
    );
  }

  if (section.type === "gallery") {
    if (!galleryUrls || galleryUrls.length === 0) {
      return (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6 my-12">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse bg-black/5 rounded-xl h-64 w-full" />
          ))}
        </div>
      );
    }

    const images = section.galleryImages?.map((img, idx) => ({
      id: `${section._id}-${idx}`,
      src: galleryUrls[idx] || "",
      alt: img.alt || "",
      type: "image" as const,
    })).filter(img => img.src) || [];

    return (
      <div className="my-12">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
          {section.galleryImages?.map((img, idx) => {
            const url = galleryUrls[idx];
            if (!url) return null;
            
            return (
              <div
                key={idx}
                className="relative aspect-square rounded-xl overflow-hidden cursor-pointer hover:opacity-95 transition-all shadow-lg hover:shadow-2xl"
                onClick={() => {
                  setLightboxIndex(idx);
                  setLightboxOpen(true);
                }}
              >
                <Image
                  src={url}
                  alt={img.alt || ""}
                  fill
                  className="object-cover"
                />
              </div>
            );
          })}
        </div>

        {lightboxOpen && (
          <Lightbox
            images={images}
            currentIndex={lightboxIndex}
            onClose={() => setLightboxOpen(false)}
            onNext={() => setLightboxIndex((prev) => (prev + 1) % images.length)}
            onPrev={() => setLightboxIndex((prev) => (prev - 1 + images.length) % images.length)}
          />
        )}
      </div>
    );
  }

  if (section.type === "cta_booking") {
    return (
      <div className="my-16 p-10 sm:p-12 bg-accent/20 border-4 border-accent rounded-2xl text-center shadow-xl">
        <h3 className="text-3xl sm:text-4xl font-black uppercase tracking-tight mb-6 text-black" style={{ fontWeight: '900', letterSpacing: '-0.01em' }}>
          {section.ctaHeading || "Book a Session"}
        </h3>
        {section.ctaDescription && (
          <p className="text-lg sm:text-xl text-black/70 mb-8 max-w-2xl mx-auto font-medium">
            {section.ctaDescription}
          </p>
        )}
        <Button
          onClick={() => setBookingModalOpen(true)}
          className="font-black uppercase tracking-wider px-8 py-6 text-lg h-auto"
          style={{ backgroundColor: '#FFA617', fontWeight: '900', color: 'white' }}
        >
          Schedule Now
        </Button>

        {section.bookingToken && (
          <BookingModal
            bookingToken={section.bookingToken}
            open={bookingModalOpen}
            onOpenChange={setBookingModalOpen}
          />
        )}
      </div>
    );
  }

  if (section.type === "cta_stripe") {
    return (
      <div className="my-16 p-10 sm:p-12 bg-accent/20 border-4 border-accent rounded-2xl text-center shadow-xl">
        <h3 className="text-3xl sm:text-4xl font-black uppercase tracking-tight mb-6 text-black" style={{ fontWeight: '900', letterSpacing: '-0.01em' }}>
          {section.ctaHeading || "Get Started"}
        </h3>
        {section.ctaDescription && (
          <p className="text-lg sm:text-xl text-black/70 mb-8 max-w-2xl mx-auto font-medium">
            {section.ctaDescription}
          </p>
        )}
        <Button
          onClick={() => {
            if (section.stripeUrl) {
              window.open(section.stripeUrl, '_blank');
            }
          }}
          className="font-black uppercase tracking-wider px-8 py-6 text-lg h-auto"
          style={{ backgroundColor: '#FFA617', fontWeight: '900', color: 'white' }}
        >
          <ExternalLink className="h-4 w-4 mr-2" />
          Purchase Now
        </Button>
      </div>
    );
  }

  return null;
}

