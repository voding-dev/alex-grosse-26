"use client";

import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Nav } from "@/components/nav";
import { HeroCarouselImage } from "@/components/hero-carousel-image";
import { PortraitsGalleryImage } from "@/components/portraits-gallery-image";
import { Mail, Phone } from "lucide-react";
import Image from "next/image";

export default function GraphicDesignerPage() {
  // Get graphic designer hero carousel images
  const heroCarouselImages = useQuery(api.graphicDesignerHeroCarousel.list) || [];
  
  // Get graphic designer page content
  const graphicDesigner = useQuery(api.graphicDesigner.get);
  
  // Get all category galleries
  const allCategoryGalleries = useQuery(api.graphicDesignerCategoryGallery.list) || [];
  
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (heroCarouselImages.length === 0) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % heroCarouselImages.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [heroCarouselImages.length]);

  // Get categories from graphicDesigner
  // Note: Legacy menuItems support has been removed - all data should use categories structure
  const categories = graphicDesigner?.categories || [];

  // Get gallery images for a category
  const getCategoryGallery = (categoryId: string) => {
    return allCategoryGalleries.filter(img => img.categoryId === categoryId);
  };
  
  const heroTitle = graphicDesigner?.heroTitle || "DESIGN THAT STOPS TRAFFIC";
  const heroSubtitle = graphicDesigner?.heroSubtitle || "GRAPHIC DESIGN SERVICES";
  const heroText = graphicDesigner?.heroText || "Attention is the new currency. I design what gets noticed.";
  const contactEmail = graphicDesigner?.contactEmail || "hello@iancourtright.com";
  const contactPhone = graphicDesigner?.contactPhone || "(843) 847-0793";

  return (
    <>
      <Nav />
      <main className="min-h-screen bg-background">
        {/* Hero Section with Carousel */}
        <section className="relative h-[60vh] min-h-[400px] w-full overflow-hidden bg-black sm:h-[65vh] md:h-[70vh]">
          {heroCarouselImages.length > 0 ? (
            <>
              {heroCarouselImages.map((image, idx) => (
                <div
                  key={image._id}
                  className={`absolute inset-0 transition-opacity duration-1000 ${
                    idx === currentIndex ? "opacity-100" : "opacity-0"
                  }`}
                >
                  <HeroCarouselImage
                    storageId={image.imageStorageId}
                    alt={image.alt}
                    className="h-full w-full"
                  />
                  <div className="absolute inset-0 bg-black/60" />
                </div>
              ))}
            </>
          ) : (
            <div className="absolute inset-0 bg-black/80" />
          )}
          <div className="absolute inset-0 flex items-center justify-center px-4">
            <div className="text-center">
              <h1 className="mb-4 text-4xl font-black uppercase tracking-wide text-white sm:text-5xl md:text-6xl lg:text-7xl" style={{ fontWeight: '900' }}>
                {heroTitle}
              </h1>
              <p className="mb-2 text-xl font-black uppercase tracking-wide text-accent sm:text-2xl md:text-3xl" style={{ fontWeight: '900' }}>
                {heroSubtitle}
              </p>
              <p className="mt-8 text-base text-white/90 font-medium sm:text-lg max-w-2xl mx-auto">
                {heroText || "I design what gets noticed."}
              </p>
            </div>
          </div>
        </section>

        {/* Menu Sections */}
        <section className="py-12 sm:py-16 md:py-20">
          <div className="mx-auto w-full max-w-[2000px] px-4 sm:px-6 md:px-8 lg:px-16 xl:px-20 2xl:px-24">
            <div className="mx-auto max-w-5xl space-y-16">
              
              {categories.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-lg text-foreground/70 font-medium">
                    No categories available. Please add categories in the admin panel.
                  </p>
                </div>
              ) : (
                categories.map((category) => {
                  const categoryGallery = getCategoryGallery(category.id);
                  
                  return (
                    <div key={category.id}>
                      <h2 className="mb-8 text-2xl font-black uppercase tracking-wide text-foreground sm:text-3xl md:text-4xl" style={{ fontWeight: '900' }}>
                        {category.name}
                      </h2>
                      
                      {/* Services */}
                      {category.items.length > 0 ? (
                        <div className="space-y-6 border-t border-foreground/10 pt-6">
                          {category.items.map((item, idx) => (
                            <div key={idx} className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 pb-6 border-b border-foreground/5 last:border-b-0">
                              <div className="flex-1">
                                <h3 className="mb-2 text-lg font-black uppercase tracking-wide text-foreground sm:text-xl" style={{ fontWeight: '900' }}>
                                  {item.name}
                                </h3>
                                <p className="text-sm text-foreground/70 font-medium sm:text-base">
                                  {item.description}
                                </p>
                              </div>
                              <div className="sm:ml-6 sm:shrink-0">
                                <p className="text-base text-accent font-semibold sm:text-lg whitespace-nowrap">
                                  {item.price}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : null}
                      
                      {/* Gallery */}
                      {categoryGallery.length > 0 && (
                        <div className="mt-8">
                          <div className="grid grid-cols-3 gap-4">
                            {categoryGallery.slice(0, 3).map((image) => (
                              <div
                                key={image._id}
                                className="relative aspect-square overflow-hidden bg-black rounded-lg"
                              >
                                <PortraitsGalleryImage
                                  storageId={image.imageStorageId}
                                  alt={image.alt || `${category.name} gallery`}
                                  onClick={() => {}}
                                  aspectRatio={image.width && image.height ? image.width / image.height : undefined}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}

            </div>
          </div>
        </section>

        {/* Value Proposition Section */}
        <section className="border-t border-foreground/10 bg-accent py-12 sm:py-16 md:py-20">
          <div className="mx-auto w-full max-w-[2000px] px-4 sm:px-6 md:px-8 lg:px-16 xl:px-20 2xl:px-24">
            <div className="mx-auto max-w-4xl">
              <h2 className="mb-6 text-3xl font-black uppercase tracking-wide text-black sm:text-4xl md:text-5xl text-center" style={{ fontWeight: '900' }}>
                {graphicDesigner?.valuePropositionTitle || "WHY ANY OF THIS MATTERS"}
              </h2>
              <p className="mb-8 text-lg text-black/90 font-medium sm:text-xl text-center max-w-3xl mx-auto">
                {graphicDesigner?.valuePropositionDescription || "Your brand competes for attention every second. Generic design gets ignored. Work that stops traffic gets remembered—and gets results."}
              </p>
              
              {graphicDesigner?.valuePropositionFeatures && graphicDesigner.valuePropositionFeatures.length > 0 ? (
                <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-3 mt-12">
                  {graphicDesigner.valuePropositionFeatures.map((feature, idx) => (
                    <div key={idx} className="text-center">
                      <h3 className="mb-3 text-xl font-black uppercase tracking-wide text-black sm:text-2xl" style={{ fontWeight: '900' }}>
                        {feature.title}
                      </h3>
                      <p className="text-base text-black/80 font-medium">
                        {feature.description}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-3 mt-12">
                  <div className="text-center">
                    <h3 className="mb-3 text-xl font-black uppercase tracking-wide text-black sm:text-2xl" style={{ fontWeight: '900' }}>
                      FAST TURNAROUND
                    </h3>
                    <p className="text-base text-black/80 font-medium">
                      Same-day delivery when possible. Get your designs when you need them, not when it's convenient for someone else.
                    </p>
                  </div>
                  <div className="text-center">
                    <h3 className="mb-3 text-xl font-black uppercase tracking-wide text-black sm:text-2xl" style={{ fontWeight: '900' }}>
                      PRINT-READY FILES
                    </h3>
                    <p className="text-base text-black/80 font-medium">
                      Every file formatted and ready to go. No headaches, no delays. Just professional results you can use immediately.
                    </p>
                  </div>
                  <div className="text-center">
                    <h3 className="mb-3 text-xl font-black uppercase tracking-wide text-black sm:text-2xl" style={{ fontWeight: '900' }}>
                      TRANSPARENT PRICING
                    </h3>
                    <p className="text-base text-black/80 font-medium">
                      Clear pricing that scales with complexity. No surprises, no hidden fees. Know what you're investing before you commit.
                    </p>
                  </div>
                </div>
              )}
              
              <div className="mt-12 text-center">
                <p className="text-lg font-black uppercase tracking-wide text-black sm:text-xl mb-4" style={{ fontWeight: '900' }}>
                  {graphicDesigner?.ctaTitle || "READY TO STAND OUT?"}
                </p>
                {(graphicDesigner?.calUrl || graphicDesigner?.stripeUrl) ? (
                  <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                    {graphicDesigner.calUrl && (
                      <button
                        onClick={() => window.open(graphicDesigner.calUrl as string, "_blank")}
                        className="w-full sm:w-auto min-w-[200px] rounded-lg bg-black px-8 py-4 text-base font-black uppercase tracking-wide text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl sm:text-lg"
                        style={{ fontWeight: '900' }}
                      >
                        Book Session
                      </button>
                    )}
                    {graphicDesigner.stripeUrl && (
                      <button
                        onClick={() => window.open(graphicDesigner.stripeUrl as string, "_blank")}
                        className="w-full sm:w-auto min-w-[200px] rounded-lg border-2 border-black bg-transparent px-8 py-4 text-base font-black uppercase tracking-wide text-black shadow-lg transition-all hover:scale-105 hover:bg-black/10 hover:shadow-xl sm:text-lg"
                        style={{ fontWeight: '900' }}
                      >
                        Pay Deposit
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
                    <a
                      href={`mailto:${contactEmail}`}
                      className="flex items-center gap-2 text-base font-medium text-black transition-opacity hover:opacity-80 sm:text-lg"
                    >
                      <Mail className="h-5 w-5" />
                      {contactEmail}
                    </a>
                    <span className="hidden text-black/40 sm:inline">•</span>
                    <a
                      href={`tel:${contactPhone.replace(/[^\d+]/g, '')}`}
                      className="flex items-center gap-2 text-base font-medium text-black transition-opacity hover:opacity-80 sm:text-lg"
                    >
                      <Phone className="h-5 w-5" />
                      {contactPhone}
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>


        {/* Footer */}
        <footer className="bg-background py-6 sm:py-8">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="flex flex-col items-center justify-center gap-3 sm:gap-4">
              <div className="flex items-center">
                <Image
                  src="/ic-wordmark-white.svg"
                  alt="Ian Courtright"
                  width={600}
                  height={150}
                  className="h-8 w-auto object-contain sm:h-10"
                />
              </div>
              <p className="text-xs text-white/60 sm:text-sm">
                © {new Date().getFullYear()} IAN COURTRIGHT. ALL RIGHTS RESERVED.
              </p>
            </div>
          </div>
        </footer>

      </main>
    </>
  );
}
