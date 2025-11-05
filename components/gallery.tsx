"use client";

import { useState } from "react";
import { PortraitsGalleryImage } from "@/components/portraits-gallery-image";
import { PortraitsLightbox } from "@/components/portraits-lightbox";

interface GalleryImage {
  _id: string;
  imageStorageId: string;
  alt?: string;
  width?: number;
  height?: number;
}

interface GalleryProps {
  galleryImages: GalleryImage[];
  title?: string;
  description?: string;
}

export function Gallery({ galleryImages, title = "Recent Work", description }: GalleryProps) {
  // Lightbox state
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentLightboxIndex, setCurrentLightboxIndex] = useState(0);

  const openLightbox = (index: number) => {
    setCurrentLightboxIndex(index);
    setLightboxOpen(true);
  };

  const handleNext = () => {
    setCurrentLightboxIndex((prev) => (prev + 1) % galleryImages.length);
  };

  const handlePrev = () => {
    setCurrentLightboxIndex((prev) => (prev - 1 + galleryImages.length) % galleryImages.length);
  };

  if (galleryImages.length === 0) {
    return null;
  }

  return (
    <>
      <div className="w-full">
        <div className="mb-6 sm:mb-8">
          <h2 className="mb-3 text-2xl font-black uppercase tracking-wide text-black sm:text-3xl md:text-4xl" style={{ fontWeight: '900' }}>
            {title}
          </h2>
          {description && (
            <p className="text-sm text-black/70 font-medium sm:text-base">
              {description}
            </p>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-3 md:gap-4 lg:gap-5 xl:gap-6" style={{ gridAutoRows: 'auto', gridAutoFlow: 'row dense' }}>
          {galleryImages.map((img, idx) => {
            const aspectRatio = img.width && img.height ? img.width / img.height : undefined;
            // Determine if image should span multiple columns/rows for better masonry layout
            const isExtraWide = aspectRatio && aspectRatio > 2.2;
            const isTall = aspectRatio && aspectRatio < 0.7;
            
            return (
              <div
                key={img._id}
                className={`group relative cursor-pointer overflow-hidden bg-black w-full ${
                  isExtraWide ? 'md:col-span-2' : ''
                } ${
                  isTall ? 'md:row-span-2' : ''
                }`}
                onClick={() => openLightbox(idx)}
              >
                <PortraitsGalleryImage
                  storageId={img.imageStorageId}
                  alt={img.alt || `${title} ${idx + 1}`}
                  aspectRatio={aspectRatio}
                  onClick={() => openLightbox(idx)}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Lightbox */}
      {lightboxOpen && galleryImages.length > 0 && (
        <PortraitsLightbox
          galleryImages={galleryImages}
          currentIndex={currentLightboxIndex}
          onClose={() => setLightboxOpen(false)}
          onNext={handleNext}
          onPrev={handlePrev}
        />
      )}
    </>
  );
}



