"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Nav } from "@/components/nav";
import { PortfolioProjectCard } from "@/components/portfolio-project-card";
import { AboutImage } from "@/components/about-image";
import { HeroCarouselImage } from "@/components/hero-carousel-image";
import { PhoneInput } from "@/components/ui/phone-input";
import { EmailInput } from "@/components/ui/email-input";
import { NameInput } from "@/components/ui/name-input";
import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";

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

  // Contact form state
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
    honeypot: "", // Hidden field for spam protection
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showThankYou, setShowThankYou] = useState(false);
  const { toast } = useToast();
  const submitContactForm = useMutation(api.contacts.submitContactForm);

  // Handle contact form submission
  const handleContactFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.name || !formData.email || !formData.phone || !formData.message) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      await submitContactForm({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        message: formData.message,
        honeypot: formData.honeypot,
      });

      // Clear form
      setFormData({
        name: "",
        email: "",
        phone: "",
        message: "",
        honeypot: "",
      });

      // Show thank you modal
      setShowThankYou(true);

      // Auto-dismiss after 3 seconds
      setTimeout(() => {
        setShowThankYou(false);
      }, 3000);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

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
      <main className="min-h-screen bg-background pt-24">
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
          <div className="absolute inset-0 flex items-center justify-center px-6 sm:px-8 md:px-12">
            <div className="text-center max-w-6xl">
              <h1 
                className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-extrabold uppercase text-white leading-tight"
                style={{ 
                  fontWeight: '800', 
                  letterSpacing: '-0.03em', 
                  lineHeight: '1.1',
                  textShadow: '0 4px 30px rgba(0, 0, 0, 0.5), 0 2px 10px rgba(0, 0, 0, 0.3)'
                }}
              >
                {homepage?.heroText || "Creative Director & Growth Marketing Partner"}
              </h1>
              <div className="mt-6 sm:mt-8 flex justify-center">
                <div className="h-1 w-24 sm:w-32 bg-accent rounded-full" />
              </div>
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
          <div className="bg-accent w-full px-0 overflow-hidden flex items-center justify-center" style={{ paddingTop: 'clamp(0.25rem, 0.5vw, 0.5rem)', paddingBottom: 'clamp(0.25rem, 0.5vw, 0.5rem)' }}>
            <div className="w-full text-center flex items-center justify-center">
              <h2 className="w-full font-black uppercase text-white" style={{ letterSpacing: '-0.02em', width: '100%', display: 'block', fontWeight: '900', lineHeight: '0.85', margin: '0', fontSize: 'clamp(5.5rem, 18vw, 30rem)', transform: 'translateY(0.035em)' }}>
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
          <div className="bg-accent w-full px-0 overflow-hidden flex items-center justify-center" style={{ paddingTop: 'clamp(0.25rem, 0.5vw, 0.5rem)', paddingBottom: 'clamp(0.25rem, 0.5vw, 0.5rem)' }}>
            <div className="w-full text-center flex items-center justify-center">
              <h2 className="w-full font-black uppercase text-white" style={{ letterSpacing: '-0.02em', width: '100%', display: 'block', fontWeight: '900', lineHeight: '0.85', margin: '0', fontSize: 'clamp(5.5rem, 18vw, 30rem)', transform: 'translateY(0.035em)' }}>
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

        {/* ABOUT Section Header */}
        <section id="about" className="w-full">
          <div className="bg-accent w-full px-0 overflow-hidden flex items-center justify-center" style={{ paddingTop: 'clamp(0.25rem, 0.5vw, 0.5rem)', paddingBottom: 'clamp(0.25rem, 0.5vw, 0.5rem)' }}>
            <div className="w-full text-center flex items-center justify-center">
              <h2 className="w-full font-black uppercase text-white" style={{ letterSpacing: '-0.02em', width: '100%', display: 'block', fontWeight: '900', lineHeight: '0.85', margin: '0', fontSize: 'clamp(5.5rem, 18vw, 30rem)', transform: 'translateY(0.035em)' }}>
                ABOUT
              </h2>
            </div>
          </div>
        </section>

        {/* ABOUT Content Section */}
        <section className="bg-white py-12 sm:py-16 md:py-20 lg:py-24">
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
                        className="text-black font-medium text-sm sm:text-base hover:opacity-70"
                      >
                        Style Driven
                      </a>
                      <span className="text-black font-medium text-sm sm:text-base">- production house</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <a 
                        href="https://voding.dev" 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-black font-medium text-sm sm:text-base hover:opacity-70"
                      >
                        Voding
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
          <div className="bg-accent w-full px-0 overflow-hidden flex items-center justify-center" style={{ paddingTop: 'clamp(0.25rem, 0.5vw, 0.5rem)', paddingBottom: 'clamp(0.25rem, 0.5vw, 0.5rem)' }}>
            <div className="w-full text-center flex items-center justify-center">
              <h2 className="w-full font-black uppercase text-white" style={{ letterSpacing: '-0.02em', width: '100%', display: 'block', fontWeight: '900', lineHeight: '0.85', margin: '0', fontSize: 'clamp(5.5rem, 18vw, 30rem)', transform: 'translateY(0.035em)' }}>
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
                <div className="relative">
                  {homepage?.formHeading && (
                    <h3 className="mb-6 text-xl font-black uppercase tracking-wide text-black" style={{ fontWeight: '900' }}>
                      {homepage.formHeading}
                    </h3>
                  )}
                  <form onSubmit={handleContactFormSubmit} className="space-y-4">
                    {/* Honeypot field - hidden from users, catches bots */}
                    <input
                      type="text"
                      name="website"
                      value={formData.honeypot}
                      onChange={(e) => setFormData({ ...formData, honeypot: e.target.value })}
                      className="absolute -left-[9999px]"
                      tabIndex={-1}
                      autoComplete="off"
                      aria-hidden="true"
                    />
                    
                    <div className="group">
                      <NameInput
                        value={formData.name}
                        onChange={(value) => setFormData({ ...formData, name: value })}
                        required
                        disabled={isSubmitting}
                      />
                    </div>
                    <div className="group">
                      <EmailInput
                        value={formData.email}
                        onChange={(value) => setFormData({ ...formData, email: value })}
                        required
                        disabled={isSubmitting}
                      />
                    </div>
                    <div className="group">
                      <PhoneInput
                        value={formData.phone}
                        onChange={(value) => setFormData({ ...formData, phone: value })}
                        required
                        disabled={isSubmitting}
                      />
                    </div>
                    <div className="group relative">
                      <textarea
                        placeholder="Message"
                        rows={6}
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        required
                        disabled={isSubmitting}
                        className="w-full bg-black/3 hover:bg-black/5 focus:bg-white border-2 border-transparent focus:border-black px-4 py-3 text-sm text-black placeholder:text-black/40 transition-all duration-200 disabled:opacity-50 outline-none resize-y min-h-[150px] max-h-[400px]"
                        style={{ fontWeight: '500' }}
                      />
                      {/* Resize indicator */}
                      <div className="absolute bottom-2 right-2 pointer-events-none">
                        <svg className="w-4 h-4 text-black/20" fill="currentColor" viewBox="0 0 16 16">
                          <path d="M14 14V9h-1v4H9v1h5z"/>
                          <path d="M9 9V4H8v4H4v1h5z"/>
                        </svg>
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="mt-6 w-full px-8 py-4 text-sm font-black uppercase tracking-wider text-white transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-lg hover:shadow-xl"
                      style={{ backgroundColor: '#586034', fontWeight: '900' }}
                    >
                      {isSubmitting ? "SENDING..." : "SEND MESSAGE"}
                    </button>
                  </form>

                  {/* Thank You Modal */}
                  {showThankYou && (
                    <div 
                      className="fixed inset-0 z-50 flex items-center justify-center p-4"
                      style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
                      onClick={() => setShowThankYou(false)}
                    >
                      <div 
                        className="relative bg-white rounded-none shadow-2xl max-w-md w-full p-8 transform animate-in zoom-in-95 duration-300"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* Close button */}
                        <button
                          onClick={() => setShowThankYou(false)}
                          className="absolute top-4 right-4 text-black/40 hover:text-black transition-colors"
                          aria-label="Close"
                        >
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>

                        {/* Content */}
                        <div className="text-center space-y-4">
                          <div className="inline-block p-4 bg-black rounded-full">
                            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                          
                          <h2 className="text-3xl font-black uppercase text-black" style={{ fontWeight: '900', letterSpacing: '-0.02em' }}>
                            NICE!
                          </h2>
                          
                          <div className="space-y-2">
                            <p className="text-base font-bold text-black/80">
                              Message received.
                            </p>
                            <p className="text-sm text-black/60">
                              I'll get back to you. ⚡
                            </p>
                          </div>

                          <div className="pt-2">
                            <div className="inline-block px-6 py-2 bg-black/5 rounded-full">
                              <p className="text-xs font-bold uppercase tracking-wider text-black/50">
                                Talk soon
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-background py-12">
          <div className="mx-auto max-w-7xl px-6">
            <div className="flex flex-col items-center justify-center gap-6">
              <div className="flex items-center">
                <Image
                  src="/smallbrandmark-alexgrosse-white.svg"
                  alt="Alex Grosse"
                  width={32}
                  height={32}
                  className="h-8 w-8 object-contain"
                />
              </div>
              <Link
                href="/create-pdf"
                className="px-6 py-3 text-sm font-black uppercase tracking-wider text-white transition-all hover:scale-105 hover:shadow-lg rounded-sm"
                style={{ fontWeight: '900', backgroundColor: '#586034' }}
              >
                Create PDF
              </Link>
              <p className="text-sm text-white/60">
                © {new Date().getFullYear()} ALEX GROSSE. ALL RIGHTS RESERVED.
              </p>
            </div>
          </div>
        </footer>
      </main>
    </>
  );
}
