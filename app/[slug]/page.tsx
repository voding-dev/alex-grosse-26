"use client";

import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { HeroCarouselImage } from "@/components/hero-carousel-image";
import { Gallery } from "@/components/gallery";
import Image from "next/image";
import { use } from "react";

export default function LandingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  
  // Get landing page by slug
  const landingPage = useQuery(api.landingPages.getBySlug, { slug });
  
  // Get hero carousel images
  const heroCarouselImages = useQuery(
    api.landingPageHeroCarousel.list,
    landingPage ? { landingPageId: landingPage._id } : "skip"
  ) || [];
  
  // Get gallery images
  const galleryImages = useQuery(
    api.landingPageGallery.list,
    landingPage ? { landingPageId: landingPage._id } : "skip"
  ) || [];
  
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (heroCarouselImages.length === 0) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % heroCarouselImages.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [heroCarouselImages.length]);

  // If landing page not found, return 404
  if (landingPage === null) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-black uppercase tracking-wide text-foreground mb-4" style={{ fontWeight: '900' }}>
            Page Not Found
          </h1>
          <p className="text-foreground/70">
            The page you're looking for doesn't exist.
          </p>
        </div>
      </main>
    );
  }

  // Loading state
  if (!landingPage) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-foreground/70">Loading...</p>
        </div>
      </main>
    );
  }

  return (
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
            <div className="mb-3 flex items-center justify-center sm:mb-4">
              <Image
                src="/ic-wordmark-white.svg"
                alt="COURTRIGHT"
                width={600}
                height={150}
                className="h-16 w-auto object-contain sm:h-20 md:h-28 lg:h-36"
              />
            </div>
            <p className="px-4 text-base font-black uppercase text-white/90 sm:text-lg md:text-xl lg:text-2xl" style={{ fontWeight: '900' }}>
              {landingPage.heroText || "Professional Creative Services. Let's create something together."}
            </p>
          </div>
        </div>
      </section>

      {/* Prominent CTA Banner Section */}
      {(landingPage.calUrl || landingPage.stripeUrl) && (
        <section className="bg-gradient-to-br from-cta-primary via-[#1e6a8a] to-cta-primary py-12 sm:py-16 md:py-20">
          <div className="mx-auto w-full max-w-[2000px] px-4 sm:px-6 md:px-8 lg:px-16 xl:px-20 2xl:px-24">
            <div className="mx-auto max-w-4xl text-center">
              <h2 className="mb-4 text-3xl font-black uppercase tracking-wide text-white sm:text-4xl md:text-5xl" style={{ fontWeight: '900' }}>
                Ready to Get Started?
              </h2>
              <p className="mb-8 text-base text-white/90 font-medium sm:text-lg md:text-xl">
                Choose how you'd like to get started—book directly through Cal.com or secure your session with a deposit.
              </p>
              <div className="flex flex-col gap-4 sm:flex-row sm:justify-center sm:gap-6">
                {landingPage.calUrl && (
                  <button
                    onClick={() => window.open(landingPage.calUrl as string, "_blank")}
                    className="transform rounded-lg bg-white px-8 py-4 text-base font-bold uppercase tracking-wide text-cta-primary shadow-2xl transition-all hover:scale-105 hover:shadow-3xl sm:px-10 sm:py-5 sm:text-lg"
                  >
                    Book Session
                  </button>
                )}
                {landingPage.stripeUrl && (
                  <button
                    onClick={() => window.open(landingPage.stripeUrl as string, "_blank")}
                    className="transform rounded-lg border-2 border-white bg-transparent px-8 py-4 text-base font-bold uppercase tracking-wide text-white shadow-xl transition-all hover:scale-105 hover:bg-white/10 hover:shadow-2xl sm:px-10 sm:py-5 sm:text-lg"
                  >
                    Pay Deposit
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Booking & Gallery Section */}
      <section className="bg-white py-8 sm:py-12 md:py-16 lg:py-24">
        <div className="mx-auto w-full max-w-[2000px] px-4 sm:px-6 md:px-8 lg:px-16 xl:px-20 2xl:px-24">
          <div className="grid grid-cols-1 gap-8 sm:gap-10 md:gap-12 lg:grid-cols-[1.2fr_2.8fr] lg:gap-16 xl:gap-20 lg:items-center">
            {/* Left Column: How It Works & CTA */}
            <div className="lg:max-w-3xl flex flex-col justify-center">
              {/* How It Works Section */}
              {landingPage.howItWorksTitle || (landingPage.howItWorksSteps && landingPage.howItWorksSteps.length > 0) ? (
                <div className="mb-8 sm:mb-10">
                  <h2 className="mb-6 text-2xl font-black uppercase tracking-wide text-black sm:text-3xl" style={{ fontWeight: '900' }}>
                    {landingPage.howItWorksTitle || "How It Works"}
                  </h2>
                  <div className="space-y-6 sm:space-y-8">
                    {landingPage.howItWorksSteps && landingPage.howItWorksSteps.length > 0 ? (
                      landingPage.howItWorksSteps.map((step, idx) => (
                        <div key={idx} className="flex gap-4">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-cta-primary/10 text-xl font-black text-cta-primary sm:h-14 sm:w-14 sm:text-2xl" style={{ fontWeight: '900' }}>
                            {idx + 1}
                          </div>
                          <div>
                            <h3 className="mb-2 text-lg font-black uppercase tracking-wide text-black sm:text-xl" style={{ fontWeight: '900' }}>
                              {step.title}
                            </h3>
                            <p className="text-sm text-black/70 font-medium sm:text-base">
                              {step.description}
                            </p>
                          </div>
                        </div>
                      ))
                    ) : null}
                  </div>
                </div>
              ) : null}

              {/* Sticky CTA Box */}
              {(landingPage.calUrl || landingPage.stripeUrl) && (
                <div className="sticky top-24 rounded-xl border-2 border-cta-primary/30 bg-gradient-to-br from-cta-primary/5 to-cta-primary/10 p-6 shadow-lg sm:p-8">
                  <div className="mb-4 text-center sm:mb-6">
                    <h3 className="mb-2 text-xl font-black uppercase tracking-wide text-black sm:text-2xl" style={{ fontWeight: '900' }}>
                      Book Now
                    </h3>
                    <p className="text-xs text-black/70 font-medium sm:text-sm">
                      Quick booking options
                    </p>
                  </div>
                  <div className="flex flex-col gap-3 sm:gap-4">
                    {landingPage.calUrl && (
                      <button
                        onClick={() => window.open(landingPage.calUrl as string, "_blank")}
                        className="w-full rounded-lg bg-cta-primary px-6 py-3.5 text-sm font-bold uppercase tracking-wide text-white shadow-md transition-all hover:scale-105 hover:bg-[#1e6a8a] hover:shadow-lg sm:px-8 sm:py-4 sm:text-base"
                      >
                        Book Session
                      </button>
                    )}
                    {landingPage.stripeUrl && (
                      <button
                        onClick={() => window.open(landingPage.stripeUrl as string, "_blank")}
                        className="w-full rounded-lg border-2 border-cta-primary bg-white px-6 py-3.5 text-sm font-bold uppercase tracking-wide text-cta-primary shadow-md transition-all hover:scale-105 hover:bg-cta-primary/5 hover:shadow-lg sm:px-8 sm:py-4 sm:text-base"
                      >
                        Pay Deposit
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Gallery Section */}
            {galleryImages.length > 0 && (
              <Gallery
                galleryImages={galleryImages}
                title="Recent Work"
                description="View examples of our work. Click any image to view larger."
              />
            )}
          </div>
        </div>
      </section>

      {/* Services Section */}
      {landingPage.services && landingPage.services.length > 0 && (
        <section id="services" className="w-full">
          <div className="bg-cta-primary w-full px-0 overflow-hidden" style={{ paddingTop: '0', paddingBottom: '0' }}>
            <div className="w-full text-center">
              <h2 className="w-full font-black uppercase text-white" style={{ letterSpacing: '-0.02em', width: '100%', display: 'block', fontWeight: '900', lineHeight: '0.7', margin: '0', fontSize: 'clamp(4.5rem, 15vw, 26rem)' }}>
                SERVICES
              </h2>
            </div>
          </div>
          <div className="bg-white w-full">
            <div className="py-12 sm:py-16 md:py-20 w-full">
              <div className="mx-auto w-full max-w-[2000px] px-4 sm:px-6 md:px-8 lg:px-16 xl:px-20 2xl:px-24">
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:gap-8">
                  {landingPage.services.map((service, idx) => (
                    <div key={idx} className="rounded-lg border border-black/10 bg-white/50 p-6 sm:p-8">
                      <h3 className="mb-3 text-xl font-black uppercase tracking-wide text-black sm:text-2xl" style={{ fontWeight: '900' }}>
                        {service.title}
                      </h3>
                      <p className="text-sm text-black/70 font-medium sm:text-base">
                        {service.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="bg-background py-6 sm:py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex flex-col items-center justify-center gap-3 sm:gap-4">
            <div className="flex items-center">
              <Image
                src="/ic-brandmark-white.svg"
                alt="Ian Courtright"
                width={32}
                height={32}
                className="h-6 w-6 object-contain sm:h-8 sm:w-8"
              />
            </div>
            <p className="text-xs text-white/60 sm:text-sm">
              © {new Date().getFullYear()} IAN COURTRIGHT. ALL RIGHTS RESERVED.
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}




