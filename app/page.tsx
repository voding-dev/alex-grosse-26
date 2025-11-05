"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Nav } from "@/components/nav";
import { PortfolioProjectCard } from "@/components/portfolio-project-card";
import { AboutImage } from "@/components/about-image";
import { HeroCarouselImage } from "@/components/hero-carousel-image";
import Image from "next/image";
import { useState, useEffect } from "react";

export default function Home() {
  // Get Homepage content (includes project selections)
  const homepage = useQuery(api.homepage.get);
  
  // Get portfolio items - separate bucket, completely independent from projects
  const portfolioItems = useQuery(api.portfolio.listPublic) || [];
  
  // Get all public projects - only approved/delivered (separate bucket)
  const publicProjects = useQuery(api.projects.listPublic) || [];
  
  // Get hero carousel images
  const heroCarouselImages = useQuery(api.heroCarousel.list) || [];
  
  // Portfolio section uses portfolio items (separate from projects)
  const portfolioProjects = portfolioItems;
  
  // Projects section uses projects (separate from portfolio)
  const projectsSection = publicProjects;
  
  // Get About section content
  const about = useQuery(api.about.get);
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [arrowOpacity, setArrowOpacity] = useState(1);

  useEffect(() => {
    if (heroCarouselImages.length === 0) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % heroCarouselImages.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [heroCarouselImages.length]);

  useEffect(() => {
    const handleScroll = () => {
      const heroSection = document.querySelector('section:first-of-type');
      if (heroSection) {
        const heroRect = heroSection.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const heroBottom = heroRect.bottom;
        
        // Calculate opacity based on how much of hero is visible
        // Fade out when hero bottom is less than viewport height
        // Start fading when hero bottom is below 80% of viewport
        const fadeStart = viewportHeight * 0.8;
        const fadeEnd = 0;
        
        if (heroBottom <= fadeStart) {
          // Fade out as hero scrolls up
          const opacity = Math.max(0, Math.min(1, (heroBottom - fadeEnd) / (fadeStart - fadeEnd)));
          setArrowOpacity(opacity);
        } else {
          // Fully visible when hero is fully in view
          setArrowOpacity(1);
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Check initial state
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);


  return (
    <>
      <Nav />
      <main className="min-h-screen bg-background pt-20">
        {/* Hero Section with Carousel */}
        <section className="relative h-screen w-full overflow-hidden bg-black">
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
                {homepage?.heroText || "Creative Director & Growth Marketing Partner"}
              </p>
            </div>
          </div>
          
          {/* Scroll Down Arrow */}
          {arrowOpacity > 0 && (
            <button
              onClick={() => {
                const portfolioSection = document.getElementById('portfolio');
                if (portfolioSection) {
                  portfolioSection.scrollIntoView({ behavior: 'smooth' });
                }
              }}
              className="absolute bottom-6 sm:bottom-8 md:bottom-12 left-1/2 -translate-x-1/2 z-10 text-white/90 hover:text-white transition-opacity duration-300 cursor-pointer pointer-events-auto"
              style={{ opacity: arrowOpacity }}
              aria-label="Scroll to next section"
            >
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 drop-shadow-lg"
              style={{
                animation: 'bounceTransform 2s ease-in-out infinite',
              }}
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
          )}
        </section>

        {/* PORTFOLIO Section */}
        <section id="portfolio" className="w-full">
          <div className="bg-accent w-full px-0 overflow-hidden" style={{ paddingTop: '0', paddingBottom: '0' }}>
            <div className="w-full text-center">
              <h2 className="w-full font-black uppercase text-white" style={{ letterSpacing: '-0.02em', width: '100%', display: 'block', fontWeight: '900', lineHeight: '0.7', margin: '0', fontSize: 'clamp(4.5rem, 15vw, 26rem)' }}>
                PORTFOLIO
              </h2>
            </div>
          </div>
          <div className="bg-white w-full">
            <div className="pt-12 pb-12 sm:pt-16 sm:pb-16 md:pt-20 md:pb-20 lg:pt-24 lg:pb-24 w-full">
              {portfolioProjects.length > 0 ? (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 w-full px-4 sm:px-6 lg:px-8">
                  {portfolioProjects.map((item) => (
                    <PortfolioProjectCard
                      key={item._id}
                      id={item._id}
                      slug={item.slug}
                      title={item.title}
                      clientName={item.clientName}
                      isPortfolio={true}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-center text-foreground/60">No portfolio items yet.</p>
              )}
            </div>
          </div>
        </section>

        {/* PROJECTS Section */}
        <section id="projects" className="w-full">
          <div className="bg-accent w-full px-0 overflow-hidden" style={{ paddingTop: '0', paddingBottom: '0' }}>
            <div className="w-full text-center">
              <h2 className="w-full font-black uppercase text-white" style={{ letterSpacing: '-0.02em', width: '100%', display: 'block', fontWeight: '900', lineHeight: '0.7', margin: '0', fontSize: 'clamp(4.5rem, 15vw, 26rem)' }}>
                PROJECTS
              </h2>
            </div>
          </div>
          <div className="bg-white w-full">
            <div className="pt-12 pb-12 sm:pt-16 sm:pb-16 md:pt-20 md:pb-20 lg:pt-24 lg:pb-24 w-full">
              {projectsSection.length > 0 ? (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 w-full px-4 sm:px-6 lg:px-8">
                  {projectsSection.map((project) => (
                    <PortfolioProjectCard
                      key={project._id}
                      id={project._id}
                      slug={project.slug}
                      title={project.title}
                      clientName={project.clientName}
                      isPortfolio={false}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-center text-foreground/60">No projects yet.</p>
              )}
            </div>
          </div>
        </section>

        {/* Middle Name Section */}
        <section className="bg-accent w-full" style={{ padding: '0', paddingTop: '0', paddingBottom: '0', marginTop: 'clamp(-1.5rem, -6vw, -4rem)', marginBottom: 'clamp(-0.5rem, -2vw, -1.5rem)', marginLeft: '0', marginRight: '0', lineHeight: '0', fontSize: '0', overflow: 'hidden', height: 'fit-content' }}>
          <Image
            src="/ic-wordmark-white.svg"
            alt="COURTRIGHT"
            width={1200}
            height={300}
            className="w-full"
            style={{ 
              height: 'clamp(3.5rem, 9vw, 13rem)',
              width: '100%',
              display: 'block',
              margin: '0',
              marginTop: 'clamp(-1rem, -3vw, -2rem)',
              padding: '0',
              border: 'none',
              outline: 'none',
              lineHeight: '0',
              fontSize: '0',
              objectFit: 'contain',
              objectPosition: 'center bottom'
            }}
          />
        </section>

        {/* ABOUT ME Section */}
        <section id="about" className="bg-white py-12 sm:py-16 md:py-20 lg:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 gap-8 sm:gap-10 md:gap-12 lg:grid-cols-[1.5fr_1.5fr_1fr] lg:gap-12 lg:items-stretch">
              {/* Left Column - Image */}
              <div className="relative overflow-hidden bg-black w-full max-w-sm mx-auto lg:max-w-none lg:mx-0 lg:h-full lg:flex lg:items-center">
                <AboutImage storageId={about?.imageStorageId} className="w-full h-auto lg:h-full lg:w-auto lg:object-cover" />
              </div>

              {/* Middle Column - Text */}
              <div className="space-y-8 sm:space-y-10 md:space-y-12 lg:flex lg:flex-col lg:justify-center">
                {(about?.heading || about?.bio) && (
                  <div>
                    {about?.heading && (
                      <div className="mb-4 sm:mb-6">
                        <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-wide text-black md:text-4xl" style={{ fontWeight: '900' }}>
                          {about.heading}
                        </h2>
                      </div>
                    )}
                    {about?.bio && (
                      <div className="space-y-3 sm:space-y-4 text-black font-medium leading-relaxed text-sm sm:text-base">
                        <div className="whitespace-pre-line">{about.bio}</div>
                      </div>
                    )}
                  </div>
                )}

                {about?.littleBits && (
                  <div>
                    <h3 className="mb-3 sm:mb-4 text-lg sm:text-xl font-black uppercase tracking-wide text-black" style={{ fontWeight: '900' }}>
                      {about.littleBitsHeading || "LITTLE BITS"}
                    </h3>
                    <p className="text-black font-medium leading-relaxed whitespace-pre-line text-sm sm:text-base">
                      {about.littleBits}
                    </p>
                  </div>
                )}

                {about?.awards && about.awards.length > 0 && (
                  <div>
                    <h3 className="mb-3 sm:mb-4 text-lg sm:text-xl font-black uppercase tracking-wide text-black" style={{ fontWeight: '900' }}>
                      {about.awardsHeading || "AWARDS"}
                    </h3>
                    <ul className="space-y-2 text-black font-medium text-sm sm:text-base">
                      {about.awards.map((award, index) => (
                        <li key={index}>• {award}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Right Column - Client List & Contact Info */}
              <div className="space-y-8 sm:space-y-10 md:space-y-12 lg:flex lg:flex-col lg:justify-center">
                {about?.clientList && about.clientList.length > 0 && (
                  <div>
                    <h3 className="mb-3 sm:mb-4 text-lg sm:text-xl font-black uppercase tracking-wide text-black" style={{ fontWeight: '900' }}>
                      {about.clientListHeading || "PARTIAL CLIENT LIST"}
                    </h3>
                    <ul className="space-y-2 text-black font-medium text-sm sm:text-base">
                      {about.clientList.map((client, index) => (
                        <li key={index}>• {client}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* My Companies */}
                <div className="space-y-4 sm:space-y-6">
                  <h3 className="mb-3 sm:mb-4 text-lg sm:text-xl font-black uppercase tracking-wide text-black" style={{ fontWeight: '900' }}>
                    MY COMPANIES
                  </h3>
                  <div className="flex flex-col gap-4 sm:gap-5 items-start">
                    <div className="flex items-center gap-3">
                      <a 
                        href="https://styledriven.com" 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="inline-block border border-black/20 rounded-md p-1.5 transition-opacity hover:border-black/40 hover:shadow-md hover:opacity-70"
                      >
                        <Image
                          src="/style-driven-logo-dark.svg"
                          alt="Style Driven"
                          width={300}
                          height={60}
                          className="h-4 w-auto sm:h-5"
                        />
                      </a>
                      <span className="text-black font-medium text-sm sm:text-base">- production house</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <a 
                        href="https://voding.dev" 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="inline-block border border-black/20 rounded-md p-1.5 transition-opacity hover:border-black/40 hover:shadow-md hover:opacity-70"
                      >
                        <Image
                          src="/voding-logo-dark.svg"
                          alt="Voding"
                          width={200}
                          height={60}
                          className="h-4 w-auto sm:h-5"
                        />
                      </a>
                      <span className="text-black font-medium text-sm sm:text-base">- software development</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CONTACT Section */}
        <section id="contact" className="w-full">
          <div className="bg-accent w-full px-0 overflow-hidden" style={{ paddingTop: '0', paddingBottom: '0' }}>
            <div className="w-full text-center">
              <h2 className="w-full font-black uppercase text-white" style={{ letterSpacing: '-0.02em', width: '100%', display: 'block', fontWeight: '900', lineHeight: '0.7', margin: '0', fontSize: 'clamp(4.5rem, 15vw, 26rem)' }}>
                CONTACT
              </h2>
            </div>
          </div>
          <div className="bg-white py-24">
            <div className="mx-auto max-w-7xl px-6">
              <div className="mx-auto grid grid-cols-1 gap-12 lg:grid-cols-2 lg:items-center lg:max-w-4xl">
                {/* Left Column - Text */}
                <div className="space-y-6 lg:flex lg:flex-col lg:justify-center">
                  {homepage?.contactHeading && (
                    <div className="mb-6">
                      <h2 className="text-3xl font-black uppercase tracking-wide text-black md:text-4xl" style={{ fontWeight: '900' }}>
                        {homepage.contactHeading}
                      </h2>
                    </div>
                  )}
                  {homepage?.contactText && (
                    <p className="text-black font-medium leading-relaxed whitespace-pre-line">
                      {homepage.contactText}
                    </p>
                  )}
                  {(homepage?.contactEmail || homepage?.contactPhone || homepage?.contactInstagramUrl || homepage?.contactLinkedinUrl) && (
                    <div className="space-y-6 pt-2">
                      <div className="space-y-3">
                        {homepage?.contactEmail && (
                          <div>
                            <a href={`mailto:${homepage.contactEmail}`} className="text-base sm:text-lg text-black hover:text-black/70 transition-colors font-semibold block">
                              {homepage.contactEmail.toUpperCase()}
                            </a>
                          </div>
                        )}
                        {homepage?.contactPhone && (
                          <div>
                            <a href={`tel:${homepage.contactPhone.replace(/[^\d+]/g, '')}`} className="text-base sm:text-lg text-black hover:text-black/70 transition-colors font-semibold block">
                              {homepage.contactPhone}
                            </a>
                          </div>
                        )}
                      </div>
                      {(homepage?.contactInstagramUrl || homepage?.contactLinkedinUrl) && (
                        <div className="pt-2 border-t border-black/10">
                          <div className="flex gap-4">
                            {homepage?.contactInstagramUrl && (
                              <a href={homepage.contactInstagramUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-black/70 hover:text-black transition-colors font-bold">INSTAGRAM</a>
                            )}
                            {homepage?.contactLinkedinUrl && (
                              <a href={homepage.contactLinkedinUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-black/70 hover:text-black transition-colors font-bold">LINKEDIN</a>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Right Column - Form */}
                <div>
                  {homepage?.formHeading && (
                    <h3 className="mb-6 text-xl font-black uppercase tracking-wide text-black" style={{ fontWeight: '900' }}>
                      {homepage.formHeading}
                    </h3>
                  )}
                  <form className="space-y-4">
                    <div>
                      <input
                        type="text"
                        placeholder="Name"
                        className="w-full border-b border-black/20 bg-transparent px-0 py-2 text-sm text-black placeholder:text-black/50 focus:border-black/40 focus:outline-none"
                      />
                    </div>
                    <div>
                      <input
                        type="email"
                        placeholder="Email"
                        className="w-full border-b border-black/20 bg-transparent px-0 py-2 text-sm text-black placeholder:text-black/50 focus:border-black/40 focus:outline-none"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        placeholder="Subject"
                        className="w-full border-b border-black/20 bg-transparent px-0 py-2 text-sm text-black placeholder:text-black/50 focus:border-black/40 focus:outline-none"
                      />
                    </div>
                    <div>
                      <textarea
                        placeholder="Message"
                        rows={6}
                        className="w-full border-b border-black/20 bg-transparent px-0 py-2 text-sm text-black placeholder:text-black/50 focus:border-black/40 focus:outline-none"
                      />
                    </div>
                    <button
                      type="submit"
                      className="mt-4 px-8 py-3 text-sm font-medium uppercase tracking-wide text-white transition-opacity hover:opacity-90"
                      style={{ backgroundColor: 'var(--cta-primary)' }}
                    >
                      SEND MESSAGE
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-background py-8">
          <div className="mx-auto max-w-7xl px-6">
            <div className="flex flex-col items-center justify-center gap-4">
              <div className="flex items-center">
                <Image
                  src="/ic-brandmark-white.svg"
                  alt="Ian Courtright"
                  width={32}
                  height={32}
                  className="h-8 w-8 object-contain"
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
